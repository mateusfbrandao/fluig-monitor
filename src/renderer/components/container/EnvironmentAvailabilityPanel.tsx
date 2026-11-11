import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiActivity, FiWifi, FiWifiOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ipcRenderer } from 'electron';

import {
  getHttpResponsesById,
  getLastHttpResponseById,
} from '../../ipc/environmentsIpcHandler';
import { HTTPResponse } from '../../../common/interfaces/DatabaseModels';

import '../../assets/styles/components/EnvironmentAvailabilityPanel.scss';
import TimeIndicator from '../base/TimeIndicator';
import { formatTimeLocale } from '../../utils/formatDate';
import { playAlertSound } from '../../utils/audioAlert';

/**
 * Self loading environment availability panel with StatusPage-style Uptime Heatmap.
 * @since 0.5
 */
export default function EnvironmentAvailabilityPanel() {
  const { t } = useTranslation();

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];
  const [lastHttpResponse, setLastHttpResponse] = useState<HTTPResponse | null>(
    null
  );
  const [recentPings, setRecentPings] = useState<HTTPResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [latest, history] = await Promise.all([
          getLastHttpResponseById(Number(environmentId)),
          getHttpResponsesById(Number(environmentId)),
        ]);
        setLastHttpResponse(latest);
        setRecentPings(
          Array.isArray(history) ? history.slice(0, 36).reverse() : []
        );
        if (latest && (latest.statusCode === 0 || latest.statusCode >= 500)) {
          playAlertSound('critical');
        }
      } finally {
        setIsLoading(false);
      }
    }

    ipcRenderer.on(`serverPinged_${environmentId}`, () => {
      loadData();
    });

    loadData();
    const pollTimer = setInterval(() => {
      loadData();
    }, 15000);

    return () => {
      clearInterval(pollTimer);
      ipcRenderer.removeAllListeners(`serverPinged_${environmentId}`);
      setLastHttpResponse(null);
      setRecentPings([]);
      setIsLoading(true);
    };
  }, [environmentId]);

  const uptimePct = useMemo(() => {
    if (recentPings.length === 0) return null;
    const ok = recentPings.filter(
      (p) => p.responseTimeMs > 0 && p.statusCode === 200
    ).length;
    return Math.round((ok / recentPings.length) * 100);
  }, [recentPings]);

  let statusTitle = t('components.EnvironmentStatusCard.unavailable');
  let statusSubtitle = t('components.EnvironmentStatusCard.mayBeOffline');
  let statusColorClass = 'text-red';
  let badgeClass = 'has-danger';
  let statusIcon = <FiWifiOff aria-hidden="true" />;

  if (isLoading && lastHttpResponse === null) {
    statusTitle = t('components.EnvironmentStatusCard.checking');
    statusSubtitle = t('components.EnvironmentStatusCard.checkingHelper');
    statusColorClass = 'text-secondary';
    badgeClass = 'is-loading';
    statusIcon = <FiActivity aria-hidden="true" />;
  } else if (lastHttpResponse && lastHttpResponse.statusCode !== 0) {
    if (lastHttpResponse.statusCode >= 500) {
      statusTitle = t('components.EnvironmentStatusCard.serviceDown');
      statusSubtitle = t(
        'components.EnvironmentStatusCard.serverError'
      ).replace('%http%', String(lastHttpResponse.statusCode));
      statusColorClass = 'text-red';
      badgeClass = 'has-danger';
      statusIcon = <FiWifiOff aria-hidden="true" />;
    } else if (lastHttpResponse.statusCode >= 400) {
      statusTitle = t('components.EnvironmentStatusCard.attention');
      statusSubtitle = t(
        'components.EnvironmentStatusCard.noSatisfactoryResponse'
      ).replace('%http%', String(lastHttpResponse.statusCode));
      statusColorClass = 'text-yellow';
      badgeClass = 'has-warning';
      statusIcon = <FiWifi aria-hidden="true" />;
    } else if (lastHttpResponse.responseTimeMs > 1000) {
      statusTitle = t('components.EnvironmentStatusCard.attention');
      statusSubtitle = t('components.EnvironmentStatusCard.highResponseTime');
      statusColorClass = 'text-yellow';
      badgeClass = 'has-warning';
      statusIcon = <FiWifi aria-hidden="true" />;
    } else if (lastHttpResponse.statusCode === 200) {
      statusTitle = t('components.EnvironmentStatusCard.operational');
      statusSubtitle = t('components.EnvironmentStatusCard.operatingCorrectly');
      statusColorClass = 'text-green';
      badgeClass = 'breathe';
      statusIcon = <FiWifi aria-hidden="true" />;
    } else {
      statusTitle = t('components.EnvironmentStatusCard.attention');
      statusSubtitle = t(
        'components.EnvironmentStatusCard.noSatisfactoryResponse'
      ).replace('%http%', String(lastHttpResponse.statusCode));
      statusColorClass = 'text-yellow';
      badgeClass = 'has-warning';
      statusIcon = <FiWifi aria-hidden="true" />;
    }
  }

  let footerContent = <p>{t('components.global.noData')}</p>;
  if (isLoading && lastHttpResponse === null) {
    footerContent = (
      <span className="mono-latency">
        {t('components.EnvironmentStatusCard.checkingHelper')}
      </span>
    );
  } else if (lastHttpResponse !== null) {
    const detail =
      lastHttpResponse.statusCode === 200
        ? t('components.EnvironmentStatusCard.responseTime').replace(
            '%responseTime%',
            String(lastHttpResponse.responseTimeMs)
          )
        : lastHttpResponse.statusMessage ||
          t('components.EnvironmentStatusCard.httpFallback', {
            http: lastHttpResponse.statusCode,
          });

    footerContent = (
      <div className="status-footer-row">
        <span
          className={
            lastHttpResponse.statusCode === 200 ? 'mono-latency' : 'text-red'
          }
        >
          {detail}
        </span>
        <TimeIndicator date={lastHttpResponse.timestamp} noMargin />
      </div>
    );
  }

  return (
    <div className="card environment-status-card">
      <div className="header">
        <div className="header-left">
          <div className="icon-dot neutral-variant">
            <FiActivity aria-hidden="true" />
          </div>
          <span className="panel-title">
            {t('components.EnvironmentStatusCard.title')}
          </span>
        </div>
        {uptimePct !== null && (
          <span className="uptime-pill-badge">
            {t('components.EnvironmentStatusCard.uptimePct', {
              pct: uptimePct,
            })}
          </span>
        )}
      </div>

      <div className="body">
        <div className="status-message">
          <h3 className={statusColorClass}>{statusTitle}</h3>
          <span className="status-subtitle">{statusSubtitle}</span>
        </div>
        <div className={`status-icon ${badgeClass}`}>{statusIcon}</div>
      </div>

      {recentPings.length > 0 && (
        <div
          className="status-heatmap-strip"
          role="region"
          aria-label={t('components.EnvironmentStatusCard.uptimeStripAria')}
        >
          {recentPings.map((ping) => {
            let segmentClass = 'is-ok';
            let statusLabel = t(
              'components.EnvironmentStatusCard.segmentOperational'
            );
            if (ping.responseTimeMs <= 0 || ping.statusCode !== 200) {
              segmentClass = 'is-down';
              statusLabel = t('components.EnvironmentStatusCard.segmentDown');
            } else if (ping.responseTimeMs > 800) {
              segmentClass = 'is-slow';
              statusLabel = t('components.EnvironmentStatusCard.segmentSlow');
            }
            const timeLabel = formatTimeLocale(ping.timestamp);
            const latencyLabel =
              ping.responseTimeMs > 0
                ? `${ping.responseTimeMs}ms`
                : t('components.EnvironmentStatusCard.timeout');
            return (
              <span
                key={ping.id}
                className={`heatmap-segment ${segmentClass}`}
                role="img"
                aria-label={`${timeLabel} - ${statusLabel} (${latencyLabel})`}
                title={`${timeLabel} · ${statusLabel} (${latencyLabel})`}
              />
            );
          })}
        </div>
      )}

      <div className="footer">{footerContent}</div>
    </div>
  );
}
