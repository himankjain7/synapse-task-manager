import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Shimmer } from './Shimmer';

interface SkeletonFieldProps {
  labelWidth?: number | string;
  label?: boolean;
  style?: ViewStyle;
}

export function SkeletonField({ labelWidth = '40%', label = true, style }: SkeletonFieldProps) {
  const theme = useTheme();
  return (
    <View style={[{ gap: 8 }, style]}>
      {label && <Shimmer width={labelWidth} height={11} borderRadius={4} />}
      <Shimmer width="100%" height={44} borderRadius={12} style={{ borderWidth: 1, borderColor: theme.colors.border }} />
    </View>
  );
}

export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 20 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonField key={i} labelWidth={i === 0 ? '25%' : i === 1 ? '30%' : '35%'} />
      ))}
      <View style={{ height: 14 }} />
      <Shimmer width="100%" height={52} borderRadius={14} style={{ borderWidth: 1, borderColor: theme.colors.border }} />
    </View>
  );
}
