import { ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi';

import DefaultMotionDiv from '../../base/DefaultMotionDiv';

export default function LanguageSettings() {
  const { t, i18n } = useTranslation();

  // sends an ipc signal, since the i18n language must be changed on the main process to also
  // update the language on the database
  function dispatchLanguageChange(lang: string) {
    ipcRenderer.invoke('updateLanguage', lang);
  }

  return (
    <DefaultMotionDiv id="language-settings">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiGlobe />
        </span>
        {t('components.LanguageSettings.title')}
      </h3>
      <p className="settings-section-helper">
        {t('components.LanguageSettings.helperText')}
      </p>

      <div className="language-options-grid" role="radiogroup">
        <label
          htmlFor="radioLanguage_pt"
          className={`language-card ${
            i18n.language === 'pt' ? 'is-selected' : ''
          }`}
        >
          <input
            type="radio"
            name="radioLanguage"
            id="radioLanguage_pt"
            checked={i18n.language === 'pt'}
            onChange={() => dispatchLanguageChange('pt')}
            className="visually-hidden"
          />
          <div className="lang-code-preview" aria-hidden="true">
            <span className="lang-code">PT</span>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">{t('menu.languages.pt')}</span>
            <span className="theme-desc">
              {t('components.LanguageSettings.ptDesc')}
            </span>
          </div>
        </label>

        <label
          htmlFor="radioLanguage_en"
          className={`language-card ${
            i18n.language === 'en' ? 'is-selected' : ''
          }`}
        >
          <input
            type="radio"
            name="radioLanguage"
            id="radioLanguage_en"
            checked={i18n.language === 'en'}
            onChange={() => dispatchLanguageChange('en')}
            className="visually-hidden"
          />
          <div className="lang-code-preview" aria-hidden="true">
            <span className="lang-code">EN</span>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">{t('menu.languages.en')}</span>
            <span className="theme-desc">
              {t('components.LanguageSettings.enDesc')}
            </span>
          </div>
        </label>
      </div>
    </DefaultMotionDiv>
  );
}
