import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface TextProps extends RNTextProps {
  variant?: 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'caption' | 'tiny' | 'mono';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'onPrimary';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'center' | 'right' | 'justify';
}

export function Text({
  children,
  variant = 'bodyMedium',
  color = 'primary',
  weight = 'regular',
  align = 'auto',
  style,
  ...props
}: TextProps) {
  const theme = useTheme();

  // Resolve color token
  const resolveColor = () => {
    switch (color) {
      case 'secondary':
        return theme.colors.text.secondary;
      case 'tertiary':
        return theme.colors.text.tertiary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'onPrimary':
        return theme.colors.text.onPrimary;
      case 'primary':
      default:
        return theme.colors.text.primary;
    }
  };

  const textStyle = [
    {
      color: resolveColor(),
      textAlign: align,
      fontWeight: theme.typography.weights[weight] as any,
    },
    // Font styling according to theme tokens
    variant === 'bodyLarge' && {
      fontSize: theme.typography.sizes.bodyLarge,
      lineHeight: theme.typography.lineHeights.bodyLarge,
    },
    variant === 'bodyMedium' && {
      fontSize: theme.typography.sizes.bodyMedium,
      lineHeight: theme.typography.lineHeights.bodyMedium,
    },
    variant === 'bodySmall' && {
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    variant === 'caption' && {
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    variant === 'tiny' && {
      fontSize: theme.typography.sizes.tiny,
      lineHeight: theme.typography.lineHeights.tiny,
    },
    variant === 'mono' && {
      fontFamily: theme.typography.fonts.mono,
      fontSize: theme.typography.sizes.bodySmall,
    },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
}

export default Text;
