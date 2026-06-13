import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';

interface AppProvidersProps {
  children: React.ReactNode;
  onHydrated?: () => void;
}

export function AppProviders({ children, onHydrated }: AppProvidersProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Rehydrate state from storage and restore auth session before loading
  useEffect(() => {
    async function initializeApp() {
      try {
        await Promise.all([
          useAuthStore.persist.rehydrate(),
          useThemeStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
        ]);

        // Restore auth session (verify stored token with backend)
        await useAuthStore.getState().restoreSession();
      } catch (error) {
        console.warn('Error during app initialization:', error);
      } finally {
        setIsHydrated(true);
        if (onHydrated) {
          onHydrated();
        }
      }
    }
    initializeApp();
  }, [onHydrated]);

  // If stores are not hydrated, we show nothing (splash screen remains visible)
  if (!isHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
export default AppProviders;
