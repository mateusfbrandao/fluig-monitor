import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SmallTag from '../../base/SmallTag';
import { Environment } from '../../../../common/interfaces/DatabaseModels';
import '../../../assets/styles/components/EnvironmentListItem.scss';

interface EnvironmentListItemInterface {
  data: Environment;
}

export default function EnvironmentListItem({
  data,
}: EnvironmentListItemInterface) {
  let environmentKindTitle = '';
  const [isOnline, setIsOnline] = useState(true);
  const { t } = useTranslation();
  const location = useLocation();

  const isSelected = location.pathname.startsWith(`/environment/${data.id}`);

  useEffect(() => {
    const channel = `serverPinged_${data.id}`;
    const listener = (
      _event: Electron.IpcRendererEvent,
      { serverIsOnline }: { serverIsOnline: boolean }
    ) => {
      setIsOnline(serverIsOnline);
    };

    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  }, [data.id]);

  switch (data.kind) {
    case 'PROD':
      environmentKindTitle = t('global.environmentKinds.PROD');
      break;
    case 'HML':
      environmentKindTitle = t('global.environmentKinds.HML');
      break;
    case 'DEV':
      environmentKindTitle = t('global.environmentKinds.DEV');
      break;

    default:
      environmentKindTitle = 'Unknown';
      break;
  }

  const environmentNameArray = data.name.split(' ');
  const environmentInitials =
    environmentNameArray.length === 1
      ? environmentNameArray[0].substring(0, 2).toUpperCase()
      : (
          environmentNameArray[0].substring(0, 1) +
          environmentNameArray[1].substring(0, 1)
        ).toUpperCase();
  const environmentTitle = `${data.name} [${
    isOnline ? 'Online' : 'Offline'
  }] [${environmentKindTitle}]`;

  const releaseVersion = data.release?.match(/\d+(\.\d+)+(-[^\s]+)?/)?.[0] || data.release;

  return (
    <Link
      to={`/environment/${data.id}/summary`}
      className={`environment-item-container is-expanded ${
        isSelected ? 'is-selected' : ''
      }`}
      title={environmentTitle}
    >
      <div className="initials">
        {environmentInitials}
        <span className={`live-dot ${isOnline ? 'online' : 'offline'}`} />
      </div>
      <div className="data">
        <div className="env-name-text">{data.name}</div>
        <div className="bottom">
          <span className="env-release-text">
            {releaseVersion ? `v${releaseVersion}` : data.kind}
          </span>
          <SmallTag kind={data.kind} />
        </div>
      </div>
    </Link>
  );
}
