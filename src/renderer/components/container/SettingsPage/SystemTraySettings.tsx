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
        <span className="icon-dot purple-variant">
          <FiInbox />
        </span>
        {t('components.SystemTraySettings.title')}
      </h3>

      <p className="mb-2">{t('components.SystemTraySettings.helperText')}</p>

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
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <SwitchToggle
              id="enableSoundAlerts"
              checked={enableSoundAlerts}
              onChange={(checked) => handleSoundAlertsToggle(checked)}
              label={t(
                'components.SystemTraySettings.enableSoundAlerts',
                'Alertas sonoros de indisponibilidade'
              )}
              helperText={t(
                'components.SystemTraySettings.enableSoundAlertsHelper',
                'Tocar um aviso sonoro sintetizado quando um ambiente Fluig ficar offline ou registrar falha de conexão.'
              )}
            />
          </div>
          {enableSoundAlerts && (
            <button
              type="button"
              className="action-btn"
              onClick={() => playAlertSound('critical', true)}
              style={{
                alignSelf: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Testar sinal sonoro de alerta crítico"
            >
              <FiVolume2 />
              <span>Testar som</span>
            </button>
          )}
        </div>
      </div>
    </DefaultMotionDiv>
  );
}
