'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'robo-data-theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolved: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStored(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'light';
}

function getResolved(theme: Theme): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDocument(resolved: 'light' | 'dark') {
  const doc = document.documentElement;
  doc.classList.remove('light', 'dark');
  doc.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Fixed initial state so server and first client render match (avoids hydration mismatch)
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    const r = getResolved(next);
    setResolved(r);
    applyToDocument(r);
  }, []);

  // After mount, sync with localStorage and script-applied class
  useEffect(() => {
    const stored = getStored();
    const r = getResolved(stored);
    setThemeState(stored);
    setResolved(r);
    applyToDocument(r);
  }, []);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme !== 'system') return;
      const r = getResolved('system');
      setResolved(r);
      applyToDocument(r);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    resolved,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
