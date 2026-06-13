import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
    </Stack>
  );
}
