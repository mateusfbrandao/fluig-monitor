import { useEffect, useState } from 'react';
import { shell } from 'electron';
import {
  FiExternalLink,
  FiGithub,
  FiHelpCircle,
  FiInfo,
  FiPackage,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { version } from '../../../../../package.json';
import logoImage from '../../../assets/img/logo.png';
import DefaultMotionDiv from '../../base/DefaultMotionDiv';
import {
  getSystemRuntimeInfo,
  SystemRuntimeInfo,
} from '../../../ipc/settingsIpcHandler';

const REPOSITORY_URL = 'https://github.com/mateusfbrandao/fluig-monitor';

export default function AboutSection() {
  const { t } = useTranslation();
  const [runtimeInfo, setRuntimeInfo] = useState<SystemRuntimeInfo | null>(
    null
  );
  const [runtimeState, setRuntimeState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  useEffect(() => {
    let active = true;

    getSystemRuntimeInfo()
      .then((info) => {
        if (!active) return null;
        setRuntimeInfo(info);
        setRuntimeState('ready');
        return null;
      })
      .catch(() => {
        if (!active) return;
        setRuntimeState('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const open = (url: string) => {
    shell.openExternal(url);
  };

  const specs = [
    {
      label: runtimeInfo?.framework || 'Tauri',
      value: runtimeInfo?.frameworkVersion
        ? `v${runtimeInfo.frameworkVersion}`
        : '—',
    },
    {
      label: t('components.AboutSection.webview'),
      value: runtimeInfo?.webview || runtimeInfo?.chrome || '—',
    },
    {
      label: runtimeInfo?.backend || 'Rust',
      value: runtimeInfo?.backendVersion
        ? `v${runtimeInfo.backendVersion}`
        : '—',
    },
    {
      label: t('components.AboutSection.platform'),
      value: runtimeInfo?.platform || '—',
    },
  ];

  return (
    <DefaultMotionDiv id="about-section">
      <h3 className="icon-title">
        <span className="icon-dot neutral-variant">
          <FiInfo />
        </span>
        {t('components.AboutSection.headingTitle')}
      </h3>

      <div className="about-plate">
        <div className="about-identity">
          <div className="about-mark">
            <img src={logoImage} alt="" />
          </div>

          <div className="about-identity-copy">
            <div className="about-name-row">
              <h4 className="about-app-name">
                Fluig <span className="name-accent">Monitor</span>
              </h4>
              <span className="about-version-badge">v{version}</span>
            </div>
            <p className="about-tagline">
              {t('components.AboutSection.title')}
            </p>
          </div>

          <div className="about-identity-meta">
            <span>
              {t('components.AboutSection.developedBy')}
              <button
                type="button"
                className="about-author-link"
                onClick={() => open('https://github.com/mateusfbrandao')}
              >
                mateusfbrandao
              </button>
            </span>
            <span>{t('components.AboutSection.license')}</span>
          </div>
        </div>

        {runtimeState === 'error' ? (
          <p className="about-runtime-fallback" role="status">
            {t('components.AboutSection.runtimeUnavailable')}
          </p>
        ) : (
          <dl
            className="about-spec"
            aria-busy={runtimeState === 'loading' ? 'true' : 'false'}
          >
            {specs.map((item) => (
              <div className="about-spec-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{runtimeState === 'loading' ? '…' : item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="about-actions">
          <button
            type="button"
            className="about-action about-action-primary"
            onClick={() => open(REPOSITORY_URL)}
          >
            <FiGithub aria-hidden="true" />
            <span>{t('components.AboutSection.openRepository')}</span>
            <FiExternalLink aria-hidden="true" />
          </button>

          <button
            type="button"
            className="about-action"
            onClick={() => open(`${REPOSITORY_URL}/issues`)}
          >
            <FiHelpCircle aria-hidden="true" />
            <span>{t('components.AboutSection.reportIssue')}</span>
          </button>

          <button
            type="button"
            className="about-action"
            onClick={() => open(`${REPOSITORY_URL}/releases`)}
          >
            <FiPackage aria-hidden="true" />
            <span>{t('components.AboutSection.releaseNotes')}</span>
          </button>
        </div>

        <div className="about-disclaimer">
          <p>{t('components.AboutSection.disclosure')}</p>
          <p>{t('components.AboutSection.usageDisclosure')}</p>
        </div>
      </div>
    </DefaultMotionDiv>
  );
}
