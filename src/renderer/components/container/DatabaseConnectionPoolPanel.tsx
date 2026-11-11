import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';

import { getDatabaseProperties } from '../../ipc/environmentsIpcHandler';
import { DatabaseProperties } from '../../../common/interfaces/DatabaseModels';

interface PoolMetrics {
  maxPoolSize: number;
  minPoolSize: number;
  activeCount: number;
  createdCount: number;
  maxUsedCount: number;
  availableCount: number;
  utilization: number;
}

function parsePool(raw: string | null | undefined): PoolMetrics | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    const maxPoolSize = Number(data['max-pool-size'] || 0);
    const minPoolSize = Number(data['min-pool-size'] || 0);
    const activeCount = Number(data['active-count'] || 0);
    const createdCount = Number(data['created-count'] || 0);
    const maxUsedCount = Number(data['max-used-count'] || 0);
    const availableCount = Number(data['available-count'] || 0);

    const utilization =
      maxPoolSize > 0
        ? Math.min(100, Math.round((activeCount / maxPoolSize) * 100))
        : 0;

    return {
      maxPoolSize,
      minPoolSize,
      activeCount,
      createdCount,
      maxUsedCount,
      availableCount,
      utilization,
    };
  } catch {
    return null;
  }
}

function poolTone(utilization: number): 'ok' | 'warn' | 'critical' {
  if (utilization >= 85) return 'critical';
  if (utilization >= 60) return 'warn';
  return 'ok';
}

export default function DatabaseConnectionPoolPanel() {
  const { t } = useTranslation();
  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  const [dbProps, setDbProps] = useState<DatabaseProperties | null>(null);
  const [activeTab, setActiveTab] = useState<'fluigDs' | 'fluigDsRo'>(
    'fluigDs'
  );

  useEffect(() => {
    async function loadProperties() {
      if (!environmentId) return;
      const result = await getDatabaseProperties(Number(environmentId));
      setDbProps(result);
    }

    loadProperties();

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadProperties();
    });

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
    };
  }, [environmentId]);

  const fluigDs = parsePool(dbProps?.dataSourceFluigDs);
  const fluigDsRo = parsePool(dbProps?.dataSourceFluigDsRo);
  const currentPool = activeTab === 'fluigDs' ? fluigDs : fluigDsRo;

  if (!fluigDs && !fluigDsRo) {
    return null;
  }

  const tone = currentPool ? poolTone(currentPool.utilization) : 'ok';
  let statusLabel = t(
    'components.SystemResources.DatabaseConnectionPools.statusHealthy'
  );
  if (tone === 'critical') {
    statusLabel = t(
      'components.SystemResources.DatabaseConnectionPools.statusCritical'
    );
  } else if (tone === 'warn') {
    statusLabel = t(
      'components.SystemResources.DatabaseConnectionPools.statusWarning'
    );
  }

  const metrics = currentPool
    ? [
        {
          label: t(
            'components.SystemResources.DatabaseConnectionPools.activeConnections'
          ),
          value: String(currentPool.activeCount),
          emphasize: currentPool.activeCount > 0,
        },
        {
          label: t(
            'components.SystemResources.DatabaseConnectionPools.availableConnections'
          ),
          value: String(currentPool.availableCount),
        },
        {
          label: t(
            'components.SystemResources.DatabaseConnectionPools.maxUsedConnections'
          ),
          value: String(currentPool.maxUsedCount),
        },
        {
          label: t(
            'components.SystemResources.DatabaseConnectionPools.poolLimits'
          ),
          value: `${currentPool.minPoolSize} / ${currentPool.maxPoolSize}`,
        },
        {
          label: t(
            'components.SystemResources.DatabaseConnectionPools.createdConnections'
          ),
          value: String(currentPool.createdCount),
        },
      ]
    : [];

  return (
    <div className="widget-container database-pool-widget">
      <div className="pool-header">
        <h3 className="title">
          {t('components.SystemResources.DatabaseConnectionPools.title')}
        </h3>
        {currentPool && (
          <span className={`pool-status-badge is-${tone}`}>{statusLabel}</span>
        )}
      </div>

      <div className="pool-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'fluigDs'}
          className={activeTab === 'fluigDs' ? 'active' : ''}
          onClick={() => setActiveTab('fluigDs')}
        >
          {t('components.SystemResources.DatabaseConnectionPools.fluigDs')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'fluigDsRo'}
          className={activeTab === 'fluigDsRo' ? 'active' : ''}
          onClick={() => setActiveTab('fluigDsRo')}
        >
          {t('components.SystemResources.DatabaseConnectionPools.fluigDsRo')}
        </button>
      </div>

      {currentPool ? (
        <>
          <div className="pool-utilization">
            <div className="pool-utilization-head">
              <span>
                {t(
                  'components.SystemResources.DatabaseConnectionPools.utilization'
                )}
              </span>
              <strong className={`is-${tone}`}>
                {currentPool.activeCount} / {currentPool.maxPoolSize} (
                {currentPool.utilization}%)
              </strong>
            </div>
            <div className="pool-progress-track">
              <div
                className={`pool-progress-fill is-${tone}`}
                style={{
                  width: `${Math.max(2, currentPool.utilization)}%`,
                }}
              />
            </div>
          </div>

          <dl className="pool-spec">
            {metrics.map((item) => (
              <div className="pool-spec-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd className={item.emphasize ? `is-${tone}` : undefined}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="pool-tip">
            {t('components.SystemResources.DatabaseConnectionPools.tip')}
          </p>
        </>
      ) : (
        <p className="pool-empty">{t('components.global.noData')}</p>
      )}
    </div>
  );
}
