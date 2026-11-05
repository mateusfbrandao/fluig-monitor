import { useEffect, useState } from 'react';
import { shell } from 'electron';
import {
  FiCpu,
  FiExternalLink,
  FiGithub,
  FiHelpCircle,
  FiInfo,
  FiPackage,
  FiTerminal,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { version } from '../../../../../package.json';
import logoImage from '../../../assets/img/logo.png';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';
import {
  getSystemRuntimeInfo,
  SystemRuntimeInfo,
} from '../../../ipc/settingsIpcHandler';

export default function AboutSection() {
  const { t } = useTranslation();
  const [runtimeInfo, setRuntimeInfo] = useState<SystemRuntimeInfo | null>(
    null
  );

  useEffect(() => {
    getSystemRuntimeInfo()
      .then(setRuntimeInfo)
      .catch(() => {});
  }, []);

  return (
    <DefaultMotionDiv id="about-section">
      <h3 className="icon-title">
        <span className="icon-dot blue-variant">
          <FiInfo />
        </span>
        {t('components.AboutSection.headingTitle')}
      </h3>

      <div className="about-hero-card">
        <div className="about-brand-row">
          <img
            src={logoImage}
            alt="Fluig Monitor"
            className="about-logo-image"
          />
          <div className="about-brand-text">
            <div className="about-title-row">
              <h4 className="about-app-name">
                Fluig <span className="title-suffix">Monitor</span>
              </h4>
              <span className="about-version-badge">v{version}</span>
            </div>
            <p className="about-tagline">
              {t('components.AboutSection.title')}
            </p>
          </div>
        </div>

        <div className="about-meta-row">
          <span>
            {t('components.AboutSection.developedBy')}{' '}
            <button
              type="button"
              className="btn-link-author"
              onClick={() =>
                shell.openExternal('https://github.com/mateusfbrandao')
              }
            >
              mateusfbrandao
            </button>
          </span>
          <span className="meta-separator">•</span>
          <span>Licença GNU GPL v3.0</span>
        </div>

        {runtimeInfo && (
          <div className="about-runtime-grid">
            <div className="about-runtime-item">
              <span className="runtime-label">
                <FiPackage /> {runtimeInfo.framework || 'Tauri'}
              </span>
              <span className="runtime-value">
                v{runtimeInfo.frameworkVersion || runtimeInfo.electron || '2.2.0'}
              </span>
            </div>
            <div className="about-runtime-item">
              <span className="runtime-label">
                <FiCpu /> {runtimeInfo.webview ? 'Webview' : 'Chromium'}
              </span>
              <span className="runtime-value">
                {runtimeInfo.webview || runtimeInfo.chrome || 'WebKitGTK'}
              </span>
            </div>
            <div className="about-runtime-item">
              <span className="runtime-label">
                <FiTerminal /> {runtimeInfo.backend ? 'Rust' : 'Node.js'}
              </span>
              <span className="runtime-value">
                v{runtimeInfo.backendVersion || runtimeInfo.node || '1.84'}
              </span>
            </div>
            <div className="about-runtime-item">
              <span className="runtime-label">
                <FiHelpCircle /> Plataforma
              </span>
              <span className="runtime-value">{runtimeInfo.platform}</span>
            </div>
          </div>
        )}

        <div className="about-actions-row">
          <button
            type="button"
            className="btn-about-action"
            onClick={() =>
              shell.openExternal(
                'https://github.com/mateusfbrandao/fluig-monitor'
              )
            }
          >
            <FiGithub />
            <span>GitHub Repository</span>
            <FiExternalLink />
          </button>

          <button
            type="button"
            className="btn-about-action"
            onClick={() =>
              shell.openExternal(
                'https://github.com/mateusfbrandao/fluig-monitor/issues'
              )
            }
          >
            <FiHelpCircle />
            <span>Reportar Issue</span>
            <FiExternalLink />
          </button>

          <button
            type="button"
            className="btn-about-action"
            onClick={() =>
              shell.openExternal(
                'https://github.com/mateusfbrandao/fluig-monitor/releases'
              )
            }
          >
            <FiPackage />
            <span>Release Notes</span>
            <FiExternalLink />
          </button>
        </div>

        <div className="about-disclaimer-box">
          <p>{t('components.AboutSection.disclosure')}</p>
          <p>{t('components.AboutSection.usageDisclosure')}</p>
        </div>
      </div>
    </DefaultMotionDiv>
  );
}
