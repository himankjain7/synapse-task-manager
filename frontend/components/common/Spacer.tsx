import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  horizontal?: boolean;
}

export function Spacer({ size = 'md', horizontal = false }: SpacerProps) {
  const theme = useTheme();
  const value = theme.spacing[size];

  return (
    <View
      style={{
        width: horizontal ? value : 0,
        height: horizontal ? 0 : value,
      }}
    />
  );
}

export default Spacer;
