import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ipcRenderer } from 'electron';
import { FiChevronRight } from 'react-icons/fi';

import '../../assets/styles/components/EnvironmentServices.scss';
import { EnvironmentServices } from '../../../common/interfaces/EnvironmentControllerInterface';
import TimeIndicator from '../base/TimeIndicator';
import { getEnvironmentServices } from '../../ipc/environmentsIpcHandler';
import getServiceName from '../../utils/getServiceName';

export default function EnvironmentServicesPanel() {
  const { t } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const environmentId = location.pathname.split('/')[2];

  const [environmentServices, setEnvironmentServices] =
    useState<EnvironmentServices | null>(null);

  useEffect(() => {
    async function loadServicesData() {
      setEnvironmentServices(
        await getEnvironmentServices(Number(environmentId))
      );
    }

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, () => {
      loadServicesData();
    });

    loadServicesData();

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setEnvironmentServices(null);
    };
  }, [environmentId]);

  const historyItem = environmentServices?.monitorHistory?.[0];

  return (
    <div className="widget-container" id="environment-services">
      <div
        className="widget-header-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <h3 className="title" style={{ marginBottom: 0 }}>
          {t('components.EnvironmentServices.title')}
        </h3>
        <button
          type="button"
          className="btn-subtle"
          onClick={() => navigate(`/environment/${environmentId}/services`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: 'var(--purple)',
            cursor: 'pointer',
          }}
          aria-label={`${t(
            'components.EnvironmentServices.title'
          )} - Ver todos os serviços`}
        >
          <span>Ver todos</span>
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="widget-card">
        {historyItem ? (
          <>
            <div className="service-list">
              {Object.entries(historyItem).map((item) => {
                let status = t('components.EnvironmentServices.failed');
                let className = 'is-failed';

                if (item[1] === 'OK' || item[1] === 'UP') {
                  status = t('components.EnvironmentServices.operational');
                  className = 'is-operational';
                } else if (item[1] === 'NONE' || item[1] === 'UNKNOWN') {
                  status = t('components.EnvironmentServices.unused');
                  className = 'is-unused';
                }

                if (getServiceName(item[0]) !== 'UNKNOWN') {
                  return (
                    <div className="service-item" key={item[0]}>
                      <span className="service-name">
                        {getServiceName(item[0])}
                      </span>
                      <span className={`service-status ${className}`}>
                        {status} <span className="status-indicator" />
                      </span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
            <TimeIndicator
              date={
                environmentServices.monitorHistory[0].httpResponse.timestamp
              }
            />
          </>
        ) : (
          <span>{t('components.global.noData')}</span>
        )}
      </div>
    </div>
  );
}
