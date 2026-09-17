import React, { createContext, useContext, useState, useEffect } from 'react';
import storage from '../config/storage';
import { darkColors, lightColors } from '../theme/colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('dark'); // 'dark' | 'light' | 'system'
  const [fontSizeScale, setFontSizeScaleState] = useState('medium'); // 'small' | 'medium' | 'large'

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const savedTheme = await storage.getItem('donchat_theme_mode');
        const savedFont = await storage.getItem('donchat_font_scale');
        if (savedTheme) setThemeModeState(savedTheme);
        if (savedFont) setFontSizeScaleState(savedFont);
      } catch (e) {
        console.error('Failed to load theme settings:', e);
      }
    };
    loadThemeSettings();
  }, []);

  const changeTheme = async (mode) => {
    setThemeModeState(mode);
    try {
      await storage.setItem('donchat_theme_mode', mode);
    } catch (e) {
      console.error('Failed to save theme mode:', e);
    }
  };

  const changeFontSize = async (scale) => {
    setFontSizeScaleState(scale);
    try {
      await storage.setItem('donchat_font_scale', scale);
    } catch (e) {
      console.error('Failed to save font scale:', e);
    }
  };

  const activeColors = themeMode === 'light' ? lightColors : darkColors;

  const fontMultiplier = fontSizeScale === 'small' ? 0.85 : fontSizeScale === 'large' ? 1.2 : 1.0;

  const scaledFont = (size) => Math.round(size * fontMultiplier);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        fontSizeScale,
        changeTheme,
        changeFontSize,
        colors: activeColors,
        fontMultiplier,
        scaledFont,
        isLight: themeMode === 'light',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'dark',
      fontSizeScale: 'medium',
      changeTheme: () => {},
      changeFontSize: () => {},
      colors: darkColors,
      fontMultiplier: 1.0,
      scaledFont: (s) => s,
      isLight: false,
    };
  }
  return context;
}
