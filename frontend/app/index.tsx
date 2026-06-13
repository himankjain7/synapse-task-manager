import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Auto-routing foundation. In Phase 2, this handles session checks.
  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  // Redirect to Auth stack if not logged in
  return <Redirect href="/(auth)" />;
}
