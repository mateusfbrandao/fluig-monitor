import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ipcRenderer } from 'electron';

// views / components
import EnvironmentView from './pages/EnvironmentView';
import CreateEnvironmentView from './pages/CreateEnvironmentView';
import Navbar from './components/container/Navbar/Navbar';
import HomeEnvironmentListView from './pages/HomeEnvironmentListView';
import AppSettingsView from './pages/AppSettingsView';

// assets
import './assets/styles/global.scss';
import './assets/styles/utilities.scss';

// contexts
import { EnvironmentListContextProvider } from './contexts/EnvironmentListContext';
import { NotificationsContextProvider } from './contexts/NotificationsContext';
import { ThemeContextProvider } from './contexts/ThemeContext';

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (
      _event: Electron.IpcRendererEvent,
      path: string
    ) => {
      navigate(path);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        ipcRenderer.invoke('toggleFullscreen').catch(() => {});
      }
    };

    ipcRenderer.on('navigateTo', handleNavigate);
    window.addEventListener('keydown', handleKeyDown);

    // Sincronização automática de telemetria periódica
    const syncAll = async () => {
      try {
        const envs = await ipcRenderer.invoke('getAllEnvironments');
        if (Array.isArray(envs)) {
          for (const env of envs) {
            ipcRenderer.invoke('forceEnvironmentSync', env.id).catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    };

    // Dispara a primeira sincronização após 2 segundos do boot para inicializar os painéis
    const initialSyncTimer = setTimeout(syncAll, 2000);
    // Dispara a cada 5 minutos
    const syncInterval = setInterval(syncAll, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(syncInterval);
      ipcRenderer.removeListener('navigateTo', handleNavigate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return (
    <EnvironmentListContextProvider>
      <NotificationsContextProvider>
        <ThemeContextProvider>
          <div id="appWrapper">
            <Navbar />
            <main id="mainWindow">
              <AnimatePresence mode="wait">
                {/* <Switch location={location} key={location.pathname}> */}
                <Routes>
                  <Route path="/" element={<HomeEnvironmentListView />} />
                  <Route
                    path="/settings/environments/new"
                    element={<CreateEnvironmentView />}
                  />
                  <Route
                    path="/environment/:environmentId/*"
                    element={<EnvironmentView />}
                  />
                  <Route path="/appSettings/*" element={<AppSettingsView />} />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </ThemeContextProvider>
      </NotificationsContextProvider>
    </EnvironmentListContextProvider>
  );
}
