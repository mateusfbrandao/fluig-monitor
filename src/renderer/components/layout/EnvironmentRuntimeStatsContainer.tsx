/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Box from '../base/Box';
import Stat from '../base/Stat';
import DefaultMotionDiv from '../base/DefaultMotionDiv';
import SpinnerLoader from '../base/Loaders/Spinner';
import TimeIndicator from '../base/TimeIndicator';
import { getRuntimeStatsById } from '../../ipc/environmentsIpcHandler';
import { EnvironmentWithRuntimeStats } from '../../../common/interfaces/EnvironmentControllerInterface';
import formatBytes from '../../../common/utils/formatBytes';
import { formatDateTimeLocale, formatTimeLocale } from '../../utils/formatDate';

function EnvironmentRuntimeStatsContainer() {
  const { t } = useTranslation();
  const location = useLocation();
  const environmentId = Number(location.pathname.split('/')[2]);

  const [runtimeData, setRuntimeData] =
    useState<EnvironmentWithRuntimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!environmentId) return;
      const result = await getRuntimeStatsById(environmentId);
      setRuntimeData(result);
      setLoading(false);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadData();
    });

    loadData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
    };
  }, [environmentId]);

  const chartData = useMemo(() => {
    if (!runtimeData || !Array.isArray(runtimeData.statisticHistory)) return [];
    return runtimeData.statisticHistory
      .slice()
      .reverse()
      .map((item) => ({
      timestamp: item.httpResponse.timestamp,
      threadingCount: Number(item.threadingCount || 0),
      threadingPeakCount: Number(item.threadingPeakCount || 0),
      connectedUsers: Number(item.connectedUsers || 0),
    }));
  }, [runtimeData]);

  if (loading) {
    return <SpinnerLoader />;
  }

  const latest = runtimeData?.statisticHistory?.[0];

  if (!latest) {
    return (
      <DefaultMotionDiv id="runtime-stats-container">
        <h3>{t('components.EnvironmentRuntimeStats.title')}</h3>
        <Box>
          <span>{t('components.global.noData')}</span>
        </Box>
      </DefaultMotionDiv>
    );
  }

  return (
    <DefaultMotionDiv id="runtime-stats-container">
      <h3>{t('components.EnvironmentRuntimeStats.title')}</h3>

      <div className="stats-grid-4">
        <Box>
          <Stat
            prefix={t('components.EnvironmentRuntimeStats.connectedUsers')}
            heading={String(Number(latest.connectedUsers || 0))}
          />
        </Box>
        <Box>
          <Stat
            prefix={t('components.EnvironmentRuntimeStats.activeThreads')}
            heading={String(Number(latest.threadingCount || 0))}
            suffix={`${t(
              'components.EnvironmentRuntimeStats.peakThreads'
            )}: ${Number(latest.threadingPeakCount || 0)}`}
          />
        </Box>
        <Box>
          <Stat
            prefix={t('components.EnvironmentRuntimeStats.daemonThreads')}
            heading={String(Number(latest.threadingDaemonCount || 0))}
            suffix={`${t(
              'components.EnvironmentRuntimeStats.totalStartedThreads'
            )}: ${Number(latest.threadingTotalStarted || 0)}`}
          />
        </Box>
        <Box>
          <Stat
            prefix={t('components.EnvironmentRuntimeStats.logFolderSize')}
            heading={formatBytes(Number(latest.systemLogFolderSize || 0))}
            suffix={`${t(
              'components.EnvironmentRuntimeStats.tmpFolderSize'
            )}: ${formatBytes(Number(latest.systemTmpFolderSize || 0))}`}
          />
        </Box>
      </div>

      {chartData.length >= 2 && (
        <Box>
          <h4 style={{ marginBottom: '1rem' }}>
            {t('components.EnvironmentRuntimeStats.threadsEvolutionTitle')}
          </h4>
          <div style={{ height: '20rem', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(el) => formatTimeLocale(el)}
                  interval="preserveEnd"
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => formatDateTimeLocale(label)}
                />
                <Area
                  type="monotone"
                  dataKey="threadingCount"
                  name={t('components.EnvironmentRuntimeStats.activeThreads')}
                  dot={false}
                  stroke="var(--purple)"
                  strokeWidth={2}
                  fill="var(--light-purple)"
                />
                <Area
                  type="monotone"
                  dataKey="connectedUsers"
                  name={t('components.EnvironmentRuntimeStats.connectedUsers')}
                  dot={false}
                  stroke="var(--blue)"
                  strokeWidth={2}
                  fill="var(--light-yellow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <TimeIndicator date={latest.httpResponse.timestamp} noMargin />
        </Box>
      )}
    </DefaultMotionDiv>
  );
}

export default EnvironmentRuntimeStatsContainer;
