import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ipcRenderer } from 'electron';
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
} from 'recharts';
import { useTranslation } from 'react-i18next';

import GraphTooltip from '../base/GraphTooltip';
import { DbStatistic } from '../../../common/interfaces/DatabaseModels';
import formatBytes from '../../../common/utils/formatBytes';
import { getDatabaseStatisticsHistory } from '../../ipc/environmentsIpcHandler';
import { formatDateTimeLocale } from '../../utils/formatDate';

export interface NormalizedDbStatistic {
  dbTrafficReceived: number;
  dbTrafficSent: number;
  dbSize: number;
  timestamp: number;
}

/**
 * Database size evolution graph.
 * @since 0.5
 */
export default function DatabaseStorageGraph() {
  const [dbStatistics, setDbStatistics] = useState([] as DbStatistic[]);
  const [graph, setGraph] = useState(<></>);
  const { t } = useTranslation();

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  let normalizedDbStatistics = [];

  useEffect(() => {
    async function loadGraphData() {
      const data = await getDatabaseStatisticsHistory(Number(environmentId));
      setDbStatistics(Array.isArray(data) ? data : []);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadGraphData();
    });

    loadGraphData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setDbStatistics([]);
    };
  }, [environmentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    normalizedDbStatistics = [];

    const stats = Array.isArray(dbStatistics) ? dbStatistics : [];

    if (stats.length > 0) {
      for (let i = 0; i < stats.length; i += 1) {
        normalizedDbStatistics.push({
          dbTrafficReceived: Number(stats[i].dbTraficRecieved || 0),
          dbTrafficSent: Number(stats[i].dbTraficSent || 0),
          dbSize: Number(stats[i].dbSize || 0),
          timestamp: stats[i].httpResponse?.timestamp || Date.now(),
        });
      }
    }

    setGraph(
      stats.length === 0 ? (
        <p>
          {t('components.EnvironmentPerformanceGraph.insufficientOrNoData')}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="92%">
          <AreaChart data={normalizedDbStatistics.reverse()}>
            <CartesianGrid strokeDasharray="3" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(el) =>
                `    ${formatDateTimeLocale(el)}      `
              }
              interval="preserveEnd"
            />
            <YAxis
              allowDecimals={false}
              dataKey="dbSize"
              type="number"
              domain={[0, (dataMax: number) => Math.ceil(dataMax) * 1.2]}
              tickFormatter={(el) => formatBytes(el)}
              width={80}
            />
            <Tooltip
              content={(content) => {
                return <GraphTooltip content={content} unit="bytes" />;
              }}
            />
            <Area
              type="monotone"
              dataKey="dbSize"
              dot={false}
              stroke="var(--purple)"
              strokeWidth={2}
              fill="var(--light-purple)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    );
  }, [dbStatistics, t]);

  return (
    <div className="widget-container">
      <h3 className="title">{t('components.DatabaseEvolutionGraph.title')}</h3>
      <div className="card" style={{ height: '30vh' }}>
        <h3 className="title">
          {t('components.DatabaseEvolutionGraph.graphTitle')}
        </h3>
        {graph}
      </div>
    </div>
  );
}
