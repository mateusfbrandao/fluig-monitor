import log from 'electron-log';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getAppSetting, updateAppSettings } from '../ipc/settingsIpcHandler';

interface ThemeContextProviderProps {
  children: ReactNode;
}

// Defines the theme context interface (theme setting mode, effective theme, and switch function)
interface ThemeContextData {
  theme: string; // 'SYSTEM' | 'WHITE' | 'DARK'
  effectiveTheme: 'WHITE' | 'DARK';
  setFrontEndTheme: (theme: string, updateDbValue?: boolean) => void;
}

function getSystemTheme(): 'DARK' | 'WHITE' {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'DARK';
  }
  return 'WHITE';
}

function applyThemeToBody(effective: 'DARK' | 'WHITE') {
  if (effective === 'DARK') {
    document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark-theme');
  }
}

export const ThemeContext = createContext({} as ThemeContextData);

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [theme, setTheme] = useState<string>('SYSTEM');
  const [effectiveTheme, setEffectiveTheme] = useState<'WHITE' | 'DARK'>(() => {
    if (
      typeof document !== 'undefined' &&
      (document.body.classList.contains('dark-theme') ||
        document.documentElement.classList.contains('dark-theme'))
    ) {
      return 'DARK';
    }
    return getSystemTheme();
  });

  function setFrontEndTheme(selectedTheme: string, updateDbValue = true) {
    log.info(`Updating app front end theme to ${selectedTheme} via context.`);

    let targetEffective: 'DARK' | 'WHITE';
    if (selectedTheme === 'SYSTEM') {
      targetEffective = getSystemTheme();
    } else if (selectedTheme === 'WHITE') {
      targetEffective = 'WHITE';
    } else {
      targetEffective = 'DARK';
    }

    applyThemeToBody(targetEffective);
    setTheme(selectedTheme);
    setEffectiveTheme(targetEffective);

    if (updateDbValue) {
      updateAppSettings([
        {
          settingId: 'FRONT_END_THEME',
          value: selectedTheme,
        },
      ]);
    }
  }

  // loads the theme saved on the database or defaults to SYSTEM (follows OS)
  useEffect(() => {
    async function loadThemeFromDb() {
      const savedTheme = await getAppSetting('FRONT_END_THEME');

      if (savedTheme && savedTheme.value) {
        setFrontEndTheme(savedTheme.value, false);
      } else {
        // Sem preferência explícita -> Segue o tema do Sistema Operacional
        setFrontEndTheme('SYSTEM', false);
      }
    }

    loadThemeFromDb();
  }, []);

  // Monitora alterações de tema do Sistema Operacional em tempo real quando o modo for 'SYSTEM'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'SYSTEM') {
        const newSysTheme = e.matches ? 'DARK' : 'WHITE';
        applyThemeToBody(newSysTheme);
        setEffectiveTheme(newSysTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setFrontEndTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  return useContext(ThemeContext);
};
