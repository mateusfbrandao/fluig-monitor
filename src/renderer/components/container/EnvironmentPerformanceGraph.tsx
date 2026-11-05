import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

import { HTTPResponse } from '../../../common/interfaces/DatabaseModels';
import { getHttpResponsesById } from '../../ipc/environmentsIpcHandler';
import GraphTooltip from '../base/GraphTooltip';
import TimeIndicator from '../base/TimeIndicator';
import { safeDate, formatTimeLocale } from '../../utils/formatDate';

export default function EnvironmentPerformanceGraph() {
  const { t } = useTranslation();

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  const [pings, setPings] = useState<HTTPResponse[]>([]);
  const [timeWindowHours, setTimeWindowHours] = useState<1 | 6 | 24>(24);

  useEffect(() => {
    async function loadGraphData() {
      const allPings = await getHttpResponsesById(Number(environmentId));
      setPings(Array.isArray(allPings) ? allPings.slice().reverse() : []);
    }

    ipcRenderer.on(`serverPinged_${environmentId}`, () => {
      loadGraphData();
    });

    loadGraphData();
    const pollTimer = setInterval(() => {
      loadGraphData();
    }, 15000);

    return () => {
      clearInterval(pollTimer);
      ipcRenderer.removeAllListeners(`serverPinged_${environmentId}`);
      setPings([]);
    };
  }, [environmentId]);

  const displayPings = useMemo(() => {
    if (!pings || pings.length === 0) return [];
    const cutoff = Date.now() - timeWindowHours * 60 * 60 * 1000;
    return pings.filter((p) => {
      const d = safeDate(p.timestamp);
      return d ? d.getTime() >= cutoff : false;
    });
  }, [pings, timeWindowHours]);

  const chartData = useMemo(() => {
    if (displayPings.length === 1) {
      return [displayPings[0], displayPings[0]];
    }
    return displayPings;
  }, [displayPings]);

  const lastPing =
    displayPings.length > 0 ? displayPings[displayPings.length - 1] : null;
  const isLastPingFailed =
    lastPing !== null &&
    (lastPing.responseTimeMs === 0 ||
      lastPing.statusCode === 0 ||
      lastPing.statusCode >= 400);

  return (
    <div className="widget-container">
      <h3 className="title">
        {t('components.EnvironmentPerformanceGraph.title')}
      </h3>
      <div className="widget-card performance-graph-card">
        <div
          id="graph-title-container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ marginBottom: 0 }}>
            {t('components.EnvironmentPerformanceGraph.graphTitle')}
            <small
              className="font-soft font-sm"
              style={{ marginLeft: '0.5rem' }}
            >
              ({timeWindowHours}h)
            </small>
          </h3>
          <div
            className="time-range-selector"
            role="group"
            aria-label={
              t('components.EnvironmentPerformanceGraph.timeWindow') ||
              'Intervalo de tempo'
            }
          >
            {([1, 6, 24] as const).map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={timeWindowHours === hrs ? 'active' : ''}
                onClick={() => setTimeWindowHours(hrs)}
                aria-pressed={timeWindowHours === hrs}
              >
                {hrs}h
              </button>
            ))}
          </div>
        </div>

        {displayPings.length === 0 ? (
          <div
            style={{
              height: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary, #64748b)',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
              {t('components.EnvironmentPerformanceGraph.noDataInPeriod', {
                defaultValue: `Nenhuma medição registrada nas últimas ${timeWindowHours}h.`,
                hours: timeWindowHours,
              })}
            </p>
            <small style={{ marginTop: '0.5rem', opacity: 0.8 }}>
              {t('components.EnvironmentPerformanceGraph.noDataHint', {
                defaultValue:
                  'Clique no botão "Ping" para testar agora ou selecione 6h / 24h acima.',
              })}
            </small>
          </div>
        ) : (
          <div className="performance-chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(el: any) => formatTimeLocale(el)}
                  interval="preserveEnd"
                />
                <YAxis
                  allowDecimals={false}
                  dataKey="responseTimeMs"
                  type="number"
                  domain={[
                    0,
                    (dataMax: number) =>
                      Math.max(100, Math.ceil(dataMax / 250) * 250),
                  ]}
                  tickCount={6}
                />
                <Tooltip
                  content={(content) => {
                    return <GraphTooltip content={content} unit="ms" />;
                  }}
                />
                <Area
                  type={chartData.length <= 200 ? 'monotone' : 'linear'}
                  dataKey="responseTimeMs"
                  dot={
                    displayPings.length <= 1
                      ? {
                          r: 5,
                          fill: isLastPingFailed
                            ? 'var(--red)'
                            : 'var(--purple)',
                        }
                      : false
                  }
                  stroke={isLastPingFailed ? 'var(--red)' : 'var(--purple)'}
                  strokeWidth={2}
                  fill={
                    isLastPingFailed
                      ? 'var(--light-red)'
                      : 'var(--light-purple)'
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {lastPing && <TimeIndicator date={lastPing.timestamp} noMargin />}
      </div>
    </div>
  );
}
