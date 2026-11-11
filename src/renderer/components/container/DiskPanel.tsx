import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiHardDrive } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ipcRenderer } from 'electron';
import log from 'electron-log';

import formatBytes from '../../../common/utils/formatBytes';
import { HDStats } from '../../../common/interfaces/DatabaseModels';
import { getDiskInfo } from '../../ipc/environmentsIpcHandler';
import SpinnerLoader from '../base/Loaders/Spinner';
import ProgressBar from '../base/ProgressBar';
import TimeIndicator from '../base/TimeIndicator';

/**
 * Environment aware self loading disk usage panel component.
 *  Uses the useLocation hook to identify the current environment in view.
 * @since 0.5
 */
function DiskPanel() {
  const [diskInfo, setDiskInfo] = useState<HDStats[] | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadDiskInfo() {
      log.info(
        `Loading disk data for environment ${environmentId} using the responsive component.`
      );

      const result = await getDiskInfo(Number(environmentId));
      setDiskInfo(result);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, async () => {
      setDiskInfo(await getDiskInfo(Number(environmentId)));
    });

    loadDiskInfo();
    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setDiskInfo(null);
    };
  }, [environmentId]);

  const usedDiskBytes =
    diskInfo && diskInfo.length > 0
      ? Number(diskInfo[0].systemServerHDSize) -
        Number(diskInfo[0].systemServerHDFree)
      : 0;
  const totalDiskBytes =
    diskInfo && diskInfo.length > 0
      ? Number(diskInfo[0].systemServerHDSize)
      : 0;
  const diskPct =
    totalDiskBytes > 0 ? Math.round((usedDiskBytes / totalDiskBytes) * 100) : 0;

  return (
    <div
      className="card system-resource-card is-interactive"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/environment/${environmentId}/runtimeStats`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/environment/${environmentId}/runtimeStats`);
        }
      }}
      aria-label={`${t('components.SystemResources.Disk.title')} - ${t(
        'components.SystemResources.Disk.openRuntime'
      )}`}
    >
      <div className="header">
        <div className="header-left">
          <div className="icon-dot neutral-variant">
            <FiHardDrive aria-hidden="true" />
          </div>
          <span className="resource-title">
            {t('components.SystemResources.Disk.title')}
          </span>
        </div>
        <FiChevronRight className="drilldown-chevron" aria-hidden="true" />
      </div>
      {diskInfo === null ? (
        <SpinnerLoader />
      ) : (
        <>
          {diskInfo.length === 0 ? (
            <p>{t('components.global.noData')}</p>
          ) : (
            <>
              <div className="body">
                <div className="resource-stat-header">
                  <p className="font-soft">
                    {t('components.SystemResources.Disk.used')}
                  </p>
                  <span className="mono-pct-badge">{diskPct}%</span>
                </div>
                <h3>{formatBytes(usedDiskBytes)}</h3>
                <p className="font-soft">
                  {t('components.SystemResources.Disk.outOf')}{' '}
                  {formatBytes(totalDiskBytes)}
                </p>
              </div>
              <div className="footer">
                <ProgressBar
                  total={totalDiskBytes}
                  showPercentage={false}
                  showValues={false}
                  current={usedDiskBytes}
                  showIndicator={false}
                  gradient={false}
                />

                <TimeIndicator date={diskInfo[0].httpResponse.timestamp} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default DiskPanel;
