
'use client';

import { useEffect } from 'react';

export const LOCAL_STORAGE_UI_MODE_KEY = "facturafacil-uimode";

export function ThemeInitializer() {
  useEffect(() => {
    const savedUiMode = localStorage.getItem(LOCAL_STORAGE_UI_MODE_KEY) as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let currentMode: 'light' | 'dark';

    if (savedUiMode) {
      currentMode = savedUiMode;
    } else {
      currentMode = prefersDark ? 'dark' : 'light';
      // Do not set localStorage here, let the settings page handle user's first explicit choice if they visit it
      // or default to system preference. If they never visit settings, it respects system.
    }

    if (currentMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return null;
}
