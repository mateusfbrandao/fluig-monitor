import { ipcRenderer, shell } from 'electron';
import {
  UpdateScheduleControllerInterface,
  UpdateScheduleFormControllerInterface,
} from '../../common/interfaces/UpdateScheduleControllerInterface';
import {
  EnvironmentArtifactsData,
  EnvironmentCreateControllerInterface,
  EnvironmentServerData,
  EnvironmentServices,
  EnvironmentServicesHistoryData,
  EnvironmentUpdateControllerInterface,
  EnvironmentWithDetailedMemoryHistory,
  EnvironmentWithHistory,
  EnvironmentWithRelatedData,
  EnvironmentWithRuntimeStats,
} from '../../common/interfaces/EnvironmentControllerInterface';
import {
  AuthKeysControllerInterface,
  AuthKeysFormControllerInterface,
} from '../../common/interfaces/AuthKeysControllerInterface';
import {
  Environment,
  EnvironmentAuthKeys,
  UpdateSchedule,
  DbStatistic,
  DatabaseProperties,
  HDStats,
  MemoryStats,
  EnvironmentLicenseData,
} from '../../common/interfaces/DatabaseModels';
import { FluigVersionApiInterface } from '../../common/interfaces/FluigVersionApiInterface';
import AuthObject from '../../common/interfaces/AuthObject';

export enum SystemResourceTypes {
  DISK = 'DISK',
  MEMORY = 'MEMORY',
  DATABASE = 'DATABASE',
}

export interface CreateEnvironmentProps {
  environment: EnvironmentCreateControllerInterface;
  updateSchedule: UpdateScheduleFormControllerInterface;
  environmentAuthKeys: AuthKeysFormControllerInterface;
}

interface CreatedEnvironmentProps {
  createdEnvironment: Environment;
  createdUpdateSchedule: UpdateSchedule;
  createdAuthKeys: EnvironmentAuthKeys;
}

export async function getAllEnvironments(): Promise<
  EnvironmentWithRelatedData[]
> {
  const environments = await ipcRenderer.invoke('getAllEnvironmentsAsync');
  return environments;
}

export async function getEnvironmentById(
  id: number,
  includeRelatedData = false
): Promise<EnvironmentWithRelatedData> {
  if (!id) {
    throw new Error('id is required');
  }
  const environment = ipcRenderer.invoke(
    'getEnvironmentById',
    id,
    includeRelatedData
  );

  return environment;
}

export async function getEnvironmentHistoryById(
  id: number
): Promise<EnvironmentWithHistory> {
  if (!id) {
    throw new Error('Id is required');
  }
  const environment = ipcRenderer.invoke('getEnvironmentHistoryById', id);
  return environment;
}

/**
 * (ipcRenderer) Gets the environment release from the api using the `/api/public/wcm/version/v2` endpoint
 */
export async function getEnvironmentReleaseIPC(
  auth: AuthObject,
  baseUrl: string
): Promise<FluigVersionApiInterface | null> {
  const release = await ipcRenderer.invoke(
    'getEnvironmentRelease',
    auth,
    baseUrl
  );

  return release;
}

export async function createEnvironment({
  environment,
  updateSchedule,
  environmentAuthKeys,
}: CreateEnvironmentProps): Promise<CreatedEnvironmentProps> {
  const createdEnvironment = await ipcRenderer.invoke('createEnvironment', {
    environment,
    updateSchedule,
    environmentAuthKeys,
  });

  return createdEnvironment;
}

export async function updateEnvironment(
  environment: EnvironmentUpdateControllerInterface,
  updateSchedule: UpdateScheduleControllerInterface,
  authKeys: AuthKeysControllerInterface
): Promise<Environment> {
  const updatedEnvironment = await ipcRenderer.invoke(
    'updateEnvironment',
    environment,
    updateSchedule,
    authKeys
  );

  return updatedEnvironment;
}

export async function deleteEnvironment(id: number): Promise<boolean> {
  const deleted = await ipcRenderer.invoke('deleteEnvironment', id);

  return deleted;
}

export async function toggleEnvironmentFavorite(
  id: number
): Promise<{ favorited: boolean; exception: string | null }> {
  const favorited = await ipcRenderer.invoke('toggleEnvironmentFavorite', id);

  return favorited;
}

export async function getLastHttpResponseById(
  environmentId: number
): Promise<HTTPResponse> {
  const lastResponse = await ipcRenderer.invoke(
    'getLastHttpResponseFromEnvironment',
    environmentId
  );

  return lastResponse;
}

export async function getHttpResponsesById(
  environmentId: number
): Promise<HTTPResponse[]> {
  const responses = await ipcRenderer.invoke(
    'getHttpResponsesById',
    environmentId
  );

  return Array.isArray(responses) ? responses : [];
}

export async function getEnvironmentServerData(
  environmentId: number
): Promise<EnvironmentServerData | null> {
  const serverData = await ipcRenderer.invoke(
    'getEnvironmentServerData',
    environmentId
  );

  return serverData;
}

export async function getEnvironmentServices(
  environmentId: number
): Promise<EnvironmentServices | null> {
  const services = await ipcRenderer.invoke(
    'getEnvironmentServices',
    environmentId
  );

  return services;
}

export async function getDiskInfo(id: number): Promise<HDStats[]> {
  const diskInfo = await ipcRenderer.invoke('getDiskInfo', id);

  return Array.isArray(diskInfo) ? diskInfo : [];
}

export async function getMemoryInfo(id: number): Promise<MemoryStats[]> {
  const memoryInfo = await ipcRenderer.invoke('getMemoryInfo', id);

  return Array.isArray(memoryInfo) ? memoryInfo : [];
}

export async function getDatabaseInfo(id: number): Promise<DbStatistic[]> {
  const databaseInfo = await ipcRenderer.invoke('getDatabaseInfo', id);

  return Array.isArray(databaseInfo) ? databaseInfo : [];
}

/**
 * (ipcRenderer) Returns the latest database usage statistic from the Statistics API.
 * @since 0.5.0
 */
export async function getLastDatabaseStatistic(
  id: number
): Promise<DbStatistic | null> {
  const dbStats = await ipcRenderer.invoke('getLastDatabaseStatistic', id);

  return dbStats;
}

export async function getDatabaseProperties(
  id: number
): Promise<DatabaseProperties> {
  const databaseProperties = await ipcRenderer.invoke(
    'getDatabaseProperties',
    id
  );

  return databaseProperties;
}

export async function getDatabaseStatisticsHistory(
  id: number
): Promise<DbStatistic[]> {
  const dbStatistics = await ipcRenderer.invoke(
    'getDatabaseStatisticsHistory',
    id
  );

  return Array.isArray(dbStatistics) ? dbStatistics : [];
}

export async function getLastEnvironmentLicenseData(
  id: number
): Promise<EnvironmentLicenseData | null> {
  const lastLicenseData = await ipcRenderer.invoke(
    'getLastEnvironmentLicenseData',
    id
  );

  return lastLicenseData;
}

export async function forceEnvironmentSync(
  environmentId?: number
): Promise<void> {
  await ipcRenderer.invoke('forceEnvironmentSync', environmentId);
  if (environmentId !== undefined) {
    (ipcRenderer as any).emit?.(`environmentDataUpdated_${environmentId}`);
    (ipcRenderer as any).emit?.(`serverPinged_${environmentId}`);
  }
}

export async function forceEnvironmentPing(
  environmentId?: number
): Promise<any> {
  const res = await ipcRenderer.invoke('forceEnvironmentPing', environmentId);
  if (environmentId !== undefined) {
    (ipcRenderer as any).emit?.(`serverPinged_${environmentId}`);
  }
  return res;
}

export async function getDetailedMemoryById(
  id: number
): Promise<EnvironmentWithDetailedMemoryHistory | null> {
  return ipcRenderer.invoke('getDetailedMemoryById', id);
}

export async function getRuntimeStatsById(
  id: number
): Promise<EnvironmentWithRuntimeStats | null> {
  return ipcRenderer.invoke('getRuntimeStatsById', id);
}

export async function getArtifactsById(
  id: number
): Promise<EnvironmentArtifactsData | null> {
  return ipcRenderer.invoke('getArtifactsById', id);
}

export async function getServicesHistoryById(
  id: number
): Promise<EnvironmentServicesHistoryData | null> {
  return ipcRenderer.invoke('getServicesHistoryById', id);
}

export function openExternalUrl(url: string): Promise<void> {
  return shell.openExternal(url);
}
