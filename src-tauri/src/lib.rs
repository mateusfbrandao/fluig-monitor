mod commands;
mod db;
mod models;

use commands::*;
use db::Database;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

fn resolve_database_path<R: tauri::Runtime>(app: &tauri::App<R>) -> PathBuf {
    // 1. Variável de ambiente explícita
    if let Ok(env_path) = std::env::var("FLUIG_MONITOR_DB_PATH") {
        return PathBuf::from(env_path);
    }

    // 2. Caminhos locais de desenvolvimento (na pasta ./data)
    let dev_candidates = [
        PathBuf::from("./data/fluig-monitor.db"),
        PathBuf::from("../../data/fluig-monitor.db"),
        PathBuf::from("../data/fluig-monitor.db"),
    ];

    for candidate in &dev_candidates {
        if candidate.exists() {
            if let Ok(canonical) = candidate.canonicalize() {
                return canonical;
            }
            return candidate.clone();
        }
    }

    // 3. Diretório de dados oficial da aplicação no sistema do usuário (~/.local/share/fluig-monitor)
    if let Ok(app_dir) = app.path().app_data_dir() {
        let _ = std::fs::create_dir_all(&app_dir);
        let user_db = app_dir.join("fluig-monitor.db");
        return user_db;
    }

    // 4. Fallback no diretório de dados
    PathBuf::from("./data/fluig-monitor.db")
}

fn get_tray_settings<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> (bool, bool) {
    if let Some(db) = app.try_state::<Arc<Database>>() {
        if let Ok(conn) = db.conn.lock() {
            let enable_minimize = conn
                .query_row(
                    r#"SELECT value FROM "AppSetting" WHERE settingId = 'ENABLE_MINIMIZE_FEATURE'"#,
                    [],
                    |row| row.get::<_, String>(0),
                )
                .map(|v| v == "true")
                .unwrap_or(true);

            let disable_notification = conn
                .query_row(
                    r#"SELECT value FROM "AppSetting" WHERE settingId = 'DISABLE_MINIMIZE_NOTIFICATION'"#,
                    [],
                    |row| row.get::<_, String>(0),
                )
                .map(|v| v == "true")
                .unwrap_or(false);

            return (enable_minimize, disable_notification);
        }
    }
    (true, false)
}

fn show_tray_notification<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let _ = app
        .notification()
        .builder()
        .title("Fluig Monitor")
        .body("O Fluig Monitor continua em execução em segundo plano na bandeja do sistema.")
        .show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.handle().plugin(tauri_plugin_notification::init())?;

            let db_path = resolve_database_path(app);
            log::info!("Connecting to SQLite database at {:?}", db_path);

            let database = Database::new(db_path).expect("Failed to initialize SQLite database");
            app.manage(Arc::new(database));

            let show_item = MenuItem::with_id(app, "show", "Abrir Fluig Monitor", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Minimizar para a Bandeja", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .tooltip("Fluig Monitor")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let is_visible = window.is_visible().unwrap_or(false);
                                if is_visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.unminimize();
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            // Inicia o Background Scheduler de monitoramento em tempo real (Pings automáticos periódicos)
            let bg_app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));
                loop {
                    interval.tick().await;

                    let envs: Vec<(i64, String, Option<String>)> = if let Some(db) = bg_app.try_state::<Arc<Database>>() {
                        if let Ok(conn) = db.conn.lock() {
                            let mut stmt = match conn.prepare(
                                r#"
                                SELECT e.id, e.baseUrl, u.pingFrequency
                                FROM "Environment" e
                                LEFT JOIN "UpdateSchedule" u ON u.environmentId = e.id
                                "#
                            ) {
                                Ok(s) => s,
                                Err(_) => continue,
                            };
                            let rows = stmt.query_map([], |row| {
                                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                            }).ok();
                            rows.map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default()
                        } else {
                            Vec::new()
                        }
                    } else {
                        Vec::new()
                    };

                    if envs.is_empty() {
                        continue;
                    }

                    let client = match reqwest::Client::builder()
                        .timeout(std::time::Duration::from_secs(10))
                        .danger_accept_invalid_certs(true)
                        .build()
                    {
                        Ok(c) => c,
                        Err(_) => continue,
                    };

                    for (id, base_url, _freq) in envs {
                        let ping_url = format!("{}/api/servlet/ping", base_url.trim_end_matches('/'));
                        let start = std::time::Instant::now();
                        let resp = client.get(&ping_url).send().await;

                        let (status_code, status_message, duration) = match resp {
                            Ok(r) => {
                                let dur = start.elapsed().as_millis() as i32;
                                let code = r.status().as_u16() as i32;
                                let reason = r.status().canonical_reason().map(|s| s.to_string());
                                (code, reason, dur)
                            }
                            Err(_) => {
                                let start_fb = std::time::Instant::now();
                                match client.get(&base_url).send().await {
                                    Ok(r) => {
                                        let dur = start_fb.elapsed().as_millis() as i32;
                                        let code = r.status().as_u16() as i32;
                                        let reason = r.status().canonical_reason().map(|s| s.to_string());
                                        (code, reason, dur)
                                    }
                                    Err(err) => (0, Some(err.to_string()), 0),
                                }
                            }
                        };

                        let now_dt = chrono::Utc::now();
                        let now_ms = now_dt.timestamp_millis();
                        let now_iso = now_dt.to_rfc3339();
                        let is_online = status_code >= 200 && status_code < 400 && duration > 0;

                        if let Some(db) = bg_app.try_state::<Arc<Database>>() {
                            if let Ok(conn) = db.conn.lock() {
                                let _ = conn.execute(
                                    r#"
                                    INSERT INTO "HTTPResponse" (environmentId, statusCode, statusMessage, responseTimeMs, timestamp, resourceType)
                                    VALUES (?1, ?2, ?3, ?4, ?5, 'PING')
                                    "#,
                                    rusqlite::params![id, status_code, status_message, duration, now_ms],
                                );
                            }
                        }

                        let payload = serde_json::json!({
                            "environmentId": id,
                            "serverIsOnline": is_online,
                            "statusCode": status_code,
                            "statusMessage": status_message,
                            "responseTimeMs": duration,
                            "timestamp": now_iso,
                        });

                        let _ = bg_app.emit(&format!("serverPinged_{}", id), payload.clone());
                        let _ = bg_app.emit("serverPinged", payload);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let app = window.app_handle();
                let (enable_minimize, disable_notification) = get_tray_settings(app);

                if enable_minimize {
                    api.prevent_close();
                    let _ = window.hide();

                    if !disable_notification {
                        show_tray_notification(app);
                    }
                }
            }
            tauri::WindowEvent::Focused(false) | tauri::WindowEvent::Resized(_) => {
                if let Ok(true) = window.is_minimized() {
                    let app = window.app_handle();
                    let (enable_minimize, disable_notification) = get_tray_settings(app);

                    if enable_minimize {
                        let _ = window.hide();

                        if !disable_notification {
                            show_tray_notification(app);
                        }
                    }
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_all_environments,
            toggle_favorite_environment,
            delete_environment,
            create_environment,
            update_environment,
            get_app_settings,
            update_app_setting,
            ping_url,
            get_http_responses_by_id,
            get_last_http_response,
            get_disk_info,
            get_memory_info,
            get_database_properties,
            get_database_statistics_history,
            get_last_database_statistic,
            get_last_environment_license_data,
            get_environment_server_data,
            get_environment_services,
            get_detailed_memory_by_id,
            get_runtime_stats_by_id,
            get_artifacts_by_id,
            get_services_history_by_id,
            get_environment_history_by_id,
            get_database_stats,
            force_environment_ping,
            save_telemetry_snapshot,
            get_system_runtime_info,
            toggle_fullscreen,
            fetch_url_with_headers,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
