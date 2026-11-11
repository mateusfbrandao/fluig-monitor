import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiInbox, FiVolume2 } from 'react-icons/fi';

import {
  getAppSetting,
  updateAppSettings,
} from '../../../ipc/settingsIpcHandler';
import parseBoolean from '../../../../common/utils/parseBoolean';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';
import SwitchToggle from '../../base/SwitchToggle';
import {
  isSoundAlertsEnabled,
  setSoundAlertsEnabled,
  playAlertSound,
} from '../../../utils/audioAlert';

export default function SystemTraySettings() {
  const { t } = useTranslation();

  const [enableMinimizeFeature, setEnableMinimizeFeature] = useState(false);
  const [disableNotification, setDisableNotification] = useState(false);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(
    isSoundAlertsEnabled()
  );

  function handleEnableMinimizeFeature(checked: boolean) {
    setEnableMinimizeFeature(checked);

    if (!checked && disableNotification) {
      setDisableNotification(false);
      updateAppSettings([
        {
          settingId: 'ENABLE_MINIMIZE_FEATURE',
          value: String(checked),
        },
        {
          settingId: 'DISABLE_MINIMIZE_NOTIFICATION',
          value: 'false',
        },
      ]);
      return;
    }

    updateAppSettings([
      {
        settingId: 'ENABLE_MINIMIZE_FEATURE',
        value: String(checked),
      },
    ]);
  }

  function handleDisableNotification(checked: boolean) {
    setDisableNotification(checked);

    updateAppSettings([
      {
        settingId: 'DISABLE_MINIMIZE_NOTIFICATION',
        value: String(checked),
      },
    ]);
  }

  function handleSoundAlertsToggle(checked: boolean) {
    setEnableSoundAlerts(checked);
    setSoundAlertsEnabled(checked);

    updateAppSettings([
      {
        settingId: 'ENABLE_SOUND_ALERTS',
        value: String(checked),
      },
    ]);
  }

  async function loadSettings() {
    const minimizeFeatureSetting = await getAppSetting(
      'ENABLE_MINIMIZE_FEATURE'
    );

    if (minimizeFeatureSetting) {
      setEnableMinimizeFeature(parseBoolean(minimizeFeatureSetting.value));
    }

    const disableNotificationSetting = await getAppSetting(
      'DISABLE_MINIMIZE_NOTIFICATION'
    );

    if (disableNotificationSetting) {
      setDisableNotification(parseBoolean(disableNotificationSetting.value));
    }

    const soundAlertsSetting = await getAppSetting('ENABLE_SOUND_ALERTS');
    if (soundAlertsSetting) {
      const enabled = parseBoolean(soundAlertsSetting.value);
      setEnableSoundAlerts(enabled);
      setSoundAlertsEnabled(enabled);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <DefaultMotionDiv id="system-tray-settings">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiInbox />
        </span>
        {t('components.SystemTraySettings.title')}
      </h3>

      <p className="settings-section-helper">
        {t('components.SystemTraySettings.helperText')}
      </p>

      <div className="settings-toggles-list">
        <SwitchToggle
          id="enableMinimizeToSystemTray"
          checked={enableMinimizeFeature}
          onChange={(checked) => handleEnableMinimizeFeature(checked)}
          label={t('components.SystemTraySettings.minimizeToSystemTray')}
          helperText={t(
            'components.SystemTraySettings.minimizeToSystemTrayHelper'
          )}
        />

        <SwitchToggle
          id="disableNotification"
          checked={disableNotification}
          onChange={(checked) => handleDisableNotification(checked)}
          label={t('components.SystemTraySettings.disableNotification')}
          helperText={t(
            'components.SystemTraySettings.disableNotificationHelper'
          )}
          disabled={!enableMinimizeFeature}
        />
      </div>

      <div className="settings-subsection">
        <div className="settings-subsection-head">
          <h4>{t('components.SystemTraySettings.alertsTitle')}</h4>
          <p>{t('components.SystemTraySettings.alertsHelper')}</p>
        </div>

        <div className="settings-toggles-list">
          <div className="settings-toggle-with-action">
            <SwitchToggle
              id="enableSoundAlerts"
              checked={enableSoundAlerts}
              onChange={(checked) => handleSoundAlertsToggle(checked)}
              label={t('components.SystemTraySettings.enableSoundAlerts')}
              helperText={t(
                'components.SystemTraySettings.enableSoundAlertsHelper'
              )}
            />

            {enableSoundAlerts && (
              <button
                type="button"
                className="settings-secondary-action"
                onClick={() => playAlertSound('critical', true)}
                title={t('components.SystemTraySettings.testSoundTitle')}
              >
                <FiVolume2 aria-hidden="true" />
                <span>{t('components.SystemTraySettings.testSound')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </DefaultMotionDiv>
  );
}
