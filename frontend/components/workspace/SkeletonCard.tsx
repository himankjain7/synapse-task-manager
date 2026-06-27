import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  radius?: number;
}

function SkeletonBlock({ width = '100%', height = 14, radius = 6 }: SkeletonBlockProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{ width: width as any, height, borderRadius: radius, opacity, backgroundColor: theme.colors.border }}
    />
  );
}

interface SkeletonCardProps {
  count?: number;
  variant?: 'card' | 'list' | 'dashboard';
}

export function SkeletonCard({ count = 3, variant = 'card' }: SkeletonCardProps) {
  const theme = useTheme();

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.kpiRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <SkeletonBlock width={40} height={28} />
            <SkeletonBlock width="60%" height={12} />
          </View>
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SkeletonBlock width="40%" height={18} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
          <SkeletonBlock width={80} height={80} radius={40} />
          <View style={{ flex: 1, gap: 10 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} width={`${70 - i * 10}%`} height={14} />)}
          </View>
        </View>
      </View>
    </View>
  );

  if (variant === 'dashboard') return renderDashboard();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardRow}>
            <SkeletonBlock width={44} height={44} radius={12} />
            <View style={styles.cardContent}>
              <SkeletonBlock width="70%" height={15} />
              <SkeletonBlock width="45%" height={12} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 20 },
  dashboardContainer: { gap: 12, padding: 20 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%', padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardContent: { flex: 1, gap: 8 },
});
