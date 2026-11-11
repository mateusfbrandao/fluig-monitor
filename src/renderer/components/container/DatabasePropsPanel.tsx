import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';

import { DatabaseProperties } from '../../../common/interfaces/DatabaseModels';
import { getDatabaseProperties } from '../../ipc/environmentsIpcHandler';

import sqlServerLogo from '../../assets/img/database-logos/sql-server.png';
import mySqlLogo from '../../assets/img/database-logos/mysql.png';
import oracleLogo from '../../assets/img/database-logos/oracle.png';
import defaultDatabaseLogo from '../../assets/img/database-logos/database.png';
import TimeIndicator from '../base/TimeIndicator';

/**
 * Database info panel component.
 *  Shows the related database properties, such as name, version, and driver.
 * @since 0.5
 */
export default function DatabasePropsPanel() {
  const [dbProps, setDbProps] = useState<DatabaseProperties | null>(null);
  const [dbIllustration, setDbIllustration] =
    useState<string>(defaultDatabaseLogo);

  const { t } = useTranslation();

  const location = useLocation();
  const environmentId = location.pathname.split('/')[2];

  useEffect(() => {
    async function loadDatabaseProperties() {
      setDbProps(await getDatabaseProperties(Number(environmentId)));
    }

    loadDatabaseProperties();

    ipcRenderer.on(`environmentDataUpdated_${environmentId}`, async () => {
      loadDatabaseProperties();
    });

    return () => {
      ipcRenderer.removeAllListeners(`environmentDataUpdated_${environmentId}`);
      setDbProps(null);
    };
  }, [environmentId]);

  useEffect(() => {
    if (dbProps && dbProps.dbName) {
      const { dbName } = dbProps;
      const normalized = dbName.toLocaleLowerCase();
      if (normalized.includes('mysql')) {
        setDbIllustration(mySqlLogo);
      } else if (normalized.includes('sql server')) {
        setDbIllustration(sqlServerLogo);
      } else if (normalized.includes('oracle')) {
        setDbIllustration(oracleLogo);
      } else {
        setDbIllustration(defaultDatabaseLogo);
      }
    }
  }, [dbProps]);

  const propsList = dbProps
    ? [
        {
          label: t('components.SystemResources.DatabasePropsPanel.dbName'),
          value: dbProps.dbName,
        },
        {
          label: t('components.SystemResources.DatabasePropsPanel.dbVersion'),
          value: dbProps.dbVersion,
        },
        {
          label: t(
            'components.SystemResources.DatabasePropsPanel.dbDriverName'
          ),
          value: dbProps.dbDriverName,
        },
        {
          label: t(
            'components.SystemResources.DatabasePropsPanel.dbDriverVersion'
          ),
          value: dbProps.dbDriverVersion,
        },
      ]
    : [];

  return (
    <div className="widget-container database-props-panel">
      <h3 className="title">
        {t('components.SystemResources.DatabasePropsPanel.title')}
      </h3>
      <div className="card">
        {dbProps === null ? (
          <p>{t('components.global.noData')}</p>
        ) : (
          <>
            <div className="db-props-brand">
              <img src={dbIllustration} alt="" />
            </div>
            <dl className="db-props-spec">
              {propsList.map((item) => (
                <div className="db-props-item" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className="footer">
              <TimeIndicator date={dbProps.httpResponse.timestamp} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
