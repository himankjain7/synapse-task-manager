import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';

export interface LogoRef {
  animateIn: (delay?: number) => void;
  animateOut: (callback?: () => void) => void;
}

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

export const Logo = forwardRef<LogoRef, LogoProps>(({ size = 72, style }, ref) => {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const borderSpring = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    animateIn: (delay = 0) => {
      scale.setValue(0);
      rotate.setValue(0);
      borderSpring.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          Animated.spring(rotate, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]),
      ]).start();
      setTimeout(() => {
        Animated.spring(borderSpring, { toValue: 1, friction: 8, tension: 40, useNativeDriver: false }).start();
      }, delay);
    },
    animateOut: (callback) => {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => callback?.());
    },
  }));

  const rotateInterp = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const borderRadius = borderSpring.interpolate({
    inputRange: [0, 1],
    outputRange: [size, size * 0.28],
  });

  const logoSize = size;
  const iconSize = size * 0.44;

  return (
    <Animated.View
      style={[
        {
          width: logoSize,
          height: logoSize,
          borderRadius,
          backgroundColor: theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          transform: [{ scale }, { rotate: rotateInterp }],
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -logoSize * 0.25,
          right: -logoSize * 0.25,
          width: logoSize * 0.8,
          height: logoSize * 0.8,
          borderRadius: logoSize * 0.4,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <Text style={{ fontSize: iconSize, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2 }}>S</Text>
    </Animated.View>
  );
});

Logo.displayName = 'Logo';
