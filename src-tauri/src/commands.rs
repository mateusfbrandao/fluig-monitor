use crate::db::Database;
use crate::models::{AppSettingItem, CreateEnvironmentInput, UpdateEnvironmentInput, Environment, EnvironmentAuthKeys, HttpResponse, UpdateSchedule};
use rusqlite::params;
use rusqlite::types::Value as SqlValue;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;
use tauri::Emitter;

pub type DbState = Arc<Database>;

fn to_opt_string(val: SqlValue) -> Option<String> {
    match val {
        SqlValue::Null => None,
        SqlValue::Integer(i) => Some(i.to_string()),
        SqlValue::Real(r) => Some(r.to_string()),
        SqlValue::Text(t) => Some(t),
        SqlValue::Blob(b) => String::from_utf8(b).ok(),
    }
}

fn to_bool(val: SqlValue) -> bool {
    match val {
        SqlValue::Integer(i) => i != 0,
        SqlValue::Text(t) => t == "1" || t.eq_ignore_ascii_case("true"),
        _ => false,
    }
}

fn to_opt_iso_timestamp(val: SqlValue) -> Option<String> {
    let s = to_iso_timestamp(val);
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

fn to_iso_timestamp(val: SqlValue) -> String {
    match val {
        SqlValue::Null => String::new(),
        SqlValue::Integer(i) => {
            if i > 10_000_000_000 {
                chrono::DateTime::from_timestamp_millis(i)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| i.to_string())
            } else if i > 0 {
                chrono::DateTime::from_timestamp(i, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| i.to_string())
            } else {
                String::new()
            }
        }
        SqlValue::Text(t) => {
            if let Ok(i) = t.parse::<i64>() {
                if i > 10_000_000_000 {
                    return chrono::DateTime::from_timestamp_millis(i)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_else(|| t);
                } else if i > 0 {
                    return chrono::DateTime::from_timestamp(i, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_else(|| t);
                }
            }
            t
        }
        SqlValue::Real(r) => {
            let i = r as i64;
            if i > 10_000_000_000 {
                chrono::DateTime::from_timestamp_millis(i)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| r.to_string())
            } else {
                r.to_string()
            }
        }
        SqlValue::Blob(b) => String::from_utf8(b).unwrap_or_default(),
    }
}

#[tauri::command]
pub fn get_all_environments(db: State<'_, DbState>) -> Result<Vec<Environment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT e.id, e.name, e.release, e.baseUrl, e.kind,
                   e.logCreatedAt, e.logUpdateAt, e.logDeleted, e.logDeletedAt,
                   e.isFavorite, e.favoritedAt,
                   u.id, u.scrapeFrequency, u.pingFrequency,
                   a.id, a.payload, a.hash
            FROM "Environment" e
            LEFT JOIN "UpdateSchedule" u ON u.environmentId = e.id
            LEFT JOIN "EnvironmentAuthKeys" a ON a.environmentId = e.id
            WHERE e.logDeleted = 0 OR e.logDeleted = '0' OR e.logDeleted = 'false'
            ORDER BY e.isFavorite DESC, e.name ASC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let env_iter = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let release: String = row.get(2)?;
            let base_url: String = row.get(3)?;
            let kind: String = row.get(4)?;

            let log_created_at = to_opt_iso_timestamp(row.get(5)?);
            let log_update_at = to_opt_iso_timestamp(row.get(6)?);
            let log_deleted = to_bool(row.get(7)?);
            let log_deleted_at = to_opt_iso_timestamp(row.get(8)?);
            let is_favorite = to_bool(row.get(9)?);
            let favorited_at = to_opt_iso_timestamp(row.get(10)?);

            let u_id: Option<i64> = row.get(11)?;
            let update_schedule = if let Some(uid) = u_id {
                Some(UpdateSchedule {
                    id: uid,
                    scrape_frequency: to_opt_string(row.get(12)?).unwrap_or_else(|| "15m".to_string()),
                    ping_frequency: to_opt_string(row.get(13)?).unwrap_or_else(|| "15s".to_string()),
                    environment_id: id,
                })
            } else {
                None
            };

            let a_id: Option<i64> = row.get(14)?;
            let auth_keys = if let Some(aid) = a_id {
                Some(EnvironmentAuthKeys {
                    id: aid,
                    payload: to_opt_string(row.get(15)?).unwrap_or_default(),
                    hash: to_opt_string(row.get(16)?).unwrap_or_default(),
                    environment_id: id,
                })
            } else {
                None
            };

            Ok(Environment {
                id,
                name,
                release,
                base_url,
                kind,
                log_created_at,
                log_update_at,
                log_deleted,
                log_deleted_at,
                is_favorite,
                favorited_at,
                update_schedule_id: update_schedule,
                o_auth_keys_id: auth_keys,
                http_responses: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut raw_envs = Vec::new();
    for env in env_iter {
        raw_envs.push(env.map_err(|e| e.to_string())?);
    }

    let mut envs = Vec::new();
    for mut e in raw_envs {
        let mut http_stmt = conn
            .prepare(
                r#"
                SELECT id, environmentId, timestamp, endpoint, resourceType, statusCode, statusMessage, responseTimeMs
                FROM "HTTPResponse"
                WHERE environmentId = ?1
                ORDER BY timestamp DESC
                LIMIT 30
                "#,
            )
            .map_err(|err| err.to_string())?;

        let http_iter = http_stmt
            .query_map(params![e.id], |row| {
                Ok(HttpResponse {
                    id: row.get(0)?,
                    environment_id: row.get(1)?,
                    timestamp: to_iso_timestamp(row.get(2)?),
                    endpoint: to_opt_string(row.get(3)?),
                    resource_type: to_opt_string(row.get(4)?),
                    status_code: row.get::<_, Option<i32>>(5)?.unwrap_or(0),
                    status_message: to_opt_string(row.get(6)?),
                    response_time_ms: row.get::<_, Option<i32>>(7)?.unwrap_or(0),
                })
            })
            .map_err(|err| err.to_string())?;

        let mut responses = Vec::new();
        for r in http_iter {
            if let Ok(item) = r {
                responses.push(item);
            }
        }

        e.http_responses = responses;
        envs.push(e);
    }

    Ok(envs)
}

#[tauri::command]
pub fn toggle_favorite_environment(id: i64, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let is_fav_val: SqlValue = conn
        .query_row(
            r#"SELECT isFavorite FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let is_fav = to_bool(is_fav_val);
    let new_fav = !is_fav;
    conn.execute(
        r#"UPDATE "Environment" SET isFavorite = ?1, favoritedAt = CASE WHEN ?1 = 1 THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?2"#,
        params![if new_fav { 1 } else { 0 }, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(new_fav)
}

#[tauri::command]
pub fn delete_environment(id: i64, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        r#"UPDATE "Environment" SET logDeleted = 1, logDeletedAt = CURRENT_TIMESTAMP WHERE id = ?1"#,
        params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn create_environment(input: CreateEnvironmentInput, db: State<'_, DbState>) -> Result<i64, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        r#"INSERT INTO "Environment" (name, release, baseUrl, kind) VALUES (?1, ?2, ?3, ?4)"#,
        params![input.name, input.release, input.base_url, input.kind],
    )
    .map_err(|e| e.to_string())?;

    let env_id = tx.last_insert_rowid();

    tx.execute(
        r#"INSERT INTO "UpdateSchedule" (environmentId, pingFrequency, scrapeFrequency) VALUES (?1, ?2, ?3)"#,
        params![env_id, input.ping_frequency, input.scrape_frequency],
    )
    .map_err(|e| e.to_string())?;

    if let (Some(payload), Some(hash)) = (input.auth_payload, input.auth_hash) {
        tx.execute(
            r#"INSERT INTO "EnvironmentAuthKeys" (environmentId, payload, hash) VALUES (?1, ?2, ?3)"#,
            params![env_id, payload, hash],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(env_id)
}

#[tauri::command]
pub fn update_environment(input: UpdateEnvironmentInput, db: State<'_, DbState>) -> Result<bool, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        r#"UPDATE "Environment" SET name = ?1, release = ?2, baseUrl = ?3, kind = ?4, logUpdateAt = CURRENT_TIMESTAMP WHERE id = ?5"#,
        params![input.name, input.release, input.base_url, input.kind, input.id],
    )
    .map_err(|e| e.to_string())?;

    if let (Some(pf), Some(sf)) = (input.ping_frequency, input.scrape_frequency) {
        tx.execute(
            r#"
            INSERT INTO "UpdateSchedule" (environmentId, pingFrequency, scrapeFrequency)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(environmentId) DO UPDATE SET pingFrequency = ?2, scrapeFrequency = ?3
            "#,
            params![input.id, pf, sf],
        )
        .map_err(|e| e.to_string())?;
    }

    if let (Some(payload), Some(hash)) = (input.auth_payload, input.auth_hash) {
        tx.execute(
            r#"
            INSERT INTO "EnvironmentAuthKeys" (environmentId, payload, hash)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(environmentId) DO UPDATE SET payload = ?2, hash = ?3
            "#,
            params![input.id, payload, hash],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_app_settings(db: State<'_, DbState>) -> Result<Vec<AppSettingItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(r#"SELECT settingId, value, "group" FROM "AppSetting""#)
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(AppSettingItem {
                setting_id: row.get(0)?,
                value: to_opt_string(row.get(1)?).unwrap_or_default(),
                group: to_opt_string(row.get(2)?),
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn update_app_setting(setting_id: String, value: String, group: Option<String>, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        INSERT INTO "AppSetting" (settingId, value, "group")
        VALUES (?1, ?2, ?3)
        ON CONFLICT(settingId) DO UPDATE SET value = excluded.value, "group" = excluded."group"
        "#,
        params![setting_id, value, group],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn ping_url(url: String) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let start = std::time::Instant::now();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let duration = start.elapsed().as_millis();

    Ok(serde_json::json!({
        "statusCode": resp.status().as_u16(),
        "responseTimeMs": duration,
        "isOk": resp.status().is_success()
    }))
}

#[tauri::command]
pub fn get_http_responses_by_id(id: i64, db: State<'_, DbState>) -> Result<Vec<HttpResponse>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, environmentId, timestamp, endpoint, resourceType, statusCode, statusMessage, responseTimeMs
            FROM "HTTPResponse"
            WHERE environmentId = ?1
            ORDER BY timestamp DESC
            LIMIT 1500
            "#,
        )
        .map_err(|e| e.to_string())?;

    let pings = stmt
        .query_map(params![id], |row| {
            Ok(HttpResponse {
                id: row.get(0)?,
                environment_id: row.get(1)?,
                timestamp: to_iso_timestamp(row.get(2)?),
                endpoint: to_opt_string(row.get(3)?),
                resource_type: to_opt_string(row.get(4)?),
                status_code: row.get::<_, Option<i32>>(5)?.unwrap_or(0),
                status_message: to_opt_string(row.get(6)?),
                response_time_ms: row.get::<_, Option<i32>>(7)?.unwrap_or(0),
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(pings)
}

#[tauri::command]
pub fn get_last_http_response(id: i64, db: State<'_, DbState>) -> Result<Option<HttpResponse>, String> {
    let pings = get_http_responses_by_id(id, db)?;
    Ok(pings.into_iter().next())
}

#[tauri::command]
pub fn get_disk_info(id: i64, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.systemServerHDSize, s.systemServerHDFree,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp, h.environmentId
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![id], |row| {
            let hd_size: Option<String> = to_opt_string(row.get(0)?);
            let hd_free: Option<String> = to_opt_string(row.get(1)?);
            let hid: i64 = row.get(2)?;
            let status_code: i32 = row.get::<_, Option<i32>>(3)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(5)?);
            let env_id: i64 = row.get(6)?;

            Ok(serde_json::json!({
                "systemServerHDSize": hd_size,
                "systemServerHDFree": hd_free,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": env_id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn get_memory_info(id: i64, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.systemServerMemorySize, s.systemServerMemoryFree,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp, h.environmentId
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![id], |row| {
            let mem_size: Option<i64> = row.get(0)?;
            let mem_free: Option<i64> = row.get(1)?;
            let hid: i64 = row.get(2)?;
            let status_code: i32 = row.get::<_, Option<i32>>(3)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(5)?);
            let env_id: i64 = row.get(6)?;

            Ok(serde_json::json!({
                "systemServerMemorySize": mem_size,
                "systemServerMemoryFree": mem_free,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": env_id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn get_database_properties(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.dbName, s.dbVersion, s.dbDriverName, s.dbDriverVersion,
                   s.dataSourceFluigDs, s.dataSourceFluigDsRo,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp, h.environmentId
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(params![id], |row| {
            let db_name: Option<String> = to_opt_string(row.get(0)?);
            let db_version: Option<String> = to_opt_string(row.get(1)?);
            let db_driver_name: Option<String> = to_opt_string(row.get(2)?);
            let db_driver_version: Option<String> = to_opt_string(row.get(3)?);
            let ds_fluig_ds: Option<String> = to_opt_string(row.get(4)?);
            let ds_fluig_ds_ro: Option<String> = to_opt_string(row.get(5)?);
            let hid: i64 = row.get(6)?;
            let status_code: i32 = row.get::<_, Option<i32>>(7)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(8)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(9)?);
            let env_id: i64 = row.get(10)?;

            Ok(serde_json::json!({
                "dbName": db_name,
                "dbVersion": db_version,
                "dbDriverName": db_driver_name,
                "dbDriverVersion": db_driver_version,
                "dataSourceFluigDs": ds_fluig_ds,
                "dataSourceFluigDsRo": ds_fluig_ds_ro,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": env_id,
                }
            }))
        })
        .map_err(|e| e.to_string())?;

    if let Some(r) = rows.next() {
        Ok(r.ok())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn get_database_statistics_history(id: i64, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.dbTraficRecieved, s.dbTraficSent, s.dbSize,
                   s.dataSourceFluigDs, s.dataSourceFluigDsRo,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp, h.environmentId
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 100
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![id], |row| {
            let received: Option<i64> = row.get(0)?;
            let sent: Option<i64> = row.get(1)?;
            let size: Option<i64> = row.get(2)?;
            let ds_fluig_ds: Option<String> = to_opt_string(row.get(3)?);
            let ds_fluig_ds_ro: Option<String> = to_opt_string(row.get(4)?);
            let hid: i64 = row.get(5)?;
            let status_code: i32 = row.get::<_, Option<i32>>(6)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(7)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(8)?);
            let env_id: i64 = row.get(9)?;

            Ok(serde_json::json!({
                "dbTraficRecieved": received,
                "dbTraficSent": sent,
                "dbSize": size,
                "dataSourceFluigDs": ds_fluig_ds,
                "dataSourceFluigDsRo": ds_fluig_ds_ro,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": env_id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn get_last_database_statistic(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let stats = get_database_statistics_history(id, db)?;
    Ok(stats.into_iter().next())
}

#[tauri::command]
pub fn get_last_environment_license_data(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT l.id, l.activeUsers, l.remainingLicenses, l.totalLicenses, l.tenantId,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp, h.environmentId
            FROM "LicenseHistory" l
            JOIN "HTTPResponse" h ON h.id = l.httpResponseId
            WHERE l.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(params![id], |row| {
            let lid: i64 = row.get(0)?;
            let active: i64 = row.get::<_, Option<i64>>(1)?.unwrap_or(0);
            let remaining: i64 = row.get::<_, Option<i64>>(2)?.unwrap_or(0);
            let total: i64 = row.get::<_, Option<i64>>(3)?.unwrap_or(0);
            let tenant: i64 = row.get::<_, Option<i64>>(4)?.unwrap_or(0);
            let hid: i64 = row.get(5)?;
            let status_code: i32 = row.get::<_, Option<i32>>(6)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(7)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(8)?);
            let env_id: i64 = row.get(9)?;

            Ok(serde_json::json!({
                "id": lid,
                "activeUsers": active,
                "remainingLicenses": remaining,
                "totalLicenses": total,
                "tenantId": tenant,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": env_id,
                }
            }))
        })
        .map_err(|e| e.to_string())?;

    if let Some(r) = rows.next() {
        Ok(r.ok())
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn get_environment_server_data(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.id, s.systemUptime, s.systemServerHDSize, s.systemServerHDFree,
                   s.systemServerMemorySize, s.systemServerMemoryFree, s.systemServerCoreCount,
                   s.systemServerArch, s.dbName, s.dbVersion,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let stats: Vec<Value> = stmt
        .query_map(params![id], |row| {
            let sid: i64 = row.get(0)?;
            let uptime: Option<i64> = row.get(1)?;
            let hd_size: Option<String> = to_opt_string(row.get(2)?);
            let hd_free: Option<String> = to_opt_string(row.get(3)?);
            let mem_size: Option<i64> = row.get(4)?;
            let mem_free: Option<i64> = row.get(5)?;
            let core_count: Option<i32> = row.get(6)?;
            let arch: Option<String> = to_opt_string(row.get(7)?);
            let db_name: Option<String> = to_opt_string(row.get(8)?);
            let db_version: Option<String> = to_opt_string(row.get(9)?);
            let hid: i64 = row.get(10)?;
            let status_code: i32 = row.get::<_, Option<i32>>(11)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(12)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(13)?);

            Ok(serde_json::json!({
                "id": sid,
                "systemUptime": uptime,
                "systemServerHDSize": hd_size,
                "systemServerHDFree": hd_free,
                "systemServerMemorySize": mem_size,
                "systemServerMemoryFree": mem_free,
                "systemServerCoreCount": core_count,
                "systemServerArch": arch,
                "dbName": db_name,
                "dbVersion": db_version,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "statisticHistory": stats
    })))
}

#[tauri::command]
pub fn get_environment_services(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt = conn
        .prepare(
            r#"
            SELECT m.id, m.analytics, m.licenseServer, m.mailServer, m.solrServer,
                   m.viewer, m.openOffice, m.realTime, m.MSOffice, m.rawDetails,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "MonitorHistory" m
            JOIN "HTTPResponse" h ON h.id = m.httpResponseId
            WHERE m.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 10
            "#,
        )
        .map_err(|e| e.to_string())?;

    let monitor_history: Vec<Value> = stmt
        .query_map(params![id], |row| {
            let mid: i64 = row.get(0)?;
            let analytics: Option<String> = to_opt_string(row.get(1)?);
            let license_server: Option<String> = to_opt_string(row.get(2)?);
            let mail_server: Option<String> = to_opt_string(row.get(3)?);
            let solr_server: Option<String> = to_opt_string(row.get(4)?);
            let viewer: Option<String> = to_opt_string(row.get(5)?);
            let open_office: Option<String> = to_opt_string(row.get(6)?);
            let real_time: Option<String> = to_opt_string(row.get(7)?);
            let ms_office: Option<String> = to_opt_string(row.get(8)?);
            let raw_details: Option<String> = to_opt_string(row.get(9)?);
            let hid: i64 = row.get(10)?;
            let status_code: i32 = row.get::<_, Option<i32>>(11)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(12)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(13)?);

            Ok(serde_json::json!({
                "id": mid,
                "analytics": analytics,
                "licenseServer": license_server,
                "mailServer": mail_server,
                "solrServer": solr_server,
                "viewer": viewer,
                "openOffice": open_office,
                "realTime": real_time,
                "MSOffice": ms_office,
                "rawDetails": raw_details,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "monitorHistory": monitor_history
    })))
}

#[tauri::command]
pub fn get_detailed_memory_by_id(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.systemServerMemorySize, s.systemServerMemoryFree, s.memoryHeap,
                   s.nonMemoryHeap, s.detailedMemory, s.systemHeapMaxSize, s.systemHeapSize,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 300
            "#,
        )
        .map_err(|e| e.to_string())?;

    let stats: Vec<Value> = stmt
        .query_map(params![id], |row| {
            let mem_size: Option<i64> = row.get(0)?;
            let mem_free: Option<i64> = row.get(1)?;
            let heap: Option<i64> = row.get(2)?;
            let non_heap: Option<i64> = row.get(3)?;
            let detailed: Option<String> = to_opt_string(row.get(4)?);
            let heap_max: Option<i64> = row.get(5)?;
            let heap_size: Option<i64> = row.get(6)?;
            let hid: i64 = row.get(7)?;
            let status_code: i32 = row.get::<_, Option<i32>>(8)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(9)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(10)?);

            Ok(serde_json::json!({
                "systemServerMemorySize": mem_size,
                "systemServerMemoryFree": mem_free,
                "memoryHeap": heap,
                "nonMemoryHeap": non_heap,
                "detailedMemory": detailed,
                "systemHeapMaxSize": heap_max,
                "systemHeapSize": heap_size,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "statisticHistory": stats
    })))
}

#[tauri::command]
pub fn get_runtime_stats_by_id(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.connectedUsers, s.runtimeStart, s.runtimeUptime, s.systemUptime,
                   s.threadingCount, s.threadingPeakCount, s.threadingDaemonCount,
                   s.threadingTotalStarted, s.systemServerCoreCount, s.systemServerArch,
                   s.systemTmpFolderSize, s.systemLogFolderSize, s.externalConverter,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 300
            "#,
        )
        .map_err(|e| e.to_string())?;

    let stats: Vec<Value> = stmt
        .query_map(params![id], |row| {
            let users: Option<i64> = row.get(0)?;
            let runtime_start: Option<String> = to_opt_string(row.get(1)?);
            let runtime_uptime: Option<i64> = row.get(2)?;
            let system_uptime: Option<i64> = row.get(3)?;
            let threading_count: Option<i64> = row.get(4)?;
            let threading_peak: Option<i64> = row.get(5)?;
            let threading_daemon: Option<i64> = row.get(6)?;
            let threading_total: Option<i64> = row.get(7)?;
            let cores: Option<i32> = row.get(8)?;
            let arch: Option<String> = to_opt_string(row.get(9)?);
            let tmp_size: Option<i64> = row.get(10)?;
            let log_size: Option<i64> = row.get(11)?;
            let external_conv: Option<bool> = row.get(12)?;
            let hid: i64 = row.get(13)?;
            let status_code: i32 = row.get::<_, Option<i32>>(14)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(15)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(16)?);

            Ok(serde_json::json!({
                "connectedUsers": users,
                "runtimeStart": runtime_start,
                "runtimeUptime": runtime_uptime,
                "systemUptime": system_uptime,
                "threadingCount": threading_count,
                "threadingPeakCount": threading_peak,
                "threadingDaemonCount": threading_daemon,
                "threadingTotalStarted": threading_total,
                "systemServerCoreCount": cores,
                "systemServerArch": arch,
                "systemTmpFolderSize": tmp_size,
                "systemLogFolderSize": log_size,
                "externalConverter": external_conv,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "statisticHistory": stats
    })))
}

#[tauri::command]
pub fn get_artifacts_by_id(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.artifactsApps, s.artifactsCore, s.artifactsSystem,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 1
            "#,
        )
        .map_err(|e| e.to_string())?;

    let stats: Vec<Value> = stmt
        .query_map(params![id], |row| {
            let apps: Option<String> = to_opt_string(row.get(0)?);
            let core: Option<String> = to_opt_string(row.get(1)?);
            let system: Option<String> = to_opt_string(row.get(2)?);
            let hid: i64 = row.get(3)?;
            let status_code: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(5)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(6)?);

            Ok(serde_json::json!({
                "artifactsApps": apps,
                "artifactsCore": core,
                "artifactsSystem": system,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "statisticHistory": stats
    })))
}

#[tauri::command]
pub fn get_services_history_by_id(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    let mut stmt_m = conn
        .prepare(
            r#"
            SELECT m.id, m.analytics, m.licenseServer, m.mailServer, m.solrServer,
                   m.viewer, m.openOffice, m.realTime, m.MSOffice, m.rawDetails,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "MonitorHistory" m
            JOIN "HTTPResponse" h ON h.id = m.httpResponseId
            WHERE m.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 50
            "#,
        )
        .map_err(|e| e.to_string())?;

    let monitor_history: Vec<Value> = stmt_m
        .query_map(params![id], |row| {
            let mid: i64 = row.get(0)?;
            let analytics: Option<String> = to_opt_string(row.get(1)?);
            let license_server: Option<String> = to_opt_string(row.get(2)?);
            let mail_server: Option<String> = to_opt_string(row.get(3)?);
            let solr_server: Option<String> = to_opt_string(row.get(4)?);
            let viewer: Option<String> = to_opt_string(row.get(5)?);
            let open_office: Option<String> = to_opt_string(row.get(6)?);
            let real_time: Option<String> = to_opt_string(row.get(7)?);
            let ms_office: Option<String> = to_opt_string(row.get(8)?);
            let raw_details: Option<String> = to_opt_string(row.get(9)?);
            let hid: i64 = row.get(10)?;
            let status_code: i32 = row.get::<_, Option<i32>>(11)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(12)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(13)?);

            Ok(serde_json::json!({
                "id": mid,
                "analytics": analytics,
                "licenseServer": license_server,
                "mailServer": mail_server,
                "solrServer": solr_server,
                "viewer": viewer,
                "openOffice": open_office,
                "realTime": real_time,
                "MSOffice": ms_office,
                "rawDetails": raw_details,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt_s = conn
        .prepare(
            r#"
            SELECT s.dataSourceFluigDs, s.dataSourceFluigDsRo, s.externalConverter,
                   h.id, h.statusCode, h.responseTimeMs, h.timestamp
            FROM "StatisticsHistory" s
            JOIN "HTTPResponse" h ON h.id = s.httpResponseId
            WHERE s.environmentId = ?1
            ORDER BY h.timestamp DESC
            LIMIT 50
            "#,
        )
        .map_err(|e| e.to_string())?;

    let statistic_history: Vec<Value> = stmt_s
        .query_map(params![id], |row| {
            let ds: Option<String> = to_opt_string(row.get(0)?);
            let ds_ro: Option<String> = to_opt_string(row.get(1)?);
            let ext: Option<bool> = Some(to_bool(row.get(2)?));
            let hid: i64 = row.get(3)?;
            let status_code: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
            let response_time_ms: i32 = row.get::<_, Option<i32>>(5)?.unwrap_or(0);
            let timestamp: String = to_iso_timestamp(row.get(6)?);

            Ok(serde_json::json!({
                "dataSourceFluigDs": ds,
                "dataSourceFluigDsRo": ds_ro,
                "externalConverter": ext,
                "httpResponse": {
                    "id": hid,
                    "statusCode": status_code,
                    "responseTimeMs": response_time_ms,
                    "timestamp": timestamp,
                    "environmentId": id,
                }
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "monitorHistory": monitor_history,
        "statisticHistory": statistic_history,
    })))
}

#[tauri::command]
pub fn get_environment_history_by_id(id: i64, db: State<'_, DbState>) -> Result<Option<Value>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let env_row: Option<(String, String, String, String)> = conn
        .query_row(
            r#"SELECT name, release, baseUrl, kind FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .ok();

    let (name, release, base_url, kind) = match env_row {
        Some(e) => e,
        None => return Ok(None),
    };

    drop(conn);

    let stats = get_environment_server_data(id, db.clone())?;
    let stat_history = stats.and_then(|s| s.get("statisticHistory").cloned()).unwrap_or_else(|| serde_json::json!([]));

    let lic = get_last_environment_license_data(id, db.clone())?;
    let lic_history = if let Some(l) = lic { serde_json::json!([l]) } else { serde_json::json!([]) };

    let srv = get_environment_services(id, db.clone())?;
    let mon_history = srv.and_then(|s| s.get("monitorHistory").cloned()).unwrap_or_else(|| serde_json::json!([]));

    let pings = get_http_responses_by_id(id, db)?;

    Ok(Some(serde_json::json!({
        "id": id,
        "name": name,
        "release": release,
        "baseUrl": base_url,
        "kind": kind,
        "statisticHistory": stat_history,
        "licenseHistory": lic_history,
        "monitorHistory": mon_history,
        "httpResponses": pings
    })))
}

#[tauri::command]
pub fn get_database_stats(db: State<'_, DbState>) -> Result<Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total_pings: i64 = conn
        .query_row(r#"SELECT count(*) FROM "HTTPResponse""#, [], |row| row.get(0))
        .unwrap_or(0);
    let total_snapshots: i64 = conn
        .query_row(r#"SELECT count(*) FROM "StatisticsHistory""#, [], |row| row.get(0))
        .unwrap_or(0);

    let size_bytes: i64 = std::fs::metadata(&db.path).map(|m| m.len() as i64).unwrap_or(0);

    Ok(serde_json::json!({
        "totalPings": total_pings,
        "totalSnapshots": total_snapshots,
        "sizeBytes": size_bytes,
        "dbPath": db.path.to_string_lossy(),
    }))
}

#[tauri::command]
pub async fn force_environment_ping(id: i64, db: State<'_, DbState>, app: tauri::AppHandle) -> Result<Value, String> {
    let (base_url, env_name): (String, String) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            r#"SELECT baseUrl, name FROM "Environment" WHERE id = ?1"#,
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

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

    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO "HTTPResponse" (environmentId, statusCode, statusMessage, responseTimeMs, timestamp, resourceType)
            VALUES (?1, ?2, ?3, ?4, ?5, 'PING')
            "#,
            params![id, status_code, status_message, duration, now_ms],
        )
        .map_err(|e| e.to_string())?;
    }

    let is_online = status_code >= 200 && status_code < 400 && duration > 0;
    let payload = serde_json::json!({
        "environmentId": id,
        "serverIsOnline": is_online,
        "statusCode": status_code,
        "statusMessage": status_message,
        "responseTimeMs": duration,
        "timestamp": now_iso,
    });

    let _ = app.emit(&format!("serverPinged_{}", id), payload.clone());
    let _ = app.emit("serverPinged", payload.clone());

    // Se o serviço não responder ou retornar erro crítico, emite notificação nativa do sistema
    if status_code == 0 || status_code >= 400 {
        use tauri_plugin_notification::NotificationExt;
        let err_detail = status_message
            .as_deref()
            .unwrap_or("Conexão recusada ou timeout");
        let _ = app
            .notification()
            .builder()
            .title(format!("Alerta: {} não está respondendo", env_name))
            .body(format!(
                "O ambiente {} está indisponível ou inacessível. Motivo: {}",
                env_name, err_detail
            ))
            .show();
    }

    Ok(payload)
}

#[tauri::command]
pub fn save_telemetry_snapshot(
    environment_id: i64,
    stats_json: Option<String>,
    monitors_json: Option<String>,
    licenses_json: Option<String>,
    app: tauri::AppHandle,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now_dt = chrono::Utc::now();
    let now_ms = now_dt.timestamp_millis();

    // 1. Process statistics report
    if let Some(stats_str) = stats_json {
        if let Ok(v) = serde_json::from_str::<Value>(&stats_str) {
            let _ = conn.execute(
                r#"
                INSERT INTO "HTTPResponse" (environmentId, statusCode, statusMessage, responseTimeMs, timestamp, resourceType)
                VALUES (?1, 200, 'OK', 150, ?2, 'STATISTICS')
                "#,
                params![environment_id, now_ms],
            );
            let http_response_id = conn.last_insert_rowid();

            let ds_fluig = v.get("DATA_SOURCE_FLUIGDS").map(|x| x.to_string());
            let ds_fluig_ro = v.get("DATA_SOURCE_FLUIGDSRO").map(|x| x.to_string());
            let db_info = v.get("DATABASE_INFO");
            let db_name = db_info.and_then(|x| x.get("databaseName")).and_then(|x| x.as_str());
            let db_ver = db_info.and_then(|x| x.get("databaseVersion")).and_then(|x| x.as_str());
            let db_driver = db_info.and_then(|x| x.get("driverName")).and_then(|x| x.as_str());
            let db_driver_ver = db_info.and_then(|x| x.get("driverVersion")).and_then(|x| x.as_str());

            let connected_users = v.get("CONNECTED_USERS").and_then(|x| x.get("connectedUsers")).and_then(|x| x.as_i64());
            let memory = v.get("MEMORY");
            let mem_heap = memory.and_then(|x| x.get("heap-memory-usage")).and_then(|x| x.as_i64());
            let non_mem_heap = memory.and_then(|x| x.get("non-heap-memory-usage")).and_then(|x| x.as_i64());

            let db_traffic = v.get("DATABASE_TRAFFIC");
            let db_traffic_rec = db_traffic.and_then(|x| x.get("received")).and_then(|x| x.as_i64());
            let db_traffic_sent = db_traffic.and_then(|x| x.get("sent")).and_then(|x| x.as_i64());
            let db_size = v.get("DATABASE_SIZE").and_then(|x| x.get("size")).and_then(|x| x.as_i64());

            let server_info = v.get("SYSTEM_SERVER_INFO");
            let mem_size = server_info.and_then(|x| x.get("memorySize")).and_then(|x| x.as_i64());
            let mem_free = server_info.and_then(|x| x.get("memoryFree")).and_then(|x| x.as_i64());
            let hd_size = server_info.and_then(|x| x.get("hdSize")).map(|x| x.to_string());
            let hd_free = server_info.and_then(|x| x.get("hdFree")).map(|x| x.to_string());
            let core_count = server_info.and_then(|x| x.get("coreCount")).and_then(|x| x.as_i64()).map(|x| x as i32);
            let arch = server_info.and_then(|x| x.get("arch")).and_then(|x| x.as_str());
            let tmp_folder = server_info.and_then(|x| x.get("tmpFolderSize")).and_then(|x| x.as_i64());
            let log_folder = server_info.and_then(|x| x.get("logFolderSize")).and_then(|x| x.as_i64());
            let heap_max = server_info.and_then(|x| x.get("heapMaxSize")).and_then(|x| x.as_i64());
            let heap_size = server_info.and_then(|x| x.get("heapSize")).and_then(|x| x.as_i64());
            let sys_uptime = server_info.and_then(|x| x.get("uptime")).and_then(|x| x.as_i64());

            let threading = v.get("THREADING_INFO");
            let thread_count = threading.and_then(|x| x.get("threadingCount")).and_then(|x| x.as_i64());
            let thread_peak = threading.and_then(|x| x.get("threadingPeakCount")).and_then(|x| x.as_i64());
            let thread_daemon = threading.and_then(|x| x.get("threadingDaemonCount")).and_then(|x| x.as_i64());
            let thread_total = threading.and_then(|x| x.get("threadingTotalStarted")).and_then(|x| x.as_i64());

            let artifacts_apps = v.get("ARTIFACTS_APPS").map(|x| x.to_string());
            let artifacts_core = v.get("ARTIFACTS_CORE").map(|x| x.to_string());
            let artifacts_sys = v.get("ARTIFACTS_SYSTEM").map(|x| x.to_string());
            let detailed_mem = v.get("DETAILED_MEMORY").map(|x| x.to_string());
            let ext_conv = v.get("EXTERNAL_CONVERTER").and_then(|x| x.as_bool()).unwrap_or(false);

            let runtime_info = v.get("RUNTIME_INFO");
            let runtime_uptime = runtime_info.and_then(|x| x.get("uptime")).and_then(|x| x.as_i64());

            let _ = conn.execute(
                r#"
                INSERT INTO "StatisticsHistory" (
                    environmentId, httpResponseId, dataSourceFluigDs, dataSourceFluigDsRo,
                    dbName, dbVersion, dbDriverName, dbDriverVersion, connectedUsers,
                    memoryHeap, nonMemoryHeap, dbTraficRecieved, dbTraficSent, dbSize,
                    artifactsApps, artifactsCore, artifactsSystem, externalConverter,
                    runtimeUptime, threadingCount, threadingPeakCount, threadingDaemonCount,
                    threadingTotalStarted, detailedMemory, systemServerMemorySize,
                    systemServerMemoryFree, systemServerHDSize, systemServerHDFree,
                    systemServerCoreCount, systemServerArch, systemTmpFolderSize,
                    systemLogFolderSize, systemHeapMaxSize, systemHeapSize, systemUptime
                )
                VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                    ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26,
                    ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35
                )
                "#,
                params![
                    environment_id, http_response_id, ds_fluig, ds_fluig_ro,
                    db_name, db_ver, db_driver, db_driver_ver, connected_users,
                    mem_heap, non_mem_heap, db_traffic_rec, db_traffic_sent, db_size,
                    artifacts_apps, artifacts_core, artifacts_sys, ext_conv,
                    runtime_uptime, thread_count, thread_peak, thread_daemon,
                    thread_total, detailed_mem, mem_size, mem_free,
                    hd_size, hd_free, core_count, arch, tmp_folder,
                    log_folder, heap_max, heap_size, sys_uptime
                ],
            );
        }
    }

    // 2. Process monitors report
    if let Some(monitors_str) = monitors_json {
        if let Ok(v) = serde_json::from_str::<Value>(&monitors_str) {
            let _ = conn.execute(
                r#"
                INSERT INTO "HTTPResponse" (environmentId, statusCode, statusMessage, responseTimeMs, timestamp, resourceType)
                VALUES (?1, 200, 'OK', 120, ?2, 'MONITOR')
                "#,
                params![environment_id, now_ms],
            );
            let http_response_id = conn.last_insert_rowid();

            let items = if let Some(arr) = v.as_array() {
                arr.clone()
            } else if let Some(arr) = v.get("items").and_then(|x| x.as_array()) {
                arr.clone()
            } else {
                Vec::new()
            };

            let mut analytics = None::<String>;
            let mut license_server = None::<String>;
            let mut mail_server = None::<String>;
            let mut solr_server = None::<String>;
            let mut viewer = None::<String>;
            let mut open_office = None::<String>;
            let mut real_time = None::<String>;
            let mut ms_office = None::<String>;

            for item in &items {
                let name = item.get("name").and_then(|x| x.as_str()).unwrap_or("");
                let status = item.get("status").and_then(|x| x.as_str()).map(|x| x.to_string());
                match name {
                    "ANALYTICS_AVAIABILITY" | "analytics" => analytics = status,
                    "LICENSE_SERVER_AVAILABILITY" | "licenseServer" => license_server = status,
                    "MAIL_SERVER_AVAILABILITY" | "mailServer" => mail_server = status,
                    "SOLR_SERVER_AVAILABILITY" | "solrServer" => solr_server = status,
                    "VIEWER_AVAILABILITY" | "viewer" => viewer = status,
                    "OPEN_OFFICE_AVAILABILITY" | "openOffice" => open_office = status,
                    "REAL_TIME_AVAILABILITY" | "realTime" => real_time = status,
                    "MS_OFFICE_AVAILABILITY" | "MSOffice" => ms_office = status,
                    _ => {}
                }
            }

            let _ = conn.execute(
                r#"
                INSERT INTO "MonitorHistory" (
                    environmentId, httpResponseId, analytics, licenseServer,
                    mailServer, solrServer, viewer, openOffice, realTime, MSOffice, v2Payload
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                "#,
                params![
                    environment_id, http_response_id, analytics, license_server,
                    mail_server, solr_server, viewer, open_office, real_time, ms_office, monitors_str
                ],
            );
        }
    }

    // 3. Process licenses
    if let Some(licenses_str) = licenses_json {
        if let Ok(v) = serde_json::from_str::<Value>(&licenses_str) {
            let _ = conn.execute(
                r#"
                INSERT INTO "HTTPResponse" (environmentId, statusCode, statusMessage, responseTimeMs, timestamp, resourceType)
                VALUES (?1, 200, 'OK', 110, ?2, 'LICENSES')
                "#,
                params![environment_id, now_ms],
            );
            let http_response_id = conn.last_insert_rowid();

            let item = if let Some(arr) = v.as_array() {
                arr.first()
            } else if let Some(arr) = v.get("items").and_then(|x| x.as_array()) {
                arr.first()
            } else {
                Some(&v)
            };

            if let Some(lic) = item {
                let active = lic.get("activeUsers").and_then(|x| x.as_i64());
                let remaining = lic.get("remainingLicenses").and_then(|x| x.as_i64());
                let total = lic.get("totalLicenses").and_then(|x| x.as_i64());
                let tenant = lic.get("tenantId").and_then(|x| x.as_i64()).unwrap_or(0);

                let _ = conn.execute(
                    r#"
                    INSERT INTO "LicenseHistory" (environmentId, httpResponseId, activeUsers, remainingLicenses, totalLicenses, tenantId)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                    "#,
                    params![environment_id, http_response_id, active, remaining, total, tenant],
                );
            }
        }
    }

    let payload = serde_json::json!({
        "environmentId": environment_id,
        "syncJobFinished": true,
        "timestamp": now_ms,
    });

    let _ = app.emit(&format!("environmentDataUpdated_{}", environment_id), payload.clone());
    let _ = app.emit("environmentDataUpdated", payload);

    Ok(true)
}

#[tauri::command]
pub fn get_system_runtime_info() -> Result<Value, String> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let platform = match (os, arch) {
        ("linux", "x86_64") => "Linux x86_64".to_string(),
        ("linux", "aarch64") => "Linux aarch64".to_string(),
        ("windows", "x86_64") => "Windows x64".to_string(),
        ("windows", "aarch64") => "Windows ARM64".to_string(),
        ("macos", "aarch64") => "macOS Apple Silicon".to_string(),
        ("macos", "x86_64") => "macOS Intel".to_string(),
        _ => format!("{} {}", os, arch),
    };

    let webview = match os {
        "linux" => "WebKitGTK",
        "windows" => "WebView2",
        "macos" => "WKWebView",
        _ => "Webview",
    };

    Ok(serde_json::json!({
        "framework": "Tauri",
        "frameworkVersion": "2.2.0",
        "webview": webview,
        "backend": "Rust",
        "backendVersion": "1.84",
        "platform": platform,
        "electron": "2.2.0",
        "chrome": webview,
        "node": "1.84",
    }))
}

#[tauri::command]
pub fn toggle_fullscreen(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let is_fs = window.is_fullscreen().map_err(|e| e.to_string())?;
        window.set_fullscreen(!is_fs).map_err(|e| e.to_string())?;
        Ok(!is_fs)
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub async fn fetch_url_with_headers(
    url: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&url);
    for (k, v) in headers {
        req = req.header(k, v);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();

    Ok(serde_json::json!({
        "status": status,
        "body": body,
    }))
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}
