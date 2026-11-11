import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

  const specs =
    latestStats && uptime
      ? [
          {
            label: t('components.EnvironmentServerInfo.processor'),
            value: t('components.EnvironmentServerInfo.cores', {
              count: latestStats.systemServerCoreCount,
            }),
          },
          {
            label: t('components.EnvironmentServerInfo.memory'),
            value: formatBytes(Number(latestStats.systemServerMemorySize)),
          },
          {
            label: t('components.EnvironmentServerInfo.disk'),
            value: formatBytes(Number(latestStats.systemServerHDSize)),
          },
          {
            label: t('components.EnvironmentServerInfo.activityTime'),
            value: `${uptime.days}d ${uptime.hours}h ${uptime.minutes}m`,
          },
        ]
      : [];

  return (
    <div className="widget-container" id="environment-server-info">
      <h3 className="title">{t('components.EnvironmentServerInfo.title')}</h3>
      <div className="widget-card">
        {serverData ? (
          <>
            <div className="server-identity-banner">
              <DynamicImageLoad
                imgSrc={`${serverData.baseUrl}/portal/api/servlet/image/1/custom/logo_image.png`}
                altName={serverData.name}
                fallback={defaultServerLogo}
              />
              <div className="server-identity-meta">
                <b>{serverData.name}</b>
                <small>{latestStats?.systemServerArch || 'x86_64'}</small>
              </div>
            </div>

            {specs.length > 0 ? (
              <dl className="server-spec">
                {specs.map((item) => (
                  <div className="server-spec-item" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="server-empty">
                {t('components.EnvironmentServerInfo.noDataDueToVersion')}
              </p>
            )}
          </>
        ) : (
          <p className="server-empty">{t('components.global.noData')}</p>
        )}
      </div>
    </div>
  );
}
