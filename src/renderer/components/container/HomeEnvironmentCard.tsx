import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiSettings } from 'react-icons/fi';
import { ipcRenderer } from 'electron';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTranslation } from 'react-i18next';

import { EnvironmentWithRelatedData } from '../../../common/interfaces/EnvironmentControllerInterface';
import EnvironmentFavoriteButton from '../base/EnvironmentFavoriteButton';
import SmallTag from '../base/SmallTag';
import {
  forceEnvironmentPing,
  getEnvironmentById,
} from '../../ipc/environmentsIpcHandler';
import { formatTimeLocale } from '../../utils/formatDate';

interface Props {
  injectedEnvironment: EnvironmentWithRelatedData;
}

function HomeEnvironmentCard({ injectedEnvironment }: Props) {
  const { t } = useTranslation();
  const [environment, setEnvironment] =
    useState<EnvironmentWithRelatedData>(injectedEnvironment);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    setEnvironment(injectedEnvironment);
  }, [injectedEnvironment]);

  useEffect(() => {
    ipcRenderer.on(`serverPinged_${environment.id}`, async () => {
      setEnvironment(await getEnvironmentById(environment.id, true));
    });

    return () => {
      ipcRenderer.removeAllListeners(`serverPinged_${environment.id}`);
    };
  }, [environment.id]);

  const chartData = useMemo(() => {
    if (!environment || !Array.isArray(environment.httpResponses)) {
      return [];
    }
    return environment.httpResponses.slice().reverse();
  }, [environment]);

  const uptimeBlocks = useMemo(() => {
    return chartData.slice(-28);
  }, [chartData]);

  const uptimePercentage = useMemo(() => {
    if (chartData.length === 0) return null;
    const okCount = chartData.filter(
      (r) => r.responseTimeMs > 0 && r.statusCode === 200
    ).length;
    return Math.round((okCount / chartData.length) * 100);
  }, [chartData]);

  const latestPing =
    chartData.length > 0 ? chartData[chartData.length - 1] : null;
  let statusClass = 'unknown';
  if (latestPing) {
    statusClass =
      latestPing.responseTimeMs > 0 && latestPing.statusCode === 200
        ? 'online'
        : 'offline';
  }

  async function handleQuickPing() {
    if (isPinging) return;
    setIsPinging(true);
    try {
      await forceEnvironmentPing(environment.id);
      setEnvironment(await getEnvironmentById(environment.id, true));
    } finally {
      setIsPinging(false);
    }
  }

  if (!environment) {
    return null;
  }

  const releaseMatch = environment.release
    ? environment.release.match(/\d+(\.\d+)+(-[^\s]+)?/)
    : null;

  return (
    <div className="EnvironmentCard" key={environment.id}>
      <div className="heading">
        <div className="EnvironmentName">
          <Link to={`/environment/${environment.id}/summary`}>
            <div className="title-row">
              <span className={`status-dot ${statusClass}`} />
              <h3>{environment.name}</h3>
            </div>
            <small>{environment.baseUrl}</small>
          </Link>
        </div>
        <div className="actionButtons">
          <button
            type="button"
            onClick={handleQuickPing}
            disabled={isPinging}
            title={t('views.HomeEnvironmentListView.pingNow')}
            aria-label={t('views.HomeEnvironmentListView.pingNow')}
          >
            <FiActivity className={isPinging ? 'rotating' : ''} />
          </button>
          <EnvironmentFavoriteButton
            environmentId={environment.id}
            isFavorite={environment.isFavorite}
          />
          <Link
            to={`/environment/${environment.id}/edit`}
            title={t('views.HomeEnvironmentListView.openSettings')}
            aria-label={t('views.HomeEnvironmentListView.openSettings')}
          >
            <FiSettings />
          </Link>
        </div>
      </div>

      {uptimeBlocks.length > 0 && (
        <div className="card-uptime-strip">
          <div className="uptime-strip-header">
            <span>{t('views.HomeEnvironmentListView.card.uptime')}</span>
            {uptimePercentage !== null && <b>{uptimePercentage}%</b>}
          </div>
          <div className="uptime-bars">
            {uptimeBlocks.map((item) => {
              let barState = 'is-ok';
              if (item.responseTimeMs <= 0 || item.statusCode !== 200) {
                barState = 'is-down';
              } else if (item.responseTimeMs > 800) {
                barState = 'is-slow';
              }
              return (
                <span
                  key={item.id}
                  className={`uptime-bar-segment ${barState}`}
                  title={`${formatTimeLocale(item.timestamp)} - ${
                    item.responseTimeMs
                  }ms`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="graphContainer">
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area
                type="monotone"
                dot={false}
                dataKey="responseTimeMs"
                stroke={
                  latestPing && latestPing.responseTimeMs > 0
                    ? 'var(--purple)'
                    : 'var(--red)'
                }
                fill={
                  latestPing && latestPing.responseTimeMs > 0
                    ? 'var(--light-purple)'
                    : 'var(--light-red)'
                }
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <span className="graph-empty">—</span>
        )}
      </div>

      <div className="footer">
        <div className="card-metrics">
          {environment.release && (
            <span className="metric-pill">
              Fluig v{releaseMatch?.[0] || environment.release}
            </span>
          )}
          {latestPing && (
            <span
              className={`metric-pill ${
                latestPing.responseTimeMs > 0 ? 'is-latency' : 'is-offline'
              }`}
            >
              {latestPing.responseTimeMs > 0
                ? `${latestPing.responseTimeMs} ms`
                : t('views.HomeEnvironmentListView.status.offline')}
            </span>
          )}
        </div>
        <SmallTag kind={environment.kind} expanded />
      </div>
    </div>
  );
}

export default HomeEnvironmentCard;
