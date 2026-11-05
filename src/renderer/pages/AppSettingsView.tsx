import { useTranslation } from 'react-i18next';

import SystemTraySettings from '../components/container/SettingsPage/SystemTraySettings';
import LanguageSettings from '../components/container/SettingsPage/LanguageSettings';
import AboutSection from '../components/container/SettingsPage/AboutSection';
import UpdatesSettings from '../components/container/SettingsPage/UpdatesSettings';
import ThemeSettings from '../components/container/SettingsPage/ThemeSettings';
import StorageSettings from '../components/container/SettingsPage/StorageSettings';

import '../assets/styles/pages/AppSettings.view.scss';
import DefaultMotionDiv from '../components/base/DefaultMotionDiv';

export default function AppSettingsView() {
  const { t } = useTranslation();

  return (
    <DefaultMotionDiv id="appSettingsContainer">
      <div className="settings-header">
        <h2>{t('views.AppSettingsView.title')}</h2>
        <p className="settings-subtitle">
          {t(
            'views.AppSettingsView.subtitle',
            'Preferências globais da aplicação, armazenamento e comportamento do sistema.'
          )}
        </p>
      </div>

      <div className="settings-bento-grid">
        {/* Linha 1: Personalização e Idioma */}
        <div className="bento-card bento-card-half">
          <ThemeSettings />
        </div>

        <div className="bento-card bento-card-half">
          <LanguageSettings />
        </div>

        {/* Linha 2: Sistema e Atualizações */}
        <div className="bento-card bento-card-half">
          <SystemTraySettings />
        </div>

        <div className="bento-card bento-card-half">
          <UpdatesSettings />
        </div>

        {/* Linha 3: Armazenamento e Banco de Dados */}
        <div className="bento-card bento-card-full">
          <StorageSettings />
        </div>

        {/* Linha 4: Sobre o Fluig Monitor */}
        <div className="bento-card bento-card-full">
          <AboutSection />
        </div>
      </div>
    </DefaultMotionDiv>
  );
}
