import React, { useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../providers/AppProviders';
import { useTheme } from '../hooks/useTheme';
import { ToastContainer } from '../components/Toast';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error }: { error: Error | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.errorContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.errorIndicator, { backgroundColor: theme.colors.danger }]} />
        <View style={{ height: 16 }} />
        <Text style={{ color: theme.colors.danger, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          Application Encountered an Error
        </Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          An unexpected error caused the application to crash.
        </Text>
        <View style={[styles.codeWrapper, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: theme.colors.text.primary, fontFamily: 'monospace', fontSize: 12 }}>
            {error?.message || 'Unknown Error'}
          </Text>
        </View>
      </View>
    </View>
  );
}

class GlobalErrorBoundaryWithTheme extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Crash Logged:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  const handleHydrated = useCallback(() => {
    setAppIsReady(true);
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady]);

  return (
    <GlobalErrorBoundaryWithTheme>
      <AppProviders onHydrated={handleHydrated}>
        <RootLayoutContent />
      </AppProviders>
    </GlobalErrorBoundaryWithTheme>
  );
}

function RootLayoutContent() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
      <ToastContainer />
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#090D16',
  },
  errorContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#121826',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorIndicator: {
    height: 4,
    width: 64,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    alignSelf: 'center',
  },
  errorTextGroup: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorHeaderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  codeWrapper: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#090D16',
    width: '100%',
  },
  codeText: {
    height: 10,
    width: '100%',
  },
});
