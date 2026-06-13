import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ContainerProps extends ViewProps {
  paddingSize?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  row?: boolean;
}

export function Container({
  children,
  paddingSize = 'md',
  centered = false,
  row = false,
  style,
  ...props
}: ContainerProps) {
  const theme = useTheme();

  const containerStyle = [
    styles.base,
    row && styles.row,
    centered && styles.centered,
    // Add dynamic padding using theme spacing tokens
    paddingSize !== 'none' && {
      padding: theme.spacing[paddingSize],
    },
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Container;
