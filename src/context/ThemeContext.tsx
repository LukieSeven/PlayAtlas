import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeTokens, ThemePresetKey, AccessibilitySettings } from '../types/theme';
import { themePresets } from '../config/themePresets';
import {
  getStoredThemePresetKey,
  getStoredAccessibilitySettings,
  applyThemeTokensToDOM,
  saveThemePreference,
  saveAccessibilityPreference,
} from '../services/themeTokenService';

interface ThemeContextType {
  currentPresetKey: ThemePresetKey;
  activeTokens: ThemeTokens;
  accessibility: AccessibilitySettings;
  setThemePreset: (presetKey: ThemePresetKey) => void;
  updateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  availablePresets: typeof themePresets;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPresetKey, setCurrentPresetKey] = useState<ThemePresetKey>(getStoredThemePresetKey);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(getStoredAccessibilitySettings);

  const activeTokens = themePresets[currentPresetKey] || themePresets.watercolor_atlas;

  // Apply theme tokens to document DOM whenever active preset or accessibility settings change
  useEffect(() => {
    applyThemeTokensToDOM(activeTokens, accessibility);
  }, [activeTokens, accessibility]);

  const setThemePreset = (presetKey: ThemePresetKey) => {
    if (presetKey in themePresets) {
      setCurrentPresetKey(presetKey);
      saveThemePreference(presetKey);
    }
  };

  const updateAccessibility = (newSettings: Partial<AccessibilitySettings>) => {
    setAccessibility(prev => {
      const updated = { ...prev, ...newSettings };
      saveAccessibilityPreference(updated);
      return updated;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        currentPresetKey,
        activeTokens,
        accessibility,
        setThemePreset,
        updateAccessibility,
        availablePresets: themePresets,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
