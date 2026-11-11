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

  const kpis = [
    {
      label: t('components.EnvironmentRuntimeStats.connectedUsers'),
      value: String(Number(latest.connectedUsers || 0)),
    },
    {
      label: t('components.EnvironmentRuntimeStats.activeThreads'),
      value: String(Number(latest.threadingCount || 0)),
      meta: `${t('components.EnvironmentRuntimeStats.peakThreads')}: ${Number(
        latest.threadingPeakCount || 0
      )}`,
    },
    {
      label: t('components.EnvironmentRuntimeStats.daemonThreads'),
      value: String(Number(latest.threadingDaemonCount || 0)),
      meta: `${t(
        'components.EnvironmentRuntimeStats.totalStartedThreads'
      )}: ${Number(latest.threadingTotalStarted || 0)}`,
    },
    {
      label: t('components.EnvironmentRuntimeStats.logFolderSize'),
      value: formatBytes(Number(latest.systemLogFolderSize || 0)),
      meta: `${t(
        'components.EnvironmentRuntimeStats.tmpFolderSize'
      )}: ${formatBytes(Number(latest.systemTmpFolderSize || 0))}`,
    },
  ];

  return (
    <DefaultMotionDiv id="runtime-stats-container">
      <h3>{t('components.EnvironmentRuntimeStats.title')}</h3>

      <dl className="runtime-kpi-strip">
        {kpis.map((item) => (
          <div className="runtime-kpi-item" key={item.label}>
            <dt>{item.label}</dt>
            <dd>
              <span className="runtime-kpi-value">{item.value}</span>
              {item.meta && (
                <span className="runtime-kpi-meta">{item.meta}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {chartData.length >= 2 && (
        <Box>
          <h4 className="runtime-chart-title">
            {t('components.EnvironmentRuntimeStats.threadsEvolutionTitle')}
          </h4>
          <div className="runtime-chart-wrapper">
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
                  fill="var(--light-blue)"
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
