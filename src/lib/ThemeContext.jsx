import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'hijinx-theme-preference';

/**
 * ThemeProvider
 * - `defaultTheme`: the page-level fallback theme used when the user has NOT touched the toggle.
 * - User preference (localStorage) always wins once the toggle is touched.
 * - Sets both the `.dark` class (Tailwind darkMode: 'class') and a `data-theme` attribute
 *   (for custom CSS overrides) on <html>.
 */
export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [pageDefault, setPageDefault] = useState(defaultTheme);
  const [userPreference, setUserPreference] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const theme = userPreference || pageDefault;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setUserPreference(prev => {
      const current = prev || pageDefault;
      const next = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, [pageDefault]);

  const setDefaultTheme = useCallback((t) => setPageDefault(t), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDefaultTheme, hasUserPreference: !!userPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Call in a page component to declare its default theme.
 * Only applies when the user has not manually toggled (no localStorage preference).
 */
export function usePageDefaultTheme(theme) {
  const { setDefaultTheme } = useTheme();
  useEffect(() => { setDefaultTheme(theme); }, [theme, setDefaultTheme]);
}