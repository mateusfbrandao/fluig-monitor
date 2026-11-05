import { ipcRenderer } from 'electron';
import {
  AppSetting,
  AppSettingUpdatePropsInterface,
  SettingsObject,
} from '../../common/interfaces/DatabaseModels';

export interface DatabaseStats {
  sizeBytes: number;
  totalPings: number;
  totalSnapshots: number;
  dbPath: string;
}

export interface DataRetentionResult {
  deletedPings: number;
  deletedSnapshots: number;
}

export interface SystemRuntimeInfo {
  framework?: string;
  frameworkVersion?: string;
  webview?: string;
  backend?: string;
  backendVersion?: string;
  electron?: string;
  chrome?: string;
  node?: string;
  platform: string;
}

export async function updateAppSettings(
  settings: AppSettingUpdatePropsInterface[]
): Promise<AppSetting[]> {
  const updated = await ipcRenderer.invoke('updateSettings', settings);

  return updated;
}

export async function getAppSetting(
  settingId: string
): Promise<AppSetting | null> {
  const found = await ipcRenderer.invoke('getSetting', settingId);

  return found;
}

export async function getAppSettingsAsObject(): Promise<SettingsObject> {
  const settings = await ipcRenderer.invoke('getSettingsAsObject');

  return settings;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  return ipcRenderer.invoke('getDatabaseStats');
}

export async function runDataRetentionPrune(): Promise<DataRetentionResult> {
  return ipcRenderer.invoke('runDataRetentionPrune');
}

export async function getSystemRuntimeInfo(): Promise<SystemRuntimeInfo> {
  return ipcRenderer.invoke('getSystemRuntimeInfo');
}

export async function triggerAppUpdateCheck(): Promise<void> {
  return ipcRenderer.invoke('callAppUpdater', {});
}
