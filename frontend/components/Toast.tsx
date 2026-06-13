import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useToastStore, ToastType } from '../store/toastStore';
import { Text } from './typography/Text';

const toastColors: Record<ToastType, { bg: string; text: string }> = {
  success: { bg: '#10B981', text: '#FFFFFF' },
  error: { bg: '#EF4444', text: '#FFFFFF' },
  info: { bg: '#4F46E5', text: '#FFFFFF' },
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideToast = useToastStore((s) => s.hideToast);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => hideToast(id));
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const colors = toastColors[type];

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.bg, opacity, transform: [{ translateY }], marginTop: insets.top + 8 },
      ]}
    >
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%',
    alignSelf: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
