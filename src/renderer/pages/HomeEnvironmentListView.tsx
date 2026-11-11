/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiGrid,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiServer,
  FiSettings,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { useEnvironmentList } from '../contexts/EnvironmentListContext';
import HomeEnvironmentCard from '../components/container/HomeEnvironmentCard';
import SmallTag from '../components/base/SmallTag';
import {
  forceEnvironmentPing,
  forceEnvironmentSync,
} from '../ipc/environmentsIpcHandler';

import '../assets/styles/pages/HomeEnvironmentListView.scss';
import DefaultMotionDiv from '../components/base/DefaultMotionDiv';

type FilterKind = 'ALL' | 'PROD' | 'HML' | 'DEV' | 'FAV';
type ViewMode = 'GRID' | 'TABLE';

export default function HomeEnvironmentListView() {
  const { environmentList, updateEnvironmentList } = useEnvironmentList();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    updateEnvironmentList();
  }, []);

  const globalMetrics = useMemo(() => {
    const total = environmentList.length;
    let onlineCount = 0;
    let latencySum = 0;
    let latencyCount = 0;
    let maxLatency = 0;
    let prodCount = 0;
    let hmlCount = 0;
    let devCount = 0;

    environmentList.forEach((env) => {
      if (env.kind === 'PROD') prodCount += 1;
      if (env.kind === 'HML') hmlCount += 1;
      if (env.kind === 'DEV') devCount += 1;

      const latest = env.httpResponses?.[0];
      if (latest && latest.responseTimeMs > 0 && latest.statusCode === 200) {
        onlineCount += 1;
        latencySum += latest.responseTimeMs;
        latencyCount += 1;
        if (latest.responseTimeMs > maxLatency) {
          maxLatency = latest.responseTimeMs;
        }
      }
    });

    const avgLatency =
      latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0;
    const availabilityPct =
      total > 0 ? Math.round((onlineCount / total) * 100) : 0;

    return {
      total,
      onlineCount,
      offlineCount: total - onlineCount,
      avgLatency,
      maxLatency,
      availabilityPct,
      prodCount,
      hmlCount,
      devCount,
    };
  }, [environmentList]);

  const filteredEnvironments = useMemo(() => {
    return environmentList.filter((env) => {
      if (filterKind === 'FAV' && !env.isFavorite) return false;
      if (
        filterKind !== 'ALL' &&
        filterKind !== 'FAV' &&
        env.kind !== filterKind
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        env.name.toLowerCase().includes(q) ||
        env.baseUrl.toLowerCase().includes(q) ||
        (env.release && env.release.toLowerCase().includes(q))
      );
    });
  }, [environmentList, filterKind, searchQuery]);

  async function handleGlobalRefresh() {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      await Promise.allSettled([
        forceEnvironmentPing(),
        forceEnvironmentSync(),
      ]);
      await updateEnvironmentList();
    } finally {
      setIsSyncingAll(false);
    }
  }

  let subtitle = t('views.HomeEnvironmentListView.subtitleEmpty');
  if (environmentList.length > 0) {
    subtitle =
      globalMetrics.offlineCount === 0
        ? t('views.HomeEnvironmentListView.subtitleAllOnline', {
            count: globalMetrics.total,
          })
        : t('views.HomeEnvironmentListView.subtitleWithOffline', {
            online: globalMetrics.onlineCount,
            total: globalMetrics.total,
            offline: globalMetrics.offlineCount,
          });
  }

  const kpis = [
    {
      label: t('views.HomeEnvironmentListView.kpis.status'),
      value: `${globalMetrics.onlineCount}/${globalMetrics.total}`,
      meta:
        globalMetrics.total > 0
          ? t('views.HomeEnvironmentListView.kpis.onlinePct', {
              pct: globalMetrics.availabilityPct,
            })
          : null,
      metaTone: globalMetrics.offlineCount === 0 ? 'ok' : 'warn',
    },
    {
      label: t('views.HomeEnvironmentListView.kpis.avgLatency'),
      value: globalMetrics.avgLatency > 0 ? `${globalMetrics.avgLatency}` : '—',
      unit: globalMetrics.avgLatency > 0 ? 'ms' : null,
    },
    {
      label: t('views.HomeEnvironmentListView.kpis.peakLatency'),
      value: globalMetrics.maxLatency > 0 ? `${globalMetrics.maxLatency}` : '—',
      unit: globalMetrics.maxLatency > 0 ? 'ms' : null,
    },
    {
      label: t('views.HomeEnvironmentListView.kpis.distribution'),
      value: `PRD ${globalMetrics.prodCount} · HML ${globalMetrics.hmlCount} · DEV ${globalMetrics.devCount}`,
    },
  ];

  const filterOptions: { id: FilterKind; label: string }[] = [
    { id: 'ALL', label: t('views.HomeEnvironmentListView.filters.all') },
    { id: 'PROD', label: 'PROD' },
    { id: 'HML', label: 'HML' },
    { id: 'DEV', label: 'DEV' },
    { id: 'FAV', label: t('views.HomeEnvironmentListView.filters.favorites') },
  ];

  return (
    <DefaultMotionDiv id="homeEnvironmentListContainer">
      <header className="noc-page-header">
        <div className="noc-page-heading">
          <h2>{t('views.HomeEnvironmentListView.header')}</h2>
          <p className="noc-page-subtitle">{subtitle}</p>
        </div>
        <div className="noc-header-actions">
          {environmentList.length > 0 && (
            <button
              type="button"
              className="noc-btn"
              onClick={handleGlobalRefresh}
              disabled={isSyncingAll}
            >
              <FiRefreshCw
                className={isSyncingAll ? 'rotating' : ''}
                aria-hidden="true"
              />
              <span>
                {isSyncingAll
                  ? t('views.HomeEnvironmentListView.syncing')
                  : t('views.HomeEnvironmentListView.syncAll')}
              </span>
            </button>
          )}
          <Link to="/settings/environments/new" className="noc-btn is-primary">
            <FiPlus aria-hidden="true" />
            <span>{t('views.HomeEnvironmentListView.addEnvironment')}</span>
          </Link>
        </div>
      </header>

      {environmentList.length === 0 ? (
        <div className="noc-empty-state">
          <div className="noc-empty-icon" aria-hidden="true">
            <FiServer />
          </div>
          <h3>{t('views.HomeEnvironmentListView.emptyTitle')}</h3>
          <p>{t('views.HomeEnvironmentListView.emptyHelper')}</p>
          <Link to="/settings/environments/new" className="noc-btn is-primary">
            <FiPlus aria-hidden="true" />
            <span>{t('views.HomeEnvironmentListView.addEnvironment')}</span>
          </Link>
        </div>
      ) : (
        <>
          <dl className="noc-kpi-strip">
            {kpis.map((item) => (
              <div className="noc-kpi-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  <span className="kpi-main">
                    {item.value}
                    {item.unit && <small>{item.unit}</small>}
                  </span>
                  {item.meta && (
                    <span className={`kpi-meta is-${item.metaTone}`}>
                      {item.meta}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <section className="noc-toolbar">
            <div className="noc-search-box">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'views.HomeEnvironmentListView.searchPlaceholder'
                )}
                aria-label={t(
                  'views.HomeEnvironmentListView.searchPlaceholder'
                )}
              />
            </div>

            <div className="noc-toolbar-right">
              <div className="noc-filter-pills" role="group">
                {filterOptions.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    className={filterKind === kind.id ? 'active' : ''}
                    onClick={() => setFilterKind(kind.id)}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>

              <div className="noc-view-toggle" role="group">
                <button
                  type="button"
                  className={viewMode === 'GRID' ? 'active' : ''}
                  onClick={() => setViewMode('GRID')}
                  title={t('views.HomeEnvironmentListView.viewGrid')}
                  aria-label={t('views.HomeEnvironmentListView.viewGrid')}
                >
                  <FiGrid />
                </button>
                <button
                  type="button"
                  className={viewMode === 'TABLE' ? 'active' : ''}
                  onClick={() => setViewMode('TABLE')}
                  title={t('views.HomeEnvironmentListView.viewTable')}
                  aria-label={t('views.HomeEnvironmentListView.viewTable')}
                >
                  <FiList />
                </button>
              </div>
            </div>
          </section>

          {filteredEnvironments.length === 0 && (
            <div className="noc-filter-empty">
              <p>{t('views.HomeEnvironmentListView.noResults')}</p>
            </div>
          )}

          {filteredEnvironments.length > 0 && viewMode === 'GRID' && (
            <div id="EnvironmentListContent">
              {filteredEnvironments.map((environment) => (
                <HomeEnvironmentCard
                  injectedEnvironment={environment}
                  key={environment.id}
                />
              ))}
            </div>
          )}

          {filteredEnvironments.length > 0 && viewMode === 'TABLE' && (
            <div className="noc-table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('views.HomeEnvironmentListView.table.status')}</th>
                    <th>
                      {t('views.HomeEnvironmentListView.table.environment')}
                    </th>
                    <th>{t('views.HomeEnvironmentListView.table.kind')}</th>
                    <th>{t('views.HomeEnvironmentListView.table.release')}</th>
                    <th>{t('views.HomeEnvironmentListView.table.latency')}</th>
                    <th>{t('views.HomeEnvironmentListView.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnvironments.map((env) => {
                    const latest = env.httpResponses?.[0];
                    const isOnline =
                      latest &&
                      latest.responseTimeMs > 0 &&
                      latest.statusCode === 200;
                    return (
                      <tr key={env.id}>
                        <td>
                          <span
                            className={`table-status-badge ${
                              isOnline ? 'online' : 'offline'
                            }`}
                          >
                            {isOnline
                              ? t('views.HomeEnvironmentListView.status.online')
                              : t(
                                  'views.HomeEnvironmentListView.status.offline'
                                )}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/environment/${env.id}/summary`}
                            className="table-env-link"
                          >
                            <b>{env.name}</b>
                            <small>{env.baseUrl}</small>
                          </Link>
                        </td>
                        <td>
                          <SmallTag kind={env.kind} expanded />
                        </td>
                        <td className="mono-cell">
                          {env.release ? `Fluig ${env.release}` : '—'}
                        </td>
                        <td className="mono-cell">
                          {latest && latest.responseTimeMs > 0 ? (
                            `${latest.responseTimeMs} ms`
                          ) : (
                            <span className="text-red">
                              {t(
                                'views.HomeEnvironmentListView.status.offline'
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link
                              to={`/environment/${env.id}/summary`}
                              title={t(
                                'views.HomeEnvironmentListView.openMonitor'
                              )}
                            >
                              <FiActivity />
                            </Link>
                            <Link
                              to={`/environment/${env.id}/edit`}
                              title={t(
                                'views.HomeEnvironmentListView.openSettings'
                              )}
                            >
                              <FiSettings />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DefaultMotionDiv>
  );
}
