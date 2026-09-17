'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light' | 'system'
  const [fontSizeScale, setFontSizeScale] = useState('medium'); // 'small' | 'medium' | 'large'

  // On mount, read saved theme & font size from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('donchat_theme') || 'dark';
    const savedFont = localStorage.getItem('donchat_font_scale') || 'medium';
    setTheme(savedTheme);
    setFontSizeScale(savedFont);
    applyTheme(savedTheme);
    applyFontScale(savedFont);
  }, []);

  const applyTheme = (t) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;

    let prefersDark = true;
    try {
      if (typeof window.matchMedia === 'function') {
        prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {
      prefersDark = true;
    }

    const isLight = t === 'light' || (t === 'system' && !prefersDark);
    
    if (isLight) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--color-bg', '#f0f4ff');
      root.style.setProperty('--color-bg-alt', '#e8eef8');
      root.style.setProperty('--color-surface', '#ffffff');
      root.style.setProperty('--color-surface-2', '#ffffff');
      root.style.setProperty('--color-surface-3', '#f1f5fb');
      root.style.setProperty('--color-surface-4', '#edf2fc');
      root.style.setProperty('--color-surface-5', '#e4eaf5');
      root.style.setProperty('--color-border', '#d1d9ee');
      root.style.setProperty('--color-border-2', '#c4ceeb');
      root.style.setProperty('--color-text', '#0f172a');
      root.style.setProperty('--color-text-muted', '#64748b');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.setProperty('--color-bg', '#090c15');
      root.style.setProperty('--color-bg-alt', '#090d18');
      root.style.setProperty('--color-surface', 'rgba(15, 23, 42, 0.9)');
      root.style.setProperty('--color-surface-2', '#0c101c');
      root.style.setProperty('--color-surface-3', '#101524');
      root.style.setProperty('--color-surface-4', '#0f172a');
      root.style.setProperty('--color-surface-5', '#151c2e');
      root.style.setProperty('--color-border', '#151c2e');
      root.style.setProperty('--color-border-2', '#1e293b');
      root.style.setProperty('--color-text', '#f3f4f6');
      root.style.setProperty('--color-text-muted', '#9ca3af');
    }
  };

  const applyFontScale = (scale) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;
    if (scale === 'small') {
      root.style.fontSize = '14px';
    } else if (scale === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  };

  const changeTheme = (t) => {
    setTheme(t);
    localStorage.setItem('donchat_theme', t);
    applyTheme(t);
  };

  const changeFontSize = (scale) => {
    setFontSizeScale(scale);
    localStorage.setItem('donchat_font_scale', scale);
    applyFontScale(scale);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, fontSizeScale, changeFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
