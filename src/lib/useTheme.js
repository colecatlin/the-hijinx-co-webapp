import { useState, useEffect, useCallback } from 'react';

export const THEME_KEY = 'hijinx-theme';
export const THEMES = ['light', 'dark'];

/** Apply a theme class to <html> and persist the choice. */
export function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  const el = document.documentElement;
  el.classList.remove('theme-light', 'theme-dark');
  el.classList.add(next === 'dark' ? 'theme-dark' : 'theme-light');
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
}

/** Read the saved theme (defaults to light). */
export function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

/** Hook: current theme + toggle(). */
export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}