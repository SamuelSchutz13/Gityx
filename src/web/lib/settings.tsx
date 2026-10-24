import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { applyTheme, storedTheme } from './theme';

const PHOTOS_KEY = 'gityx.githubPhotos';

function readPhotos(): boolean {
  try {
    return localStorage.getItem(PHOTOS_KEY) === '1';
  } catch {
    return false;
  }
}

type Theme = 'dark' | 'light';
type Settings = { photos: boolean; setPhotos(v: boolean): void; theme: Theme; setTheme(t: Theme): void };

const Ctx = createContext<Settings>({ photos: false, setPhotos: () => {}, theme: 'dark', setTheme: applyTheme });

/** Per-viewer preferences: GitHub photos (opt-in, they send e-mails to GitHub) and the theme. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotosState] = useState(readPhotos);
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : storedTheme(),
  );
  const setPhotos = useCallback((v: boolean) => {
    try {
      localStorage.setItem(PHOTOS_KEY, v ? '1' : '0');
    } catch {
      // storage blocked: the choice lasts for this page only
    }
    setPhotosState(v);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  }, []);
  return <Ctx.Provider value={{ photos, setPhotos, theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
