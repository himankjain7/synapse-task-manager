import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { queryClient } from '../lib/queryClient';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { lightTheme, darkTheme } from '../theme';

interface AppProvidersProps {
  children: React.ReactNode;
  onHydrated?: () => void;
}

export function AppProviders({ children, onHydrated }: AppProvidersProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();

  // Rehydrate state from storage before loading
  useEffect(() => {
    async function rehydrateStores() {
      try {
        await Promise.all([
          useAuthStore.persist.rehydrate(),
          useThemeStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
        ]);
      } catch (error) {
        console.warn('Error rehydrating Zustand stores:', error);
      } finally {
        setIsHydrated(true);
        if (onHydrated) {
          onHydrated();
        }
      }
    }
    rehydrateStores();
  }, [onHydrated]);

  // If stores are not hydrated, we show nothing (splash screen remains visible)
  if (!isHydrated) {
    return null;
  }

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const activeTheme = isDark ? darkTheme : lightTheme;

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: activeTheme.colors.primary,
      background: activeTheme.colors.background,
      card: activeTheme.colors.surface,
      text: activeTheme.colors.text.primary,
      border: activeTheme.colors.border,
      notification: activeTheme.colors.danger,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationThemeProvider value={navigationTheme}>
            {children}
          </NavigationThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
export default AppProviders;
