import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';

export function useColorScheme(): 'light' | 'dark' {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useDeviceColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return isDark ? 'dark' : 'light';
}

export default useColorScheme;
