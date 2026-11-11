import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiInfo, FiPackage, FiRefreshCw } from 'react-icons/fi';
import {
  getAppSettingsAsObject,
  triggerAppUpdateCheck,
  updateAppSettings,
} from '../../../ipc/settingsIpcHandler';
import parseBoolean from '../../../../common/utils/parseBoolean';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';
import SwitchToggle from '../../base/SwitchToggle';

export default function UpdatesSettings() {
  const { t } = useTranslation();

  const [enableAutoDownload, setEnableAutoDownload] = useState(true);
  const [enableAutoInstall, setEnableAutoInstall] = useState(true);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const settings = await getAppSettingsAsObject();
      if (!settings) return;

      const download = settings.ENABLE_AUTO_DOWNLOAD_UPDATE;
      const install = settings.ENABLE_AUTO_INSTALL_UPDATE;

      if (download) setEnableAutoDownload(parseBoolean(download.value));
      if (install) setEnableAutoInstall(parseBoolean(install.value));
    } catch {
      // Mantém os padrões locais se as configurações ainda não puderem ser lidas.
    }
  }

  function handleEnableUpdateAutoInstall(checked: boolean) {
    setEnableAutoInstall(checked);
    updateAppSettings([
      {
        settingId: 'ENABLE_AUTO_INSTALL_UPDATE',
        value: String(checked),
      },
    ]);
  }

  function handleEnableUpdateAutoDownload(checked: boolean) {
    setEnableAutoDownload(checked);
    if (!checked) {
      handleEnableUpdateAutoInstall(false);
    }
    updateAppSettings([
      {
        settingId: 'ENABLE_AUTO_DOWNLOAD_UPDATE',
        value: String(checked),
      },
    ]);
  }

  async function handleCheckForUpdates() {
    setIsCheckingUpdate(true);
    setCheckMessage(null);
    try {
      await triggerAppUpdateCheck();
      setTimeout(() => {
        setIsCheckingUpdate(false);
        setCheckMessage(t('components.UpdatesSettings.checkCompleted'));
      }, 1500);
    } catch {
      setIsCheckingUpdate(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <DefaultMotionDiv id="app-updates-settings">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiPackage />
        </span>
        {t('components.UpdatesSettings.title')}
      </h3>
      <p className="settings-section-helper">
        {t('components.UpdatesSettings.helperText')}
      </p>

      <div className="settings-toggles-list">
        <SwitchToggle
          id="enableAutoDownload"
          checked={enableAutoDownload}
          onChange={(checked) => handleEnableUpdateAutoDownload(checked)}
          label={t('components.UpdatesSettings.enableAutoDownload.label')}
          helperText={t('components.UpdatesSettings.enableAutoDownload.helper')}
        />

        <SwitchToggle
          id="enableAutoInstall"
          checked={enableAutoInstall}
          onChange={(checked) => handleEnableUpdateAutoInstall(checked)}
          label={t('components.UpdatesSettings.enableAutoInstall.label')}
          helperText={t('components.UpdatesSettings.enableAutoInstall.helper')}
          disabled={!enableAutoDownload}
        />
      </div>

      <div className="update-check-action-bar">
        <button
          type="button"
          className="btn-update-check"
          onClick={handleCheckForUpdates}
          disabled={isCheckingUpdate}
        >
          <FiRefreshCw
            className={isCheckingUpdate ? 'spin-icon' : ''}
            aria-hidden="true"
          />
          <span>
            {isCheckingUpdate
              ? t('components.UpdatesSettings.checkingNow')
              : t('components.UpdatesSettings.checkNow')}
          </span>
        </button>

        {checkMessage && (
          <span className="update-feedback-msg">
            <FiCheckCircle aria-hidden="true" />
            {checkMessage}
          </span>
        )}
      </div>

      <p className="update-frequency-info">
        <FiInfo aria-hidden="true" />{' '}
        {t('components.UpdatesSettings.updateFrequency.helper')}
      </p>
    </DefaultMotionDiv>
  );
}
