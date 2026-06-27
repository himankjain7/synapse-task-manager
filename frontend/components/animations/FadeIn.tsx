import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  slide?: boolean;
  spring?: boolean;
}

export function FadeIn({ children, duration = 400, delay = 0, style, slide, spring: useSpring }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slide ? 20 : 0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (useSpring) {
        Animated.parallel([
          Animated.spring(opacity, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
          ...(slide ? [Animated.spring(translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true })] : []),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
          ...(slide ? [Animated.timing(translateY, { toValue: 0, duration, useNativeDriver: true })] : []),
        ]).start();
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, duration, slide, useSpring]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
