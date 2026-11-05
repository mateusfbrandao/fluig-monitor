import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiGrid, FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { version } from '../../../../../package.json';
import { useEnvironmentList } from '../../../contexts/EnvironmentListContext';
import EnvironmentList from './EnvironmentList';

import '../../../assets/styles/components/Navbar.scss';
import Logo from './Logo';
import NavActionButtons from './NavActionButtons';

function Navbar() {
  const { environmentList } = useEnvironmentList();
  const location = useLocation();
  const { t } = useTranslation();

  const isHome = location.pathname === '/';
  const isCreating = location.pathname === '/settings/environments/new';

  return (
    <motion.nav
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: { ease: 'easeOut', duration: 0.3 },
      }}
      id="mainNavbar"
    >
      <div className="sidebar-top">
        <Link to="/" id="logo-container">
          <Logo />
        </Link>

        <div className="sidebar-main-links">
          <Link
            to="/"
            className={`sidebar-nav-link ${isHome ? 'is-active' : ''}`}
          >
            <FiGrid />
            <span>{t('views.HomeEnvironmentListView.header')}</span>
          </Link>
          <Link
            to="/settings/environments/new"
            className={`sidebar-nav-link is-accent ${
              isCreating ? 'is-active' : ''
            }`}
          >
            <FiPlus />
            <span>{t('views.CreateEnvironmentView.form.title')}</span>
          </Link>
        </div>

        <div className="sidebar-section-header">
          <span>MONITORADOS</span>
          <span className="env-count-badge">
            {(environmentList || []).length}
          </span>
        </div>

        <section id="environmentList">
          <AnimatePresence>
            <EnvironmentList environmentList={environmentList || []} />
          </AnimatePresence>
        </section>
      </div>

      <div className="sidebar-footer">
        <NavActionButtons />
        <span
          className="sidebar-app-version"
          title={`Fluig Monitor v${version}`}
        >
          v{version}
        </span>
      </div>
    </motion.nav>
  );
}

export default Navbar;
