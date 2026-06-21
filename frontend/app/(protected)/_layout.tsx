import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Wait for hydration to prevent redirect flicker
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Auth route guard. Re-routes immediately if session is missing.
  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
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
