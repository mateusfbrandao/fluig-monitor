export interface Environment {
  id: number;
  name: string;
  release: string;
  baseUrl: string;
  kind: string;
  logCreatedAt?: string | Date;
  logUpdateAt?: string | Date;
  logDeleted?: boolean;
  logDeletedAt?: string | Date | null;
  isFavorite?: boolean;
  favoritedAt?: string | Date | null;
  updateScheduleId?: UpdateSchedule | null;
  oAuthKeysId?: EnvironmentAuthKeys | null;
}

export interface EnvironmentAuthKeys {
  id: number;
  payload: string;
  hash: string;
  environmentId: number;
}

export interface UpdateSchedule {
  id: number;
  scrapeFrequency: string;
  pingFrequency: string;
  environmentId: number;
}

export interface HTTPResponse {
  id: number;
  environmentId: number;
  timestamp: string | Date;
  endpoint?: string | null;
  resourceType?: string | null;
  statusCode: number;
  statusMessage?: string | null;
  responseTimeMs: number;
}

export interface LicenseHistory {
  id: number;
  environmentId: number;
  httpResponseId: number;
  tenantId: number;
  activeUsers: number;
  totalLicenses: number;
  remainingLicenses: number;
}

export interface MonitorHistory {
  id: number;
  environmentId: number;
  httpResponseId: number;
  analytics?: string | null;
  licenseServer?: string | null;
  mailServer?: string | null;
  solrServer?: string | null;
  viewer?: string | null;
  openOffice?: string | null;
  realTime?: string | null;
  MSOffice?: string | null;
  rawDetails?: string | null;
}

export interface StatisticsHistory {
  id: number;
  environmentId: number;
  httpResponseId: number;
  dataSourceFluigDs?: string | null;
  dataSourceFluigDsRo?: string | null;
  dbName?: string | null;
  dbVersion?: string | null;
  dbDriverName?: string | null;
  dbDriverVersion?: string | null;
  connectedUsers?: bigint | number | null;
  memoryHeap?: bigint | number | null;
  nonMemoryHeap?: bigint | number | null;
  dbTraficRecieved?: bigint | number | null;
  dbTraficSent?: bigint | number | null;
  dbSize?: bigint | number | null;
  artifactsApps?: string | null;
  artifactsCore?: string | null;
  artifactsSystem?: string | null;
  externalConverter?: boolean | null;
  runtimeStart?: string | Date | null;
  runtimeUptime?: bigint | number | null;
  threadingCount?: bigint | number | null;
  threadingPeakCount?: bigint | number | null;
  threadingDaemonCount?: bigint | number | null;
  threadingTotalStarted?: bigint | number | null;
  detailedMemory?: string | null;
  systemServerMemorySize?: bigint | number | null;
  systemServerMemoryFree?: bigint | number | null;
  systemServerHDSize?: string | null;
  systemServerHDFree?: string | null;
  systemServerCoreCount?: number | null;
  systemServerArch?: string | null;
  systemTmpFolderSize?: bigint | number | null;
  systemLogFolderSize?: bigint | number | null;
  systemHeapMaxSize?: bigint | number | null;
  systemHeapSize?: bigint | number | null;
  systemUptime?: bigint | number | null;
}

export interface AppSetting {
  id?: number;
  settingId: string;
  value: string;
  group?: string | null;
}

export interface SettingsObject {
  [key: string]: AppSetting;
}

export interface AppSettingUpdatePropsInterface {
  settingId: string;
  value: string;
  group?: string | null;
}

export interface HDStats {
  systemServerHDFree: string | null;
  systemServerHDSize: string | null;
  httpResponse: HTTPResponse;
}

export interface MemoryStats {
  systemServerMemorySize: bigint | number | null;
  systemServerMemoryFree: bigint | number | null;
  httpResponse: HTTPResponse;
}

export interface DbStatistic {
  dbTraficRecieved: bigint | number | null;
  dbTraficSent: bigint | number | null;
  dbSize: bigint | number | null;
  dataSourceFluigDs?: string | null;
  dataSourceFluigDsRo?: string | null;
  httpResponse: HTTPResponse;
}

export interface DatabaseProperties {
  dbName: string | null;
  dbVersion: string | null;
  dbDriverName: string | null;
  dbDriverVersion: string | null;
  dataSourceFluigDs: string | null;
  dataSourceFluigDsRo: string | null;
  httpResponse: HTTPResponse;
}

export interface EnvironmentLicenseData {
  id: number;
  activeUsers: number;
  remainingLicenses: number;
  totalLicenses: number;
  tenantId: number;
  httpResponse: HTTPResponse;
}
