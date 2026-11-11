/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';

import Box from '../base/Box';
import DefaultMotionDiv from '../base/DefaultMotionDiv';
import SpinnerLoader from '../base/Loaders/Spinner';
import TimeIndicator from '../base/TimeIndicator';
import { getArtifactsById } from '../../ipc/environmentsIpcHandler';
import { EnvironmentArtifactsData } from '../../../common/interfaces/EnvironmentControllerInterface';

type ArtifactCategory = 'apps' | 'core' | 'system';

function parseArtifactMap(
  rawJson: string | null,
  unknownLabel: string
): [string, string][] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const name = item.name || item.artifact || item.id || unknownLabel;
          const detail =
            item.md5 || item.signature || item.version || JSON.stringify(item);
          return [String(name), String(detail)];
        }
        return [String(item), ''];
      });
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          const obj = v as Record<string, unknown>;
          return [k, obj.md5 ? String(obj.md5) : JSON.stringify(v)];
        }
        return [k, String(v)];
      });
    }
    return [];
  } catch {
    return [];
  }
}

function EnvironmentArtifactsContainer() {
  const { t } = useTranslation();
  const location = useLocation();
  const environmentId = Number(location.pathname.split('/')[2]);

  const [artifactsData, setArtifactsData] =
    useState<EnvironmentArtifactsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ArtifactCategory>('apps');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!environmentId) return;
      const result = await getArtifactsById(environmentId);
      setArtifactsData(result);
      setLoading(false);
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadData();
    });

    loadData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
    };
  }, [environmentId]);

  const latest = artifactsData?.statisticHistory?.[0];

  const items = useMemo(() => {
    if (!latest) return [];
    let sourceJson: string | null = latest.artifactsApps;
    if (category === 'core') sourceJson = latest.artifactsCore;
    if (category === 'system') sourceJson = latest.artifactsSystem;

    const entries = parseArtifactMap(
      sourceJson,
      t('components.EnvironmentArtifacts.unknown')
    );
    if (!searchQuery.trim()) return entries;
    const lower = searchQuery.toLowerCase();
    return entries.filter(
      ([name, val]) =>
        name.toLowerCase().includes(lower) || val.toLowerCase().includes(lower)
    );
  }, [latest, category, searchQuery, t]);

  if (loading) {
    return <SpinnerLoader />;
  }

  if (!latest) {
    return (
      <DefaultMotionDiv id="environment-artifacts-container">
        <h3>{t('components.EnvironmentArtifacts.title')}</h3>
        <Box>
          <span>{t('components.global.noData')}</span>
        </Box>
      </DefaultMotionDiv>
    );
  }

  return (
    <DefaultMotionDiv id="environment-artifacts-container">
      <h3>{t('components.EnvironmentArtifacts.title')}</h3>

      <div className="data-table-card artifacts-panel">
        <div className="table-toolbar">
          <div className="time-range-selector" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={category === 'apps'}
              className={category === 'apps' ? 'active' : ''}
              onClick={() => setCategory('apps')}
            >
              {t('components.EnvironmentArtifacts.appsDir')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={category === 'core'}
              className={category === 'core' ? 'active' : ''}
              onClick={() => setCategory('core')}
            >
              {t('components.EnvironmentArtifacts.coreDir')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={category === 'system'}
              className={category === 'system' ? 'active' : ''}
              onClick={() => setCategory('system')}
            >
              {t('components.EnvironmentArtifacts.systemDir')}
            </button>
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('components.EnvironmentArtifacts.searchPlaceholder')}
            aria-label={t('components.EnvironmentArtifacts.searchPlaceholder')}
          />
        </div>

        <p className="artifacts-count">
          {t('components.EnvironmentArtifacts.totalCount')}:{' '}
          <strong>{items.length}</strong>
        </p>

        <div className="artifacts-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('components.EnvironmentArtifacts.artifactName')}</th>
                <th>{t('components.EnvironmentArtifacts.artifactDetails')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={2} className="artifacts-empty">
                    {t('components.EnvironmentArtifacts.noResults')}
                  </td>
                </tr>
              ) : (
                items.map(([name, detail]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="mono-cell">{detail || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="artifacts-footer">
          <TimeIndicator date={latest.httpResponse.timestamp} noMargin />
        </div>
      </div>
    </DefaultMotionDiv>
  );
}

export default EnvironmentArtifactsContainer;
