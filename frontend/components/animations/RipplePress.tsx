import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, View, ViewStyle, TouchableOpacityProps, GestureResponderEvent, StyleSheet } from 'react-native';

interface RipplePressProps extends TouchableOpacityProps {
  children: React.ReactNode;
  rippleColor?: string;
  style?: ViewStyle | ViewStyle[];
  onPress?: (event: GestureResponderEvent) => void;
}

export function RipplePress({ children, rippleColor = 'rgba(255,255,255,0.15)', style, onPress, ...props }: RipplePressProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  const rippleRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    rippleRef.current = { x: locationX, y: locationY };

    scale.setValue(0);
    opacity.setValue(0.4);

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    onPress?.(event);
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      activeOpacity={0.9}
      style={StyleSheet.flatten([{ overflow: 'hidden' }, style])}
      {...props}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ translateX: -50 }, { translateY: -50 }, { scale }],
          opacity,
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: rippleColor,
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
