import {
  Environment,
  EnvironmentAuthKeys,
  HTTPResponse,
  LicenseHistory,
  MonitorHistory,
  StatisticsHistory,
  UpdateSchedule,
} from './DatabaseModels';

export interface EnvironmentCreateControllerInterface {
  name: string;
  release: string;
  baseUrl: string;
  kind: string;
  logDeleted?: boolean;
}

export interface EnvironmentUpdateControllerInterface
  extends EnvironmentCreateControllerInterface {
  id: number;
}

export interface EnvironmentWithRelatedData extends Environment {
  updateScheduleId: UpdateSchedule | null;
  oAuthKeysId: EnvironmentAuthKeys | null;
  httpResponses: HTTPResponse[];
}

export interface EnvironmentWithHistory extends Environment {
  licenseHistory: LicenseHistoryWithHttpResponse[];
  statisticHistory: StatisticsHistoryWithHttpResponse[];
  monitorHistory: MonitorHistoryWithHttpResponse[];
  httpResponses: HTTPResponse[];
}

export interface EnvironmentServerData extends Environment {
  statisticHistory: StatisticsHistoryWithHttpResponse[];
}

export interface EnvironmentServices extends Environment {
  monitorHistory: MonitorHistoryWithHttpResponse[];
}

export interface LicenseHistoryWithHttpResponse extends LicenseHistory {
  httpResponse: HTTPResponse;
}

export interface StatisticsHistoryWithHttpResponse extends StatisticsHistory {
  httpResponse: HTTPResponse;
}

export interface MonitorHistoryWithHttpResponse extends MonitorHistory {
  httpResponse: HTTPResponse;
}

export interface DetailedMemoryHistory {
  systemServerMemorySize: bigint | null;
  systemServerMemoryFree: bigint | null;
  memoryHeap: bigint | null;
  nonMemoryHeap: bigint | null;
  detailedMemory: string | null;
  systemHeapMaxSize: bigint | null;
  systemHeapSize: bigint | null;
  httpResponse: HTTPResponse;
}

export interface EnvironmentWithDetailedMemoryHistory extends Environment {
  statisticHistory: DetailedMemoryHistory[];
}

export interface RuntimeStatHistoryItem {
  connectedUsers: bigint | null;
  runtimeStart: Date | null;
  runtimeUptime: bigint | null;
  systemUptime: bigint | null;
  threadingCount: bigint | null;
  threadingPeakCount: bigint | null;
  threadingDaemonCount: bigint | null;
  threadingTotalStarted: bigint | null;
  systemServerCoreCount: number | null;
  systemServerArch: string | null;
  systemTmpFolderSize: bigint | null;
  systemLogFolderSize: bigint | null;
  externalConverter: boolean | null;
  httpResponse: HTTPResponse;
}

export interface EnvironmentWithRuntimeStats extends Environment {
  statisticHistory: RuntimeStatHistoryItem[];
}

export interface EnvironmentArtifactsData extends Environment {
  statisticHistory: {
    artifactsApps: string | null;
    artifactsCore: string | null;
    artifactsSystem: string | null;
    httpResponse: HTTPResponse;
  }[];
}

export interface EnvironmentServicesHistoryData extends Environment {
  monitorHistory: MonitorHistoryWithHttpResponse[];
  statisticHistory: {
    dataSourceFluigDs: string | null;
    dataSourceFluigDsRo: string | null;
    externalConverter: boolean | null;
    httpResponse: HTTPResponse;
  }[];
}
