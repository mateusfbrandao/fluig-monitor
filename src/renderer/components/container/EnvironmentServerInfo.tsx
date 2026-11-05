import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiClock, FiCpu, FiDatabase, FiServer } from 'react-icons/fi';

import DynamicImageLoad from '../base/DynamicImageLoad';
import defaultServerLogo from '../../assets/img/defaultServerLogo.png';
import formatBytes from '../../../common/utils/formatBytes';
import relativeTime from '../../../common/utils/relativeTime';
import { EnvironmentServerData } from '../../../common/interfaces/EnvironmentControllerInterface';
import { getEnvironmentServerData } from '../../ipc/environmentsIpcHandler';

import '../../assets/styles/components/EnvironmentServerInfo.scss';

export default function EnvironmentServerInfo() {
  const { t } = useTranslation();
  const [serverData, setServerData] = useState<EnvironmentServerData | null>(
    null
  );

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadServerData() {
      setServerData(await getEnvironmentServerData(Number(environmentId)));
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadServerData();
    });

    loadServerData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setServerData(null);
    };
  }, [environmentId]);

  const latestStats = serverData?.statisticHistory?.[0];
  const uptime =
    latestStats && latestStats.systemUptime
      ? relativeTime(Number(latestStats.systemUptime))
      : null;

  return (
    <div className="widget-container" id="environment-server-info">
      <h3 className="title">{t('components.EnvironmentServerInfo.title')}</h3>
      <div className="widget-card">
        {serverData ? (
          <>
            <div className="server-identity-banner">
              <DynamicImageLoad
                imgSrc={`${serverData.baseUrl}/portal/api/servlet/image/1/custom/logo_image.png`}
                altName="Logo"
                fallback={defaultServerLogo}
              />
              <div className="server-identity-meta">
                <b>{serverData.name}</b>
                <small>{latestStats?.systemServerArch || 'x86_64'}</small>
              </div>
            </div>

            {uptime !== null && latestStats ? (
              <div id="server-specs-grid">
                <div className="specs-item">
                  <FiCpu />
                  <div className="spec-description">
                    <span>
                      {t('components.EnvironmentServerInfo.processor')}
                    </span>
                    <b>{latestStats.systemServerCoreCount} Cores</b>
                  </div>
                </div>

                <div className="specs-item">
                  <FiServer />
                  <div className="spec-description">
                    <span>{t('components.EnvironmentServerInfo.memory')}</span>
                    <b>
                      {formatBytes(Number(latestStats.systemServerMemorySize))}
                    </b>
                  </div>
                </div>

                <div className="specs-item">
                  <FiDatabase />
                  <div className="spec-description">
                    <span>{t('components.EnvironmentServerInfo.disk')}</span>
                    <b>{formatBytes(Number(latestStats.systemServerHDSize))}</b>
                  </div>
                </div>

                <div className="specs-item">
                  <FiClock />
                  <div className="spec-description">
                    <span>
                      {t('components.EnvironmentServerInfo.activityTime')}
                    </span>
                    <b>
                      {uptime.days}d {uptime.hours}h {uptime.minutes}m
                    </b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-soft">
                  {t('components.EnvironmentServerInfo.noDataDueToVersion')}
                </span>
              </div>
            )}
          </>
        ) : (
          <span>{t('components.global.noData')}</span>
        )}
      </div>
    </div>
  );
}
