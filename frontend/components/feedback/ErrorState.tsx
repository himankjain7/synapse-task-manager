import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';
import { Heading } from '../typography/Heading';
import { Spacer } from '../common/Spacer';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'An error occurred',
  message = 'We encountered an error loading this content. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.errorIconCircle, { backgroundColor: theme.colors.dangerLight }]}>
        <Text style={{ fontSize: 24, color: theme.colors.danger, fontWeight: 'bold' }}>!</Text>
      </View>

      <Spacer size="lg" />
      <Heading level={3} align="center" style={{ color: theme.colors.danger }}>
        {title}
      </Heading>
      <Spacer size="xs" />
      <Text variant="bodyMedium" color="secondary" align="center" style={styles.message}>
        {message}
      </Text>

      {onRetry && (
        <>
          <Spacer size="xl" />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text variant="bodyMedium" color="onPrimary" weight="semibold">
              {retryLabel}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default ErrorState;
