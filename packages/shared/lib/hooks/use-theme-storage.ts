import { useStorage } from './use-storage';
import { themeStorage } from '@extension/storage';
import { useEffect } from 'react';

export const HTML_DATA_THEME_KEY = 'data-theme';

/**
 * A wrapper hook around useStorage(themeStorage) that automatically adds
 * data-theme attribute to `<html>`.
 */
export const useThemeStorage = () => {
  const result = useStorage(themeStorage);
  const { isLight } = result;

  useEffect(() => {
    // Set data-theme attribute on document.documentElement
    const themeValue = isLight ? 'light' : 'dark';
    document.documentElement.setAttribute(HTML_DATA_THEME_KEY, themeValue);

    // Cleanup function to remove the attribute
    return () => {
      document.documentElement.removeAttribute(HTML_DATA_THEME_KEY);
    };
  }, [isLight]);

  return { ...result, toggle: themeStorage.toggle };
};
