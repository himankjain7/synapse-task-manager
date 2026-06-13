import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface DividerProps {
  vertical?: boolean;
  size?: number;
  color?: string;
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Divider({
  vertical = false,
  size = StyleSheet.hairlineWidth,
  color,
  margin = 'none',
}: DividerProps) {
  const theme = useTheme();

  const dividerStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: color || theme.colors.border,
    },
    vertical
      ? {
          width: size,
          height: '100%',
          marginHorizontal: margin !== 'none' ? theme.spacing[margin] : 0,
        }
      : {
          height: size,
          width: '100%',
          marginVertical: margin !== 'none' ? theme.spacing[margin] : 0,
        },
  ];

  return <View style={dividerStyle} />;
}

export default Divider;
