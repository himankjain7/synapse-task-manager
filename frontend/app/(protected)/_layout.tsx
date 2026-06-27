import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CommandPaletteProvider } from '../../components/CommandPalette';
import { LoadingView } from '../../components/feedback/LoadingView';

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingView fullScreen variant="default" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (Platform.OS === 'web') {
    // Wrap in SafeAreaProvider + CommandPaletteProvider for web
    return (
      <SafeAreaProvider>
        <CommandPaletteProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="workspaces/index" options={{ headerShown: false }} />
            <Stack.Screen name="workspaces/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="workspaces/[id]/index" options={{ headerShown: false }} />
            <Stack.Screen name="workspaces/[id]/members" options={{ headerShown: false }} />
            <Stack.Screen name="workspaces/[id]/invite" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="projects/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="projects/[projectId]/index" options={{ headerShown: false }} />
            <Stack.Screen name="projects/[projectId]/tasks/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="tasks/[id]/index" options={{ headerShown: false }} />
            <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
            <Stack.Screen name="calendar/index" options={{ headerShown: false }} />
            <Stack.Screen name="search/index" options={{ headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          </Stack>
        </CommandPaletteProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="workspaces/index" options={{ headerShown: false }} />
      <Stack.Screen name="workspaces/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="workspaces/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="workspaces/[id]/members" options={{ headerShown: false }} />
      <Stack.Screen name="workspaces/[id]/invite" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="projects/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="projects/[projectId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="projects/[projectId]/tasks/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="tasks/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      <Stack.Screen name="calendar/index" options={{ headerShown: false }} />
      <Stack.Screen name="search/index" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ headerShown: false }} />
    </Stack>
  );
}
