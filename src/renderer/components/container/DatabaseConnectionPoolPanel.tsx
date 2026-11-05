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

  const getStatusBadge = (utilization: number) => {
    if (utilization >= 85) {
      return {
        label: t(
          'components.SystemResources.DatabaseConnectionPools.statusCritical'
        ),
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
      };
    }
    if (utilization >= 60) {
      return {
        label: t(
          'components.SystemResources.DatabaseConnectionPools.statusWarning'
        ),
        color: '#eab308',
        bg: 'rgba(234, 179, 8, 0.15)',
        border: 'rgba(234, 179, 8, 0.4)',
      };
    }
    return {
      label: t(
        'components.SystemResources.DatabaseConnectionPools.statusHealthy'
      ),
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
    };
  };

  const status = currentPool ? getStatusBadge(currentPool.utilization) : null;

  return (
    <div
      className="widget-container database-pool-widget"
      style={{
        marginBottom: '2rem',
        borderRadius: '12px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: 'var(--color-primary)' }}>⚡</span>
          {t('components.SystemResources.DatabaseConnectionPools.title')}
        </h3>

        {status && (
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: status.color,
              backgroundColor: status.bg,
              border: `1px solid ${status.border}`,
              letterSpacing: '0.025em',
            }}
          >
            {status.label}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--card-border)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('fluigDs')}
          style={{
            background:
              activeTab === 'fluigDs' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'fluigDs' ? '#ffffff' : 'var(--font-soft)',
            border: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {t('components.SystemResources.DatabaseConnectionPools.fluigDs')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fluigDsRo')}
          style={{
            background:
              activeTab === 'fluigDsRo'
                ? 'var(--color-primary)'
                : 'transparent',
            color: activeTab === 'fluigDsRo' ? '#ffffff' : 'var(--font-soft)',
            border: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {t('components.SystemResources.DatabaseConnectionPools.fluigDsRo')}
        </button>
      </div>

      {currentPool ? (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                marginBottom: '0.4rem',
              }}
            >
              <span style={{ color: 'var(--font-soft)' }}>
                {t(
                  'components.SystemResources.DatabaseConnectionPools.utilization'
                )}
              </span>
              <span style={{ fontWeight: 700, color: status?.color }}>
                {currentPool.activeCount} / {currentPool.maxPoolSize} (
                {currentPool.utilization}%)
              </span>
            </div>
            <div
              style={{
                height: '10px',
                width: '100%',
                borderRadius: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, currentPool.utilization)}%`,
                  backgroundColor: status?.color || 'var(--color-primary)',
                  borderRadius: '5px',
                  transition: 'width 0.5s ease',
                  boxShadow: `0 0 10px ${
                    status?.color || 'var(--color-primary)'
                  }`,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--font-soft)',
                  display: 'block',
                }}
              >
                {t(
                  'components.SystemResources.DatabaseConnectionPools.activeConnections'
                )}
              </span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color:
                    currentPool.activeCount > 0 ? status?.color : 'inherit',
                }}
              >
                {currentPool.activeCount}
              </span>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--font-soft)',
                  display: 'block',
                }}
              >
                {t(
                  'components.SystemResources.DatabaseConnectionPools.availableConnections'
                )}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {currentPool.availableCount}
              </span>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--font-soft)',
                  display: 'block',
                }}
              >
                {t(
                  'components.SystemResources.DatabaseConnectionPools.maxUsedConnections'
                )}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {currentPool.maxUsedCount}
              </span>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--font-soft)',
                  display: 'block',
                }}
              >
                {t(
                  'components.SystemResources.DatabaseConnectionPools.poolLimits'
                )}
              </span>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {currentPool.minPoolSize} / {currentPool.maxPoolSize}
              </span>
            </div>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--font-soft)',
                  display: 'block',
                }}
              >
                {t(
                  'components.SystemResources.DatabaseConnectionPools.createdConnections'
                )}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {currentPool.createdCount}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--font-soft)',
              backgroundColor: 'rgba(56, 189, 248, 0.06)',
              borderLeft: '3px solid #38bdf8',
              padding: '0.5rem 0.75rem',
              borderRadius: '0 6px 6px 0',
              lineHeight: 1.4,
            }}
          >
            {t('components.SystemResources.DatabaseConnectionPools.tip')}
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--font-soft)', fontSize: '0.85rem' }}>
          {t('components.global.noData')}
        </p>
      )}
    </div>
  );
}
