'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function broadcastTheme(theme: Theme) {
  document.querySelectorAll('iframe').forEach((iframe) => {
    iframe.contentWindow?.postMessage(
      { type: 'site-theme', theme },
      window.location.origin
    );
  });
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem('theme', theme);
  window.dispatchEvent(new CustomEvent('site-theme-change', { detail: theme }));
  broadcastTheme(theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const initial = saved === 'dark' || saved === 'light' ? saved : 'light';
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
    broadcastTheme(initial);
  }, []);

  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {nextTheme} mode
    </button>
  );
}
