/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiChevronLeft,
  FiGrid,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { useEnvironmentList } from '../contexts/EnvironmentListContext';
import colorServer from '../assets/svg/color-server.svg';
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

    environmentList.forEach((env) => {
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

  const createEnvironmentHelper = (
    <div className="createEnvironmentCard">
      <div className="chevron">
        <FiChevronLeft />
      </div>
      <div className="info">
        <img src={colorServer} alt="Server" />
        <span>
          {t('views.HomeEnvironmentListView.createEnvironmentHelper')}
        </span>
      </div>
    </div>
  );

  return (
    <DefaultMotionDiv id="homeEnvironmentListContainer">
      <header className="noc-page-header">
        <div>
          <h2>{t('views.HomeEnvironmentListView.header')}</h2>
        </div>
        <div className="noc-header-actions">
          <button
            type="button"
            className="noc-btn"
            onClick={handleGlobalRefresh}
            disabled={isSyncingAll}
          >
            <FiRefreshCw className={isSyncingAll ? 'rotating' : ''} />
            <span>{t('components.EnvironmentHeader.syncNow', 'Sync All')}</span>
          </button>
          <Link to="/settings/environments/new" className="noc-btn is-primary">
            <FiPlus />
            <span>{t('views.CreateEnvironmentView.form.title')}</span>
          </Link>
        </div>
      </header>

      {environmentList.length > 0 && (
        <>
          <section className="noc-kpi-strip">
            <div className="noc-kpi-card">
              <span className="kpi-label">STATUS GLOBAL</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {globalMetrics.onlineCount}/{globalMetrics.total}
                </span>
                <span
                  className={`kpi-badge ${
                    globalMetrics.offlineCount === 0 ? 'is-ok' : 'is-warn'
                  }`}
                >
                  {globalMetrics.availabilityPct}% Online
                </span>
              </div>
            </div>

            <div className="noc-kpi-card">
              <span className="kpi-label">LATÊNCIA MÉDIA</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {globalMetrics.avgLatency}{' '}
                  <small className="kpi-unit">ms</small>
                </span>
              </div>
            </div>

            <div className="noc-kpi-card">
              <span className="kpi-label">PICO DE RESPOSTA</span>
              <div className="kpi-value-row">
                <span className="kpi-value">
                  {globalMetrics.maxLatency}{' '}
                  <small className="kpi-unit">ms</small>
                </span>
              </div>
            </div>

            <div className="noc-kpi-card">
              <span className="kpi-label">DISTRIBUIÇÃO</span>
              <div className="kpi-value-row">
                <span className="kpi-sub-pills">
                  <span>
                    PRD:{' '}
                    {environmentList.filter((e) => e.kind === 'PROD').length}
                  </span>
                  <span>
                    HML:{' '}
                    {environmentList.filter((e) => e.kind === 'HML').length}
                  </span>
                  <span>
                    DEV:{' '}
                    {environmentList.filter((e) => e.kind === 'DEV').length}
                  </span>
                </span>
              </div>
            </div>
          </section>

          <section className="noc-toolbar">
            <div className="noc-search-box">
              <FiSearch />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome, URL ou release..."
              />
            </div>

            <div className="noc-toolbar-right">
              <div className="noc-filter-pills">
                {(['ALL', 'PROD', 'HML', 'DEV', 'FAV'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={filterKind === kind ? 'active' : ''}
                    onClick={() => setFilterKind(kind)}
                  >
                    {kind === 'ALL' ? 'Todos' : kind}
                  </button>
                ))}
              </div>

              <div className="noc-view-toggle">
                <button
                  type="button"
                  className={viewMode === 'GRID' ? 'active' : ''}
                  onClick={() => setViewMode('GRID')}
                  title="Grid View"
                >
                  <FiGrid />
                </button>
                <button
                  type="button"
                  className={viewMode === 'TABLE' ? 'active' : ''}
                  onClick={() => setViewMode('TABLE')}
                  title="Table View"
                >
                  <FiList />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {environmentList.length === 0 && (
        <div id="EnvironmentListContent">{createEnvironmentHelper}</div>
      )}

      {environmentList.length > 0 && viewMode === 'GRID' && (
        <div id="EnvironmentListContent">
          {filteredEnvironments.map((environment) => (
            <HomeEnvironmentCard
              injectedEnvironment={environment}
              key={environment.id}
            />
          ))}
        </div>
      )}

      {environmentList.length > 0 && viewMode === 'TABLE' && (
        <div className="noc-table-container">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Ambiente</th>
                <th>Tipo</th>
                <th>Release</th>
                <th>Latência Atual</th>
                <th>Ações</th>
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
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
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
                        <span className="text-red">Offline</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/environment/${env.id}/summary`}
                          title="Abrir Monitor"
                        >
                          <FiActivity />
                        </Link>
                        <Link
                          to={`/environment/${env.id}/edit`}
                          title="Configurações"
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
    </DefaultMotionDiv>
  );
}
