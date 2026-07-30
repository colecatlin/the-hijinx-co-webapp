import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

export default function ThemeToggle({ className = '', style }) {
  const { theme, toggle } = useTheme();
  const isLight = theme !== 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${className}`}
      style={{ color: 'hsl(var(--foreground-secondary))', ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground-secondary))')}
    >
      {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}