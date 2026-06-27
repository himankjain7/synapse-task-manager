import React, { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { Animated, View, StyleSheet, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { Logo, LogoRef } from '../components/common/Logo';

const MIN_SPLASH_MS = 2200;

export default function SplashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [ready, setReady] = useState(false);
  const logoRef = useRef<LogoRef>(null);
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(12)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    logoRef.current?.animateIn(reduceMotion ? 0 : 100);

    const subDelay = reduceMotion ? 200 : 600;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(subtitleSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, subDelay);

    const barDelay = reduceMotion ? 400 : 1000;
    setTimeout(() => {
      Animated.timing(barWidth, { toValue: 1, duration: MIN_SPLASH_MS - 1000, useNativeDriver: false }).start();
    }, barDelay);

    const timer = setTimeout(() => setReady(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  if (!isHydrated) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.center, { paddingTop: insets.top }]}>
          <Logo ref={logoRef} size={80} />
          <Animated.Text
            style={[s.appName, { color: theme.colors.text.primary, opacity: subtitleOpacity, transform: [{ translateY: subtitleSlide }] }]}
          >
            Synapse
          </Animated.Text>
          <Animated.View style={[s.progressBar, { backgroundColor: theme.colors.border }]}>
            <Animated.View
              style={[s.progressFill, { backgroundColor: theme.colors.primary, width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (ready && isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  if (ready && !isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Logo ref={logoRef} size={80} />
        <Animated.Text
          style={[s.appName, { color: theme.colors.text.primary, opacity: subtitleOpacity, transform: [{ translateY: subtitleSlide }] }]}
        >
          Synapse
        </Animated.Text>
        <Animated.View style={[s.progressBar, { backgroundColor: theme.colors.border }]}>
          <Animated.View
            style={[s.progressFill, { backgroundColor: theme.colors.primary, width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 },
  appName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  progressBar: { width: 120, height: 3, borderRadius: 1.5, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 1.5 },
});
