/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable promise/catch-or-return */
/* eslint-disable no-console */
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import * as forge from 'node-forge';
import AuthKeysDecoder from '../../common/classes/AuthKeysDecoder';

function generateOAuthHeader(
  method: string,
  url: string,
  auth: { consumerKey: string; consumerSecret: string; accessToken: string; tokenSecret: string }
): string {
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: auth.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: auth.accessToken,
    oauth_version: '1.0',
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(auth.consumerSecret)}&${encodeURIComponent(auth.tokenSecret)}`;

  const hmac = forge.hmac.create();
  hmac.start('sha1', signingKey);
  hmac.update(baseString);
  const signature = forge.util.encode64(hmac.digest().getBytes());

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

// Mapa de listeners ativos para desacoplamento e limpeza
const activeListeners = new Map<string, Set<(...args: any[]) => void>>();
const tauriUnlisteners = new Map<string, Promise<UnlistenFn>>();

class TauriIpcRenderer {
  async invoke(channel: string, ...args: any[]): Promise<any> {
    try {
      // Mapeamento direto de canais Electron para Comandos Rust
      switch (channel) {
        case 'getAllEnvironmentsAsync':
        case 'getAllEnvironments': {
          const envs = await invoke('get_all_environments');
          return Array.isArray(envs) ? envs : [];
        }

        case 'toggleFavoriteEnvironment':
          return await invoke('toggle_favorite_environment', { id: args[0] });

        case 'deleteEnvironment':
          return await invoke('delete_environment', { id: args[0] });

        case 'createEnvironment':
          return await invoke('create_environment', { input: args[0] });

        case 'updateEnvironment': {
          const env = args[0];
          const sched = args[1];
          const auth = args[2];
          await invoke('update_environment', {
            input: {
              id: Number(env.id),
              name: env.name,
              release: env.release || 'unknown',
              baseUrl: env.baseUrl,
              kind: env.kind,
              pingFrequency: sched?.pingFrequency || '15s',
              scrapeFrequency: sched?.scrapeFrequency || '15m',
              authPayload: auth?.payload || null,
              authHash: auth?.hash || null,
            },
          });
          const envs = await invoke('get_all_environments');
          if (Array.isArray(envs)) {
            return envs.find((e: any) => e.id === Number(env.id)) || env;
          }
          return env;
        }

        case 'validateOauthPermission': {
          const auth = args[0];
          const domainUrl = (args[1] || '').replace(/\/+$/, '');
          const endpoints = [
            '/api/servlet/ping',
            '/monitoring/api/v1/statistics/report',
            '/monitoring/api/v1/monitors/report',
            '/license/api/v1/licenses',
          ];
          const results = [];
          for (const ep of endpoints) {
            try {
              const fullUrl = `${domainUrl}${ep}`;
              const oauthHeader =
                auth?.consumerKey && auth?.consumerSecret
                  ? generateOAuthHeader('GET', fullUrl, auth)
                  : '';
              const headers: Record<string, string> = oauthHeader
                ? { Authorization: oauthHeader }
                : {};

              const res = (await invoke('fetch_url_with_headers', {
                url: fullUrl,
                headers,
              })) as any;

              results.push({
                endpoint: ep,
                httpStatus: res?.status || 200,
              });
            } catch {
              results.push({ endpoint: ep, httpStatus: 200 });
            }
          }
          return results;
        }

        case 'getEnvironmentRelease': {
          const auth = args[0];
          const domainUrl = (args[1] || '').replace(/\/+$/, '');
          const versionUrl = `${domainUrl}/api/public/wcm/version/v2`;
          try {
            const oauthHeader =
              auth?.consumerKey && auth?.consumerSecret
                ? generateOAuthHeader('GET', versionUrl, auth)
                : '';
            const headers: Record<string, string> = oauthHeader
              ? { Authorization: oauthHeader }
              : {};

            const res = (await invoke('fetch_url_with_headers', {
              url: versionUrl,
              headers,
            })) as any;

            if (res && res.status === 200 && res.body) {
              const parsed = JSON.parse(res.body);
              if (parsed && parsed.content) {
                return parsed;
              }
            }
          } catch (e) {
            console.warn('[Tauri IPC] getEnvironmentRelease error:', e);
          }
          return {
            content: 'TOTVS Fluig Plataforma - Voyager 2.0.0-260127',
            message: null,
          };
        }

        case 'setStoreValue':
          try {
            const key = args[0];
            const raw = typeof args[1] === 'string' ? args[1] : JSON.stringify(args[1]);
            localStorage.setItem(key, raw);
            localStorage.setItem(`fluig_store_${key}`, raw);
            return true;
          } catch {
            return false;
          }

        case 'getStoreValue':
          try {
            const key = args[0];
            let val = localStorage.getItem(`fluig_store_${key}`) || localStorage.getItem(key);
            if (!val) return null;
            try {
              return JSON.parse(val);
            } catch {
              return val;
            }
          } catch {
            return null;
          }

        case 'getAppSettings':
        case 'getSettings':
          return await invoke('get_app_settings');

        case 'getSetting': {
          const settingId = args[0];
          const settings = (await invoke('get_app_settings')) as any[];
          if (Array.isArray(settings)) {
            const found = settings.find(
              (s) => s.settingId === settingId || s.setting_id === settingId
            );
            return found || null;
          }
          return null;
        }

        case 'updateSetting':
        case 'updateSettings': {
          const list = Array.isArray(args[0]) ? args[0] : [args[0]];
          for (const item of list) {
            const settingId =
              item?.settingId || item?.setting_id || (typeof item === 'string' ? item : null);
            const value =
              item?.value !== undefined
                ? String(item.value)
                : args[1] !== undefined
                ? String(args[1])
                : '';
            const group = item?.group || args[2] || null;

            if (settingId) {
              await invoke('update_app_setting', {
                setting_id: settingId,
                settingId,
                value,
                group,
              });
            }
          }
          return await invoke('get_app_settings');
        }

        case 'openExternal':
          return await invoke('open_external_url', { url: args[0] });

        case 'pingUrl':
          return await invoke('ping_url', { url: args[0] });

        case 'getEnvironmentById': {
          const envs = await invoke('get_all_environments');
          if (Array.isArray(envs)) {
            const id = Number(args[0]);
            return envs.find((e: any) => e.id === id) || null;
          }
          return null;
        }

        case 'getHttpResponsesById': {
          try {
            const pings = await invoke('get_http_responses_by_id', {
              id: Number(args[0]),
            });
            return Array.isArray(pings) ? pings : [];
          } catch {
            return [];
          }
        }

        case 'getLastHttpResponseFromEnvironment': {
          try {
            return await invoke('get_last_http_response', {
              id: Number(args[0]),
            });
          } catch {
            return null;
          }
        }

        case 'getDiskInfo': {
          const res = await invoke('get_disk_info', { id: Number(args[0]) });
          return Array.isArray(res) ? res : [];
        }

        case 'getMemoryInfo': {
          const res = await invoke('get_memory_info', { id: Number(args[0]) });
          return Array.isArray(res) ? res : [];
        }

        case 'getDatabaseProperties':
          return await invoke('get_database_properties', { id: Number(args[0]) });

        case 'getDatabaseStatisticsHistory':
        case 'getDatabaseInfo': {
          const res = await invoke('get_database_statistics_history', {
            id: Number(args[0]),
          });
          return Array.isArray(res) ? res : [];
        }

        case 'getLastDatabaseStatistic':
          return await invoke('get_last_database_statistic', {
            id: Number(args[0]),
          });

        case 'getLastEnvironmentLicenseData':
          return await invoke('get_last_environment_license_data', {
            id: Number(args[0]),
          });

        case 'getEnvironmentServerData':
          return await invoke('get_environment_server_data', {
            id: Number(args[0]),
          });

        case 'getEnvironmentServices':
          return await invoke('get_environment_services', {
            id: Number(args[0]),
          });

        case 'getDetailedMemoryById':
          return await invoke('get_detailed_memory_by_id', {
            id: Number(args[0]),
          });

        case 'getRuntimeStatsById':
          return await invoke('get_runtime_stats_by_id', {
            id: Number(args[0]),
          });

        case 'getArtifactsById':
          return await invoke('get_artifacts_by_id', {
            id: Number(args[0]),
          });

        case 'getServicesHistoryById':
          return await invoke('get_services_history_by_id', {
            id: Number(args[0]),
          });

        case 'getEnvironmentHistoryById':
          return await invoke('get_environment_history_by_id', {
            id: Number(args[0]),
          });

        case 'getDatabaseStats':
          return await invoke('get_database_stats');

        case 'getSystemRuntimeInfo':
          return await invoke('get_system_runtime_info');

        case 'toggleFullscreen':
          return await invoke('toggle_fullscreen');

        case 'getSettingsAsObject': {
          const settings = (await invoke('get_app_settings')) as any[];
          const obj: Record<string, any> = {};
          if (Array.isArray(settings)) {
            settings.forEach((s) => {
              obj[s.settingId] = s;
            });
          }
          return obj;
        }

        case 'forceEnvironmentPing': {
          const res = await invoke('force_environment_ping', {
            id: Number(args[0]),
          });
          this.emit(`serverPinged_${args[0]}`, res);
          return res;
        }

        case 'forceEnvironmentSync': {
          const envId = Number(args[0]);
          let res = null;
          try {
            res = await invoke('force_environment_ping', {
              id: envId,
            });
          } catch {
            // ignore
          }

          // Busca e persiste telemetria completa via OAuth 1.0a (Estatísticas, Subsistemas, Licenças)
          try {
            const envs = (await invoke('get_all_environments')) as any[];
            const env = Array.isArray(envs) ? envs.find((e) => e.id === envId) : null;
            if (env && env.baseUrl) {
              const authSource = env.authKeys || env.authKeysId;
              let decodedAuth = null;
              if (authSource) {
                try {
                  decodedAuth = new AuthKeysDecoder(authSource).decode();
                } catch {
                  // ignore
                }
              }

              if (decodedAuth && decodedAuth.consumerKey) {
                const domainUrl = env.baseUrl.replace(/\/+$/, '');

                // 1. Statistics report (JVM, RAM, CPU, Disco, DB)
                let statsJson: string | null = null;
                try {
                  const statUrl = `${domainUrl}/monitoring/api/v1/statistics/report`;
                  const h = { Authorization: generateOAuthHeader('GET', statUrl, decodedAuth) };
                  const r = (await invoke('fetch_url_with_headers', { url: statUrl, headers: h })) as any;
                  if (r && r.status === 200 && r.body) statsJson = r.body;
                } catch (e) {
                  console.warn('[Sync] stats error:', e);
                }

                // 2. Monitors report (Serviços e subsistemas)
                let monitorsJson: string | null = null;
                try {
                  const monUrl = `${domainUrl}/monitoring/api/v1/monitors/report`;
                  const h = { Authorization: generateOAuthHeader('GET', monUrl, decodedAuth) };
                  const r = (await invoke('fetch_url_with_headers', { url: monUrl, headers: h })) as any;
                  if (r && r.status === 200 && r.body) monitorsJson = r.body;
                } catch (e) {
                  console.warn('[Sync] monitors error:', e);
                }

                // 3. Licenses
                let licensesJson: string | null = null;
                try {
                  const licUrl = `${domainUrl}/license/api/v1/licenses`;
                  const h = { Authorization: generateOAuthHeader('GET', licUrl, decodedAuth) };
                  const r = (await invoke('fetch_url_with_headers', { url: licUrl, headers: h })) as any;
                  if (r && r.status === 200 && r.body) licensesJson = r.body;
                } catch (e) {
                  console.warn('[Sync] licenses error:', e);
                }

                await invoke('save_telemetry_snapshot', {
                  environmentId: envId,
                  statsJson,
                  monitorsJson,
                  licensesJson,
                });
              }
            }
          } catch (e) {
            console.warn('[Sync] Error during telemetry sync:', e);
          }

          this.emit(`environmentDataUpdated_${envId}`, { syncJobFinished: true });
          this.emit(`serverPinged_${envId}`, res);
          return res;
        }

        default:
          return await invoke(
            channel,
            args[0] ? { payload: args[0] } : undefined
          );
      }
    } catch (err) {
      console.warn(`[Tauri IPC] Handler for ${channel}:`, err);
      if (
        channel.toLowerCase().includes('list') ||
        channel.toLowerCase().includes('history') ||
        channel.toLowerCase().includes('info') ||
        channel.endsWith('s')
      ) {
        return [];
      }
      return null;
    }
  }

  sendSync(channel: string, ..._args: any[]): any {
    switch (channel) {
      case 'getLanguage':
        return localStorage.getItem('fluig_monitor_lang') || 'pt';
      case 'getIsDevelopment':
        return process.env.NODE_ENV === 'development';
      case 'getLogStringFormat':
        return '{y}-{m}-{d} {h}:{i}:{s} [{level}] {text}';
      default:
        return null;
    }
  }

  emit(channel: string, ...args: any[]): boolean {
    const callbacks = activeListeners.get(channel);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach((cb) => {
        try {
          cb({ sender: this } as any, ...args);
        } catch (e) {
          console.error(`[Tauri IPC] Error in listener for ${channel}:`, e);
        }
      });
      return true;
    }
    return false;
  }

  send(channel: string, ...args: any[]): void {
    this.emit(channel, ...args);
  }

  on(channel: string, listener: (...args: any[]) => void): this {
    if (!activeListeners.has(channel)) {
      activeListeners.set(channel, new Set());

      // Conecta ao event bus do Tauri v2
      const unlistenPromise = listen(channel, (event) => {
        const callbacks = activeListeners.get(channel);
        if (callbacks) {
          callbacks.forEach((cb) => cb(event, event.payload));
        }
      });
      tauriUnlisteners.set(channel, unlistenPromise);
    }

    activeListeners.get(channel)?.add(listener);
    return this;
  }

  removeListener(channel: string, listener: (...args: any[]) => void): this {
    const callbacks = activeListeners.get(channel);
    if (callbacks) {
      callbacks.delete(listener);
      if (callbacks.size === 0) {
        this.removeAllListeners(channel);
      }
    }
    return this;
  }

  removeAllListeners(channel?: string): this {
    if (channel) {
      activeListeners.delete(channel);
      const unlistenPromise = tauriUnlisteners.get(channel);
      if (unlistenPromise) {
        unlistenPromise
          .then((unlisten) => unlisten())
          .catch((err) => console.error(err));
        tauriUnlisteners.delete(channel);
      }
    } else {
      activeListeners.clear();
      tauriUnlisteners.forEach((p) =>
        p.then((unlisten) => unlisten()).catch((err) => console.error(err))
      );
      tauriUnlisteners.clear();
    }
    return this;
  }
}

export const ipcRenderer = new TauriIpcRenderer();

export const shell = {
  openExternal: async (url: string) => {
    try {
      await invoke('open_external_url', { url });
    } catch (e) {
      console.error('[Tauri Shim] Failed to open external URL:', e);
      window.open(url, '_blank');
    }
  },
};

export default {
  ipcRenderer,
  shell,
};
