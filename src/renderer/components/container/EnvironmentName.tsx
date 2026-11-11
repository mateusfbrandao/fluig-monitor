import { ipcRenderer } from 'electron';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { useNotifications } from '../../contexts/NotificationsContext';
import { playAlertSound } from '../../utils/audioAlert';
import {
  forceEnvironmentPing,
  forceEnvironmentSync,
  getEnvironmentById,
  openExternalUrl,
} from '../../ipc/environmentsIpcHandler';
import { EnvironmentWithRelatedData } from '../../../common/interfaces/EnvironmentControllerInterface';
import EnvironmentFavoriteButton from '../base/EnvironmentFavoriteButton';
import SmallTag from '../base/SmallTag';

/**
 * Self loading environment name + version component with quick action buttons
 * @since 0.5
 */
export default function EnvironmentName() {
  const { t } = useTranslation();
  const { createShortNotification } = useNotifications();
  const [environment, setEnvironment] =
    useState<EnvironmentWithRelatedData | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    let active = true;

    async function loadEnvironment() {
      const properties = await getEnvironmentById(Number(environmentId), true);
      if (active && properties) {
        setEnvironment(properties);
      }
    }

    const onDataUpdated = () => {
      loadEnvironment();
    };

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, onDataUpdated);
    ipcRenderer.on(`serverPinged_${environmentId}`, onDataUpdated);

    loadEnvironment();

    return () => {
      active = false;
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      ipcRenderer.removeAllListeners(`serverPinged_${environmentId}`);
      setEnvironment(null);
    };
  }, [environmentId]);

  const latestPing = useMemo(() => {
    if (!environment?.httpResponses?.length) return null;
    return environment.httpResponses[0];
  }, [environment]);

  let statusClass: 'online' | 'offline' | 'unknown' = 'unknown';
  if (latestPing) {
    statusClass =
      latestPing.responseTimeMs > 0 && latestPing.statusCode === 200
        ? 'online'
        : 'offline';
  }

  let statusLabel = t('components.EnvironmentHeader.statusUnknown');
  if (statusClass === 'online') {
    statusLabel = t('components.EnvironmentStatusCard.operational');
  } else if (statusClass === 'offline') {
    statusLabel = t('components.EnvironmentStatusCard.unavailable');
  }

  const releaseVersion =
    environment?.release?.match(/\d+(\.\d+)+(-[^\s]+)?/)?.[0] ||
    environment?.release ||
    '';

  async function handlePingNow() {
    if (isPinging || !environment) return;
    setIsPinging(true);
    try {
      const res = await forceEnvironmentPing(Number(environmentId));
      if (res && (res.statusCode === 0 || res.statusCode >= 400)) {
        playAlertSound('critical');
        createShortNotification(
          {
            id: Date.now(),
            type: 'danger',
            message: t('components.EnvironmentHeader.pingUnavailable', {
              name: environment.name,
              detail:
                res.statusMessage ||
                t('components.EnvironmentHeader.connectionRefused'),
            }),
          },
          7000
        );
      } else if (res && res.responseTimeMs > 0) {
        createShortNotification(
          {
            id: Date.now(),
            type: 'success',
            message: t('components.EnvironmentHeader.pingOk', {
              name: environment.name,
              ms: res.responseTimeMs,
            }),
          },
          4000
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      createShortNotification(
        {
          id: Date.now(),
          type: 'danger',
          message: t('components.EnvironmentHeader.pingFailed', {
            detail:
              message || t('components.EnvironmentHeader.serverUnavailable'),
          }),
        },
        7000
      );
    } finally {
      setIsPinging(false);
    }
  }

  async function handleSyncNow() {
    if (isSyncing || !environment) return;
    setIsSyncing(true);
    try {
      await forceEnvironmentSync(Number(environmentId));
      createShortNotification(
        {
          id: Date.now(),
          type: 'success',
          message: t('components.EnvironmentHeader.synced', {
            name: environment.name,
          }),
        },
        4000
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      createShortNotification(
        {
          id: Date.now(),
          type: 'danger',
          message: t('components.EnvironmentHeader.syncFailed', {
            detail: message || t('components.EnvironmentHeader.unknownError'),
          }),
        },
        7000
      );
    } finally {
      setIsSyncing(false);
    }
  }

  if (!environment) {
    return (
      <div className="environment-header-bar is-loading">
        <div className="env-heading">
          <div className="env-title-row">
            <span className="env-status-dot unknown" aria-hidden="true" />
            <h2 className="env-title">…</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="environment-header-bar">
      <div className="env-heading">
        <div className="env-title-row">
          <span
            className={`env-status-dot ${statusClass}`}
            title={statusLabel}
            aria-label={statusLabel}
          />
          <h2 className="env-title">{environment.name}</h2>
          {environment.kind ? <SmallTag kind={environment.kind} /> : null}
          {releaseVersion ? (
            <span className="env-version-chip">
              {t('components.EnvironmentHeader.fluigVersion', {
                version: releaseVersion,
              })}
            </span>
          ) : null}
          {latestPing && latestPing.responseTimeMs > 0 ? (
            <span className="env-latency-chip">
              {latestPing.responseTimeMs} ms
            </span>
          ) : null}
        </div>
        {environment.baseUrl ? (
          <p className="env-subtitle">{environment.baseUrl}</p>
        ) : null}
      </div>

      <div className="header-actions">
        <EnvironmentFavoriteButton
          environmentId={environment.id}
          isFavorite={Boolean(environment.isFavorite)}
        />
        <button
          type="button"
          className="action-btn"
          onClick={handlePingNow}
          disabled={isPinging}
        >
          <FiActivity
            className={isPinging ? 'rotating' : ''}
            aria-hidden="true"
          />
          <span>{t('components.EnvironmentHeader.pingNow')}</span>
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={handleSyncNow}
          disabled={isSyncing}
        >
          <FiRefreshCw
            className={isSyncing ? 'rotating' : ''}
            aria-hidden="true"
          />
          <span>{t('components.EnvironmentHeader.syncNow')}</span>
        </button>
        {environment.baseUrl ? (
          <button
            type="button"
            className="action-btn is-primary"
            onClick={() => openExternalUrl(environment.baseUrl)}
          >
            <FiExternalLink aria-hidden="true" />
            <span>{t('components.EnvironmentHeader.openUrl')}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
