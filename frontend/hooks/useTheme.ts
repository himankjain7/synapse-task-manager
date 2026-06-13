import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { lightTheme, darkTheme, Theme } from '../theme';

export function useTheme(): Theme {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useDeviceColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return isDark ? darkTheme : lightTheme;
}

export default useTheme;
