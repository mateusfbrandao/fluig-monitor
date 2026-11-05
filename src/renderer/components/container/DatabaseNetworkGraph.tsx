import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import {
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DatabaseTraffic } from '../../../common/interfaces/DatabaseModels';
import { getDatabaseStatisticsHistory } from '../../ipc/environmentsIpcHandler';
import GraphTooltip from '../base/GraphTooltip';
import formatBytes from '../../../common/utils/formatBytes';
import { formatDateTimeLocale } from '../../utils/formatDate';

interface Props {
  mode: 'INBOUND' | 'OUTBOUND' | 'MIXED';
}

/**
 * Database network graph. Can display inbound, outbound, or both data graphs;
 * @since 0.5
 */
export default function DatabaseNetworkGraph({ mode }: Props) {
  const [dbTraffic, setDbTraffic] = useState([] as DatabaseTraffic[]);
  const { t } = useTranslation();

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadGraphData() {
      const data = await getDatabaseStatisticsHistory(Number(environmentId));
      setDbTraffic(Array.isArray(data) ? data : []);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadGraphData();
    });

    loadGraphData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setDbTraffic([]);
    };
  }, [environmentId]);

  const modeTitle = useMemo(() => {
    switch (mode) {
      case 'INBOUND':
        return t('components.DatabaseNetWorkGraph.graphTitleInbound');
      case 'OUTBOUND':
        return t('components.DatabaseNetWorkGraph.graphTitleOutbound');
      case 'MIXED':
      default:
        return t('components.DatabaseNetWorkGraph.graphTitleMixed');
    }
  }, [mode, t]);

  const normalizedData = useMemo(() => {
    const traffic = Array.isArray(dbTraffic) ? dbTraffic : [];
    if (traffic.length === 0) return [];

    return traffic.map((item) => ({
      dbTrafficReceived: Number(item.dbTraficRecieved || 0),
      dbTrafficSent: Number(item.dbTraficSent || 0),
      timestamp: item.httpResponse?.timestamp || Date.now(),
    }));
  }, [dbTraffic]);

  const isNotAllowed =
    normalizedData.length > 0 &&
    (normalizedData[0].dbTrafficSent === -1 ||
      normalizedData[0].dbTrafficReceived === -1);

  const hasData = normalizedData.length > 0 && !isNotAllowed;

  return (
    <div className="widget-container">
      <h3 className="title">{modeTitle}</h3>
      {normalizedData.length === 0 ? (
        <div className="card">
          <p>{t('components.DatabaseNetWorkGraph.insufficientOrNoData')}</p>
        </div>
      ) : isNotAllowed ? (
        <div className="card">
          <p>{t('components.DatabaseNetWorkGraph.dataNotAllowed')}</p>
        </div>
      ) : hasData ? (
        <div className="card" style={{ height: '30vh' }}>
          <ResponsiveContainer width="100%" height="92%">
            <AreaChart data={normalizedData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(el) => `    ${formatDateTimeLocale(el)}      `}
                interval="preserveEnd"
              />
              <YAxis
                allowDecimals={false}
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
              {(mode === 'OUTBOUND' || mode === 'MIXED') && (
                <Area
                  type="monotone"
                  dataKey="dbTrafficSent"
                  dot={false}
                  stroke="var(--green)"
                  fill="var(--light-green)"
                  strokeWidth={2}
                />
              )}
              {(mode === 'INBOUND' || mode === 'MIXED') && (
                <Area
                  type="monotone"
                  dataKey="dbTrafficReceived"
                  dot={false}
                  stroke="var(--yellow)"
                  fill="var(--light-yellow)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
