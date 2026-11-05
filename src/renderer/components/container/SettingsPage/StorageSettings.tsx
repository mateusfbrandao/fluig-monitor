import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiCheckCircle,
  FiDatabase,
  FiHardDrive,
  FiLayers,
  FiTrash2,
} from 'react-icons/fi';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';
import formatBytes from '../../../../common/utils/formatBytes';
import {
  DatabaseStats,
  DataRetentionResult,
  getAppSettingsAsObject,
  getDatabaseStats,
  runDataRetentionPrune,
  updateAppSettings,
} from '../../../ipc/settingsIpcHandler';

export default function StorageSettings() {
  const { t } = useTranslation();

  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [pingDays, setPingDays] = useState(7);
  const [statsDays, setStatsDays] = useState(30);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState<DataRetentionResult | null>(
    null
  );

  async function loadData() {
    try {
      const stats = await getDatabaseStats();
      setDbStats(stats);

      const settings = await getAppSettingsAsObject();
      if (settings.DATA_RETENTION_PING_DAYS?.value) {
        setPingDays(Number(settings.DATA_RETENTION_PING_DAYS.value));
      }
      if (settings.DATA_RETENTION_STATS_DAYS?.value) {
        setStatsDays(Number(settings.DATA_RETENTION_STATS_DAYS.value));
      }
    } catch {
      // Ignora falhas pontuais
    }
  }

  function handlePingDaysChange(days: number) {
    setPingDays(days);
    updateAppSettings([
      {
        settingId: 'DATA_RETENTION_PING_DAYS',
        value: String(days),
      },
    ]);
  }

  function handleStatsDaysChange(days: number) {
    setStatsDays(days);
    updateAppSettings([
      {
        settingId: 'DATA_RETENTION_STATS_DAYS',
        value: String(days),
      },
    ]);
  }

  async function handleRunPrune() {
    setIsPruning(true);
    setPruneResult(null);
    try {
      const result = await runDataRetentionPrune();
      setPruneResult(result);
      const updatedStats = await getDatabaseStats();
      setDbStats(updatedStats);
    } finally {
      setIsPruning(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DefaultMotionDiv id="storage-settings">
      <h3 className="icon-title">
        <span className="icon-dot purple-variant">
          <FiDatabase />
        </span>
        {t(
          'components.StorageSettings.title',
          'Armazenamento & Retenção de Dados'
        )}
      </h3>
      <p className="mb-2">
        {t(
          'components.StorageSettings.helperText',
          'Configure o período de retenção do histórico no banco SQLite local para manter a aplicação rápida e leve.'
        )}
      </p>

      {dbStats && (
        <div className="storage-kpis-grid">
          <div className="storage-kpi-card">
            <div className="storage-kpi-icon">
              <FiHardDrive />
            </div>
            <div className="storage-kpi-info">
              <span className="storage-kpi-label">
                {t(
                  'components.StorageSettings.kpis.dbSize',
                  'Tamanho do Banco'
                )}
              </span>
              <span className="storage-kpi-value">
                {formatBytes(dbStats.sizeBytes)}
              </span>
            </div>
          </div>

          <div className="storage-kpi-card">
            <div className="storage-kpi-icon">
              <FiLayers />
            </div>
            <div className="storage-kpi-info">
              <span className="storage-kpi-label">
                {t(
                  'components.StorageSettings.kpis.pingRecords',
                  'Registros de Ping'
                )}
              </span>
              <span className="storage-kpi-value">
                {dbStats.totalPings.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="storage-kpi-card">
            <div className="storage-kpi-icon">
              <FiDatabase />
            </div>
            <div className="storage-kpi-info">
              <span className="storage-kpi-label">
                {t(
                  'components.StorageSettings.kpis.snapshots',
                  'Snapshots de Métricas'
                )}
              </span>
              <span className="storage-kpi-value">
                {dbStats.totalSnapshots.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="storage-retention-controls">
        <div className="storage-control-group">
          <label htmlFor="select-ping-retention">
            {t(
              'components.StorageSettings.pingRetention.label',
              'Histórico de Pings / Latência:'
            )}
          </label>
          <select
            id="select-ping-retention"
            value={pingDays}
            onChange={(e) => handlePingDaysChange(Number(e.target.value))}
            className="storage-select"
          >
            <option value={3}>3 dias</option>
            <option value={7}>7 dias (Recomendado)</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
          <small className="font-soft">
            {t(
              'components.StorageSettings.pingRetention.helper',
              'Registros mais antigos que este intervalo serão expurgados.'
            )}
          </small>
        </div>

        <div className="storage-control-group">
          <label htmlFor="select-stats-retention">
            {t(
              'components.StorageSettings.statsRetention.label',
              'Histórico de Métricas e Licenças:'
            )}
          </label>
          <select
            id="select-stats-retention"
            value={statsDays}
            onChange={(e) => handleStatsDaysChange(Number(e.target.value))}
            className="storage-select"
          >
            <option value={15}>15 dias</option>
            <option value={30}>30 dias (Recomendado)</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <small className="font-soft">
            {t(
              'components.StorageSettings.statsRetention.helper',
              'Estatísticas, threads e consumo de memória consolidados.'
            )}
          </small>
        </div>
      </div>

      <div className="storage-action-row">
        <button
          type="button"
          className="btn-prune-storage"
          onClick={handleRunPrune}
          disabled={isPruning}
        >
          <FiTrash2 className={isPruning ? 'spin-icon' : ''} />
          <span>
            {isPruning
              ? t(
                  'components.StorageSettings.pruningNow',
                  'Limpando histórico antigo...'
                )
              : t(
                  'components.StorageSettings.pruneNow',
                  'Limpar Histórico Antigo Agora'
                )}
          </span>
        </button>

        {pruneResult && (
          <span className="prune-feedback-msg">
            <FiCheckCircle />
            {t(
              'components.StorageSettings.pruneSuccess',
              '{{pings}} pings e {{snapshots}} snapshots limpos com sucesso.',
              {
                pings: pruneResult.deletedPings,
                snapshots: pruneResult.deletedSnapshots,
              }
            )}
          </span>
        )}
      </div>
    </DefaultMotionDiv>
  );
}
