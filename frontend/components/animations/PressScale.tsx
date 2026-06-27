import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle } from 'react-native';

interface PressScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  scaleTo?: number;
  style?: ViewStyle;
  disabled?: boolean;
  lift?: boolean;
}

export function PressScale({ children, onPress, scaleTo, style, disabled, lift }: PressScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const targetScale = scaleTo ?? (lift ? 0.98 : 0.96);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: targetScale, friction: 10, tension: 150, useNativeDriver: true }),
      ...(lift ? [Animated.timing(opacity, { toValue: 0.85, duration: 100, useNativeDriver: true })] : []),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      ...(lift ? [Animated.spring(opacity, { toValue: 1, friction: 10, tension: 150, useNativeDriver: true })] : []),
    ]).start();
  };

  const elevatedShadow = lift ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  } : {};

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }, elevatedShadow]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
