import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';
import { Spacer } from '../common/Spacer';

export interface LoadingViewProps {
  fullScreen?: boolean;
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingView({
  fullScreen = false,
  message,
  size = 'large',
}: LoadingViewProps) {
  const theme = useTheme();

  const containerStyle = [
    styles.container,
    fullScreen && [styles.fullScreen, { backgroundColor: theme.colors.background }],
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <>
          <Spacer size="md" />
          <Text variant="bodyMedium" color="secondary" style={styles.text}>
            {message}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  text: {
    fontWeight: '500',
  },
});

export default LoadingView;
