import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonCardProps {
  count?: number;
}

function SkeletonBlock({ style }: { style?: any }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[{ opacity, backgroundColor: theme.colors.border, borderRadius: theme.radius.md }, style]}
    />
  );
}

export function SkeletonCard({ count = 3 }: SkeletonCardProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.cardRow}>
            <SkeletonBlock style={{ width: 48, height: 48, borderRadius: theme.radius.lg }} />
            <View style={styles.cardContent}>
              <SkeletonBlock style={{ width: '70%', height: 16 }} />
              <SkeletonBlock style={{ width: '50%', height: 12, marginTop: 8 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 20,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardContent: {
    flex: 1,
  },
});
