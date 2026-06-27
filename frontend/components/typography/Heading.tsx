import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface HeadingProps extends RNTextProps {
  level?: 1 | 2 | 3 | 4 | 'display';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'accent';
  weight?: 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'center' | 'right';
}

export function Heading({
  children,
  level = 2,
  color = 'primary',
  weight = 'bold',
  align = 'auto',
  style,
  ...props
}: HeadingProps) {
  const theme = useTheme();

  const resolveColor = () => {
    switch (color) {
      case 'secondary':
        return theme.colors.text.secondary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'accent':
        return theme.colors.primary;
      case 'primary':
      default:
        return theme.colors.text.primary;
    }
  };

  const textStyle = [
    {
      color: resolveColor(),
      textAlign: align,
      fontWeight: theme.typography.weights[weight],
    },
    // Heading sizing based on level tokens
    level === 'display' && {
      fontSize: theme.typography.sizes.display,
      lineHeight: theme.typography.lineHeights.display,
    },
    level === 1 && {
      fontSize: theme.typography.sizes.h1,
      lineHeight: theme.typography.lineHeights.h1,
    },
    level === 2 && {
      fontSize: theme.typography.sizes.h2,
      lineHeight: theme.typography.lineHeights.h2,
    },
    level === 3 && {
      fontSize: theme.typography.sizes.h3,
      lineHeight: theme.typography.lineHeights.h3,
    },
    level === 4 && {
      fontSize: theme.typography.sizes.h4,
      lineHeight: theme.typography.lineHeights.h4,
    },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
}

export default Heading;
