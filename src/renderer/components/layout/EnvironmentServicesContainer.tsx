/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

import Box from '../base/Box';
import DefaultMotionDiv from '../base/DefaultMotionDiv';
import SpinnerLoader from '../base/Loaders/Spinner';
import TimeIndicator from '../base/TimeIndicator';
import { getServicesHistoryById } from '../../ipc/environmentsIpcHandler';
import { EnvironmentServicesHistoryData } from '../../../common/interfaces/EnvironmentControllerInterface';
import getServiceName from '../../utils/getServiceName';
import { formatDateTimeLocale } from '../../utils/formatDate';

const MONITOR_KEYS = [
  'analytics',
  'licenseServer',
  'mailServer',
  'solrServer',
  'viewer',
  'openOffice',
  'realTime',
  'MSOffice',
] as const;

const KEY_TO_SWAGGER: Record<string, string> = {
  analytics: 'ANALYTICS_AVAIABILITY',
  licenseServer: 'LICENSE_SERVER_AVAILABILITY',
  mailServer: 'MAIL_SERVER_AVAILABILITY',
  solrServer: 'SOLR_SERVER_AVAILABILITY',
  viewer: 'VIEWER_AVAILABILITY',
  openOffice: 'OPEN_OFFICE_AVAILABILITY',
  realTime: 'REAL_TIME_AVAILABILITY',
  MSOffice: 'MS_OFFICE_AVAILABILITY',
};

interface ServiceDetailCardItem {
  key: string;
  name: string;
  status: string;
  sucessRate?: number | null;
  lastException?: string | null;
}

function parseDataSourceJson(rawJson: string | null): [string, string][] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([k, v]) => [k, String(v)]);
    }
    return [];
  } catch {
    return [];
  }
}

function EnvironmentServicesContainer() {
  const { t } = useTranslation();
  const location = useLocation();
  const environmentId = Number(location.pathname.split('/')[2]);

  const [servicesData, setServicesData] =
    useState<EnvironmentServicesHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedException, setSelectedException] = useState<{
    serviceName: string;
    exception: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!environmentId) return;
      const result = await getServicesHistoryById(environmentId);
      setServicesData(result);
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

  if (loading) {
    return <SpinnerLoader />;
  }

  const monitorHistory = servicesData?.monitorHistory || [];
  const latestStats = servicesData?.statisticHistory?.[0];

  if (monitorHistory.length === 0 && !latestStats) {
    return (
      <DefaultMotionDiv id="environment-services-container">
        <h3>{t('components.EnvironmentServicesHistory.title')}</h3>
        <Box>
          <span>{t('components.global.noData')}</span>
        </Box>
      </DefaultMotionDiv>
    );
  }

  const latestMonitor = monitorHistory[0];

  const v2Map: Record<
    string,
    {
      status?: string;
      sucessRate?: number | null;
      lastException?: string | null;
    }
  > = {};

  if (latestMonitor?.rawDetails) {
    try {
      const parsed = JSON.parse(latestMonitor.rawDetails);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item?.name) {
            v2Map[item.name] = {
              status: item.status,
              sucessRate:
                typeof item.sucessRate === 'number' ? item.sucessRate : null,
              lastException: item.lastException || null,
            };
          }
        });
      }
    } catch {
      // ignore parse error
    }
  }

  const serviceCards: ServiceDetailCardItem[] = MONITOR_KEYS.map((key) => {
    const swaggerName = KEY_TO_SWAGGER[key] || '';
    const v2Item = v2Map[swaggerName];
    const statusVal =
      v2Item?.status || (latestMonitor ? latestMonitor[key] : null) || 'NONE';

    return {
      key,
      name: getServiceName(key),
      status: String(statusVal),
      sucessRate: v2Item?.sucessRate,
      lastException: v2Item?.lastException,
    };
  });

  const fluigDsEntries = parseDataSourceJson(
    latestStats?.dataSourceFluigDs || null
  );
  const fluigDsRoEntries = parseDataSourceJson(
    latestStats?.dataSourceFluigDsRo || null
  );

  return (
    <DefaultMotionDiv id="environment-services-container">
      <h3>{t('components.EnvironmentServicesHistory.title')}</h3>

      {latestMonitor && (
        <div className="services-section">
          <h4 className="section-title">
            {t('components.EnvironmentServicesHistory.overviewTitle')}
          </h4>
          <div className="services-grid">
            {serviceCards.map((srv) => {
              const isUp = srv.status === 'OK' || srv.status === 'UP';
              const isUnused =
                srv.status === 'NONE' || srv.status === 'UNKNOWN';

              let badgeClass = 'is-failed';
              let badgeText = t('components.EnvironmentServices.failed');

              if (isUp) {
                badgeClass = 'is-operational';
                badgeText = t('components.EnvironmentServices.operational');
              } else if (isUnused) {
                badgeClass = 'is-unused';
                badgeText = t('components.EnvironmentServices.unused');
              }

              return (
                <div key={srv.key} className="service-card">
                  <div>
                    <div className="service-card-header">
                      <h4 className="service-title">{srv.name}</h4>
                      <span className={`service-badge ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>

                    {typeof srv.sucessRate === 'number' && (
                      <div className="service-sla-wrapper">
                        <div className="sla-header">
                          <span>
                            {t(
                              'components.EnvironmentServicesHistory.successRate'
                            )}
                          </span>
                          <span className="sla-value">
                            {srv.sucessRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="sla-progress-track">
                          <div
                            className={`sla-progress-fill ${
                              srv.sucessRate >= 99 ? 'is-high' : 'is-warning'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, srv.sucessRate)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {srv.lastException ? (
                    <div className="service-error-action">
                      <button
                        type="button"
                        className="btn-view-error"
                        onClick={() =>
                          setSelectedException({
                            serviceName: srv.name,
                            exception: srv.lastException || '',
                          })
                        }
                      >
                        <FiAlertTriangle aria-hidden="true" />
                        {t(
                          'components.EnvironmentServicesHistory.viewErrorDetails'
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedException && (
        <div role="dialog" aria-modal="true" className="service-modal-backdrop">
          <div className="service-modal-card">
            <div className="service-modal-header">
              <h4 className="modal-title">
                <FiAlertTriangle aria-hidden="true" />
                {selectedException.serviceName} —{' '}
                {t('components.EnvironmentServicesHistory.lastException')}
              </h4>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedException(null)}
                aria-label={t('components.EnvironmentServicesHistory.close')}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <pre className="service-modal-pre">
              {selectedException.exception}
            </pre>
            <div className="service-modal-footer">
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedException(null)}
              >
                {t('components.EnvironmentServicesHistory.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {(fluigDsEntries.length > 0 || fluigDsRoEntries.length > 0) && (
        <div className="services-section">
          <h4 className="section-title">
            {t('components.EnvironmentServicesHistory.dataSourcesTitle')}
          </h4>
          <div className="stats-grid-2">
            {fluigDsEntries.length > 0 && (
              <div className="data-table-card">
                <h4 className="datasource-title">
                  {t('components.EnvironmentServicesHistory.fluigDs')}
                </h4>
                <table>
                  <tbody>
                    {fluigDsEntries.map(([key, val]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td className="mono-cell">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {fluigDsRoEntries.length > 0 && (
              <div className="data-table-card">
                <h4 className="datasource-title">
                  {t('components.EnvironmentServicesHistory.fluigDsRo')}
                </h4>
                <table>
                  <tbody>
                    {fluigDsRoEntries.map(([key, val]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td className="mono-cell">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {monitorHistory.length > 0 && (
        <div className="data-table-card">
          <h4 className="history-title">
            {t('components.EnvironmentServicesHistory.historyTitle')}
          </h4>
          <div className="history-table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    {t('components.EnvironmentServicesHistory.timestamp')}
                  </th>
                  {MONITOR_KEYS.map((key) => (
                    <th key={key}>{getServiceName(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monitorHistory.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTimeLocale(row.httpResponse.timestamp)}</td>
                    {MONITOR_KEYS.map((key) => {
                      const val = row[key];
                      let statusClass = 'is-failed';
                      if (val === 'OK' || val === 'UP') {
                        statusClass = 'is-operational';
                      } else if (val === 'NONE' || val === 'UNKNOWN') {
                        statusClass = 'is-unused';
                      }
                      return (
                        <td
                          key={key}
                          className={`service-history-cell ${statusClass}`}
                        >
                          {val || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="history-footer">
            <TimeIndicator
              date={monitorHistory[0].httpResponse.timestamp}
              noMargin
            />
          </div>
        </div>
      )}
    </DefaultMotionDiv>
  );
}

export default EnvironmentServicesContainer;
