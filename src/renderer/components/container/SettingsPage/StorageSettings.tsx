import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiDatabase, FiTrash2 } from 'react-icons/fi';
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
      if (settings?.DATA_RETENTION_PING_DAYS?.value) {
        setPingDays(Number(settings.DATA_RETENTION_PING_DAYS.value));
      }
      if (settings?.DATA_RETENTION_STATS_DAYS?.value) {
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

  const kpis = [
    {
      label: t('components.StorageSettings.kpis.dbSize'),
      value: dbStats ? formatBytes(dbStats.sizeBytes) : '—',
    },
    {
      label: t('components.StorageSettings.kpis.pingRecords'),
      value: dbStats ? dbStats.totalPings.toLocaleString() : '—',
    },
    {
      label: t('components.StorageSettings.kpis.snapshots'),
      value: dbStats ? dbStats.totalSnapshots.toLocaleString() : '—',
    },
  ];

  return (
    <DefaultMotionDiv id="storage-settings">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiDatabase />
        </span>
        {t('components.StorageSettings.title')}
      </h3>
      <p className="settings-section-helper">
        {t('components.StorageSettings.helperText')}
      </p>

      <dl className="storage-spec">
        {kpis.map((item) => (
          <div className="storage-spec-item" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="storage-retention-controls">
        <div className="storage-control-group">
          <label htmlFor="select-ping-retention">
            {t('components.StorageSettings.pingRetention.label')}
          </label>
          <select
            id="select-ping-retention"
            value={pingDays}
            onChange={(e) => handlePingDaysChange(Number(e.target.value))}
            className="storage-select"
          >
            <option value={3}>
              {t('components.StorageSettings.pingRetention.options.days3')}
            </option>
            <option value={7}>
              {t(
                'components.StorageSettings.pingRetention.options.days7Recommended'
              )}
            </option>
            <option value={14}>
              {t('components.StorageSettings.pingRetention.options.days14')}
            </option>
            <option value={30}>
              {t('components.StorageSettings.pingRetention.options.days30')}
            </option>
          </select>
          <small className="font-soft">
            {t('components.StorageSettings.pingRetention.helper')}
          </small>
        </div>

        <div className="storage-control-group">
          <label htmlFor="select-stats-retention">
            {t('components.StorageSettings.statsRetention.label')}
          </label>
          <select
            id="select-stats-retention"
            value={statsDays}
            onChange={(e) => handleStatsDaysChange(Number(e.target.value))}
            className="storage-select"
          >
            <option value={15}>
              {t('components.StorageSettings.statsRetention.options.days15')}
            </option>
            <option value={30}>
              {t(
                'components.StorageSettings.statsRetention.options.days30Recommended'
              )}
            </option>
            <option value={60}>
              {t('components.StorageSettings.statsRetention.options.days60')}
            </option>
            <option value={90}>
              {t('components.StorageSettings.statsRetention.options.days90')}
            </option>
          </select>
          <small className="font-soft">
            {t('components.StorageSettings.statsRetention.helper')}
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
          <FiTrash2
            className={isPruning ? 'spin-icon' : ''}
            aria-hidden="true"
          />
          <span>
            {isPruning
              ? t('components.StorageSettings.pruningNow')
              : t('components.StorageSettings.pruneNow')}
          </span>
        </button>

        {pruneResult && (
          <span className="prune-feedback-msg">
            <FiCheckCircle aria-hidden="true" />
            {t('components.StorageSettings.pruneSuccess', {
              pings: pruneResult.deletedPings,
              snapshots: pruneResult.deletedSnapshots,
            })}
          </span>
        )}
      </div>
    </DefaultMotionDiv>
  );
}
