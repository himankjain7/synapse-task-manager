import React from 'react';
import { StyleSheet, View, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface LoadingViewProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'small' | 'large';
  variant?: 'default' | 'card' | 'list' | 'dashboard';
  count?: number;
}

function ShimmerBlock({ width = '80%', height = 14, radius = 6, style }: { width?: number | string; height?: number; radius?: number; style?: ViewStyle }) {
  const theme = useTheme();
  const shimmer = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, opacity, backgroundColor: theme.colors.border }, style]}
    />
  );
}

function CardSkeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <ShimmerBlock width={44} height={44} radius={12} />
        <View style={{ gap: 8, flex: 1 }}>
          <ShimmerBlock width="70%" height={14} />
          <ShimmerBlock width="45%" height={10} />
        </View>
      </View>
    </View>
  );
}

function DashboardSkeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[s.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ShimmerBlock width={40} height={28} radius={8} />
            <ShimmerBlock width="60%" height={12} />
          </View>
        ))}
      </View>
      <View style={[s.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <ShimmerBlock width={120} height={100} radius={12} />
        <View style={{ gap: 8, flex: 1 }}>
          <ShimmerBlock width="100%" height={14} />
          <ShimmerBlock width="80%" height={14} />
          <ShimmerBlock width="60%" height={14} />
          <ShimmerBlock width="40%" height={14} />
        </View>
      </View>
    </View>
  );
}

export function LoadingView({ fullScreen = false, size = 'large', variant = 'default', count = 3 }: LoadingViewProps) {
  const theme = useTheme();

  const content = (
    <View style={s.container}>
      {variant === 'dashboard' ? (
        <DashboardSkeleton theme={theme} />
      ) : variant === 'card' || variant === 'list' ? (
        <View style={{ gap: 12, width: '100%' }}>
          {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} theme={theme} />
          ))}
        </View>
      ) : size === 'large' ? (
        <View style={{ gap: 14, width: '100%', maxWidth: 320, alignItems: 'center' }}>
          <ShimmerBlock width={56} height={56} radius={16} />
          <ShimmerBlock width="65%" height={16} radius={8} />
          <ShimmerBlock width="45%" height={13} radius={6} />
          <View style={{ height: 8 }} />
          <ShimmerBlock width="85%" height={13} radius={6} />
          <ShimmerBlock width="40%" height={13} radius={6} />
        </View>
      ) : (
        <View style={{ gap: 10, alignItems: 'center', flexDirection: 'row' }}>
          <ShimmerBlock width={24} height={24} radius={8} />
          <ShimmerBlock width="50%" height={12} radius={6} />
        </View>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[s.fullScreen, { backgroundColor: theme.colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
}

const s = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  fullScreen: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%' },
  kpiCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10, alignItems: 'center' },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 20, flexDirection: 'row', gap: 20, alignItems: 'center' },
});
