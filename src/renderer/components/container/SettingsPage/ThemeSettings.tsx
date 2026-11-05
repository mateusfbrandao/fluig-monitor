import { useTranslation } from 'react-i18next';
import { FiCheck, FiMonitor, FiMoon, FiPenTool, FiSun } from 'react-icons/fi';
import { useTheme } from '../../../contexts/ThemeContext';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';

export default function ThemeSettings() {
  const { t } = useTranslation();
  const { theme, setFrontEndTheme } = useTheme();

  return (
    <DefaultMotionDiv id="theme-settings">
      <h3 className="icon-title">
        <span className="icon-dot purple-variant">
          <FiPenTool />
        </span>
        {t('components.ThemeSettings.title')}
      </h3>
      <p className="mb-2">{t('components.ThemeSettings.helperText')}</p>

      <div className="theme-options-grid">
        {/* Sistema (Automático) */}
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
          {theme === 'SYSTEM' && (
            <div className="theme-check-badge">
              <FiCheck />
            </div>
          )}
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
              <FiMonitor />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.systemTheme', 'Sistema')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.systemThemeDesc', 'Automático')}
            </span>
          </div>
        </label>

        {/* Claro */}
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
          {theme === 'WHITE' && (
            <div className="theme-check-badge">
              <FiCheck />
            </div>
          )}
          <div className="theme-preview-box light-preview">
            <div className="preview-full">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="theme-badge-icon">
              <FiSun />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.whiteTheme', 'Tema Claro')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.whiteThemeDesc', 'Modo diurno')}
            </span>
          </div>
        </label>

        {/* Escuro */}
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
          {theme === 'DARK' && (
            <div className="theme-check-badge">
              <FiCheck />
            </div>
          )}
          <div className="theme-preview-box dark-preview">
            <div className="preview-full">
              <div className="mini-nav" />
              <div className="mini-card" />
            </div>
            <div className="theme-badge-icon">
              <FiMoon />
            </div>
          </div>
          <div className="theme-card-info">
            <span className="theme-name">
              {t('components.ThemeSettings.darkTheme', 'Tema Escuro')}
            </span>
            <span className="theme-desc">
              {t('components.ThemeSettings.darkThemeDesc', 'Modo noturno')}
            </span>
          </div>
        </label>
      </div>
    </DefaultMotionDiv>
  );
}
