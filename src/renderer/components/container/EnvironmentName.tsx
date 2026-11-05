import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';
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

/**
 * Self loading environment name + version component with quick action buttons
 * @since 0.5
 */
export default function EnvironmentName() {
  const { t } = useTranslation();
  const { createShortNotification } = useNotifications();
  const [environmentName, setEnvironmentName] = useState('');
  const [release, setEnvironmentRelease] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadEnvironmentName() {
      const properties = await getEnvironmentById(Number(environmentId));

      if (properties) {
        setEnvironmentName(properties.name);
        setEnvironmentRelease(properties.release);
        setBaseUrl(properties.baseUrl);
      }
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadEnvironmentName();
    });

    loadEnvironmentName();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setEnvironmentName('');
      setEnvironmentRelease('');
      setBaseUrl('');
    };
  }, [environmentId]);

  async function handlePingNow() {
    if (isPinging) return;
    setIsPinging(true);
    try {
      const res = await forceEnvironmentPing(Number(environmentId));
      if (res && (res.statusCode === 0 || res.statusCode >= 400)) {
        playAlertSound('critical');
        createShortNotification(
          {
            id: Date.now(),
            type: 'danger',
            message: `${t('components.EnvironmentStatusCard.unavailable', 'Indisponível')}: ${environmentName} não respondeu (${res.statusMessage || 'Timeout / Conexão recusada'})`,
          },
          7000
        );
      } else if (res && res.responseTimeMs > 0) {
        createShortNotification(
          {
            id: Date.now(),
            type: 'success',
            message: `${environmentName}: ${t('components.EnvironmentStatusCard.operational', 'Operacional')} (${res.responseTimeMs}ms)`,
          },
          4000
        );
      }
    } catch (err: any) {
      createShortNotification(
        {
          id: Date.now(),
          type: 'danger',
          message: `Falha ao testar conexão: ${err?.message || 'Servidor indisponível'}`,
        },
        7000
      );
    } finally {
      setIsPinging(false);
    }
  }

  async function handleSyncNow() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await forceEnvironmentSync(Number(environmentId));
      createShortNotification(
        {
          id: Date.now(),
          type: 'success',
          message: `${environmentName}: ${t('components.EnvironmentHeader.synced', 'Dados sincronizados com sucesso')}`,
        },
        4000
      );
    } catch (err: any) {
      createShortNotification(
        {
          id: Date.now(),
          type: 'danger',
          message: `Falha na sincronização: ${err?.message || 'Erro desconhecido'}`,
        },
        7000
      );
    } finally {
      setIsSyncing(false);
    }
  }

  const releaseVersion = release?.match(/\d+(\.\d+)+(-[^\s]+)?/)?.[0] || release;

  return (
    <div className="environment-header-bar">
      <h2 className="title">
        {environmentName} {releaseVersion ? <span className="pill">Fluig v{releaseVersion}</span> : null}
      </h2>
      <div className="header-actions">
        <button
          type="button"
          className="action-btn"
          onClick={handlePingNow}
          disabled={isPinging}
        >
          <FiActivity />
          <span>{t('components.EnvironmentHeader.pingNow', 'Ping')}</span>
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={handleSyncNow}
          disabled={isSyncing}
        >
          <FiRefreshCw />
          <span>{t('components.EnvironmentHeader.syncNow', 'Sync')}</span>
        </button>
        {baseUrl && (
          <button
            type="button"
            className="action-btn"
            onClick={() => openExternalUrl(baseUrl)}
          >
            <FiExternalLink />
            <span>{t('components.EnvironmentHeader.openUrl', 'Open')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
