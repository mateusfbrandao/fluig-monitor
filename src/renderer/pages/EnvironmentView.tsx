/* eslint-disable react-hooks/exhaustive-deps */
import { Route, Routes, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  FiAirplay,
  FiCpu,
  FiDatabase,
  FiGrid,
  FiLayers,
  FiList,
  FiSettings,
  FiTrendingUp,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import EnvironmentSummary from '../components/layout/EnvironmentSummaryContainer';
import EnvironmentDatabaseContainer from '../components/layout/EnvironmentDatabaseContainer';
import EnvironmentDetailedMemoryContainer from '../components/layout/EnvironmentDetailedMemoryContainer';
import EnvironmentRuntimeStatsContainer from '../components/layout/EnvironmentRuntimeStatsContainer';
import EnvironmentArtifactsContainer from '../components/layout/EnvironmentArtifactsContainer';
import EnvironmentInsightsContainer from '../components/layout/EnvironmentInsightsContainer';
import EnvironmentServicesContainer from '../components/layout/EnvironmentServicesContainer';
import EnvironmentName from '../components/container/EnvironmentName';
import EditEnvironmentSettingsView from './EditEnvironmentSettingsView';
import DefaultMotionDiv from '../components/base/DefaultMotionDiv';

import '../assets/styles/pages/EnvironmentView.scss';

export default function EnvironmentView(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const submenuItems = [
    {
      target: `summary`,
      text: t('views.EnvironmentDataContainer.sideMenu.summary'),
      icon: <FiAirplay />,
    },
    {
      target: `database`,
      text: t('views.EnvironmentDataContainer.sideMenu.database'),
      icon: <FiDatabase />,
    },
    {
      target: `detailedMemory`,
      text: t('views.EnvironmentDataContainer.sideMenu.detailedMemory'),
      icon: <FiLayers />,
    },
    {
      target: `runtimeStats`,
      text: t('views.EnvironmentDataContainer.sideMenu.runtimeStats'),
      icon: <FiCpu />,
    },
    {
      target: `artifacts`,
      text: t('views.EnvironmentDataContainer.sideMenu.artifacts'),
      icon: <FiGrid />,
    },
    {
      target: `services`,
      text: t('views.EnvironmentDataContainer.sideMenu.services'),
      icon: <FiList />,
    },
    {
      target: `insights`,
      text: t('views.EnvironmentDataContainer.sideMenu.insights'),
      icon: <FiTrendingUp />,
    },
    {
      target: `edit`,
      text: t('views.EnvironmentDataContainer.sideMenu.settings'),
      icon: <FiSettings />,
    },
  ];

  const activeSection = location.pathname.split('/')[3] || 'summary';

  return (
    <DefaultMotionDiv id="center-view-container">
      <div className="environment-data-container">
        <header className="environment-top-shell">
          <EnvironmentName />
          <nav
            className="environment-tabs-nav"
            aria-label={t('views.EnvironmentDataContainer.tabsNav')}
          >
            {submenuItems.map((item) => {
              const isActive = activeSection === item.target;
              return (
                <Link
                  to={item.target}
                  key={item.target}
                  className={`env-tab-link${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span className="item-text">{item.text}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <section id="menu-content">
          <Routes>
            <Route path="summary" element={<EnvironmentSummary />} />
            <Route path="database" element={<EnvironmentDatabaseContainer />} />
            <Route
              path="detailedMemory"
              element={<EnvironmentDetailedMemoryContainer />}
            />
            <Route
              path="runtimeStats"
              element={<EnvironmentRuntimeStatsContainer />}
            />
            <Route
              path="artifacts"
              element={<EnvironmentArtifactsContainer />}
            />
            <Route path="insights" element={<EnvironmentInsightsContainer />} />
            <Route path="services" element={<EnvironmentServicesContainer />} />
            <Route path="edit" element={<EditEnvironmentSettingsView />} />
          </Routes>
        </section>
      </div>
    </DefaultMotionDiv>
  );
}
