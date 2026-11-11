import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ipcRenderer } from 'electron';
import { FiChevronRight, FiServer } from 'react-icons/fi';
import log from 'electron-log';

import formatBytes from '../../../common/utils/formatBytes';
import { MemoryStats } from '../../../common/interfaces/DatabaseModels';
import { getMemoryInfo } from '../../ipc/environmentsIpcHandler';
import SpinnerLoader from '../base/Loaders/Spinner';
import ProgressBar from '../base/ProgressBar';
import TimeIndicator from '../base/TimeIndicator';

/**
 * Environment aware self loading memory panel component.
 *  Uses the useLocation hook to identify the current environment in view.
 * @since 0.5
 */
export default function MemoryPanel() {
  const [memoryInfo, setMemoryInfo] = useState<MemoryStats[] | null>(null);
  const { t } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadMemoryInfo() {
      log.info(
        `Loading memory data for environment ${environmentId} using the responsive component.`
      );
      setMemoryInfo(await getMemoryInfo(Number(environmentId)));
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, async () => {
      setMemoryInfo(await getMemoryInfo(Number(environmentId)));
    });

    loadMemoryInfo();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setMemoryInfo(null);
    };
  }, [environmentId]);

  const usedMemoryBytes =
    memoryInfo && memoryInfo.length > 0
      ? Number(memoryInfo[0].systemServerMemorySize) -
        Number(memoryInfo[0].systemServerMemoryFree)
      : 0;
  const totalMemoryBytes =
    memoryInfo && memoryInfo.length > 0
      ? Number(memoryInfo[0].systemServerMemorySize)
      : 0;
  const memoryPct =
    totalMemoryBytes > 0
      ? Math.round((usedMemoryBytes / totalMemoryBytes) * 100)
      : 0;

  return (
    <div
      className="card system-resource-card is-interactive"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/environment/${environmentId}/detailedMemory`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/environment/${environmentId}/detailedMemory`);
        }
      }}
      aria-label={`${t('components.SystemResources.Memory.title')} - ${t(
        'components.SystemResources.Memory.openDetailed'
      )}`}
    >
      <div className="header">
        <div className="header-left">
          <div className="icon-dot neutral-variant">
            <FiServer aria-hidden="true" />
          </div>
          <span className="resource-title">
            {t('components.SystemResources.Memory.title')}
          </span>
        </div>
        <FiChevronRight className="drilldown-chevron" aria-hidden="true" />
      </div>
      {memoryInfo === null ? (
        <SpinnerLoader />
      ) : (
        <>
          {memoryInfo.length === 0 ? (
            <p>{t('components.global.noData')}</p>
          ) : (
            <>
              <div className="body">
                <div className="resource-stat-header">
                  <p className="font-soft">
                    {t('components.SystemResources.Memory.used')}
                  </p>
                  <span className="mono-pct-badge">{memoryPct}%</span>
                </div>
                <h3>{formatBytes(usedMemoryBytes)}</h3>
                <p className="font-soft">
                  {t('components.SystemResources.Memory.outOf')}{' '}
                  {formatBytes(totalMemoryBytes)}
                </p>
              </div>
              <div className="footer">
                <ProgressBar
                  total={totalMemoryBytes}
                  showPercentage={false}
                  showValues={false}
                  current={usedMemoryBytes}
                  showIndicator={false}
                  gradient={false}
                />

                <TimeIndicator date={memoryInfo[0].httpResponse.timestamp} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
