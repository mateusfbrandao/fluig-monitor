import { useTranslation } from 'react-i18next';
import { FiMonitor, FiMoon, FiPenTool, FiSun } from 'react-icons/fi';
import { useTheme } from '../../../contexts/ThemeContext';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';

export default function ThemeSettings() {
  const { t } = useTranslation();
  const { theme, setFrontEndTheme } = useTheme();

  return (
    <DefaultMotionDiv id="theme-settings">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiPenTool />
        </span>
        {t('components.ThemeSettings.title')}
      </h3>
      <p className="settings-section-helper">
        {t('components.ThemeSettings.helperText')}
      </p>

      <div className="theme-options-grid" role="radiogroup">
        <label
          htmlFor="radioTheme_system"
          className={`theme-card ${theme === 'SYSTEM' ? 'is-selected' : ''}`}
        >
          <input
            type="radio"
            name="radioTheme"
            id="radioTheme_system"
            value="SYSTEM"
            checked={theme === 'SYSTEM'}
            onChange={() => setFrontEndTheme('SYSTEM')}
            className="visually-hidden"
          />
          <div className="theme-preview-box system-preview">
            <div className="preview-half preview-half-light">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="preview-half preview-half-dark">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="theme-badge-icon">
              <FiMonitor aria-hidden="true" />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.systemTheme')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.systemThemeDesc')}
            </span>
          </div>
        </label>

        <label
          htmlFor="radioTheme_white"
          className={`theme-card ${theme === 'WHITE' ? 'is-selected' : ''}`}
        >
          <input
            type="radio"
            name="radioTheme"
            id="radioTheme_white"
            value="WHITE"
            checked={theme === 'WHITE'}
            onChange={() => setFrontEndTheme('WHITE')}
            className="visually-hidden"
          />
          <div className="theme-preview-box light-preview">
            <div className="preview-full">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="theme-badge-icon">
              <FiSun aria-hidden="true" />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.whiteTheme')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.whiteThemeDesc')}
            </span>
          </div>
        </label>

        <label
          htmlFor="radioTheme_dark"
          className={`theme-card ${theme === 'DARK' ? 'is-selected' : ''}`}
        >
          <input
            type="radio"
            name="radioTheme"
            id="radioTheme_dark"
            value="DARK"
            checked={theme === 'DARK'}
            onChange={() => setFrontEndTheme('DARK')}
            className="visually-hidden"
          />
          <div className="theme-preview-box dark-preview">
            <div className="preview-full">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="theme-badge-icon">
              <FiMoon aria-hidden="true" />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.darkTheme')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.darkThemeDesc')}
            </span>
          </div>
        </label>
      </div>
    </DefaultMotionDiv>
  );
}
