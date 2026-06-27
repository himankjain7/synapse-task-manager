import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';
import { Heading } from '../typography/Heading';
import { Spacer } from '../common/Spacer';
import { PressScale } from '../animations/PressScale';
import { FadeIn } from '../animations/FadeIn';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this content. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <FadeIn slide delay={100}>
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.dangerLight }]}>
          <Text style={styles.emoji}>⚠️</Text>
        </View>
        <Spacer size="xl" />
        <Heading level={3} align="center" style={{ color: theme.colors.text.primary }}>{title}</Heading>
        <Spacer size="sm" />
        <Text variant="bodyMedium" color="tertiary" align="center" style={styles.message}>{message}</Text>
        {onRetry && (
          <>
            <Spacer size="xl" />
            <PressScale scaleTo={0.95}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={onRetry}
                activeOpacity={0.85}
                accessibilityLabel={retryLabel}
                accessibilityRole="button"
              >
                <Text variant="bodyMedium" color="onPrimary" weight="semibold">{retryLabel}</Text>
              </TouchableOpacity>
            </PressScale>
          </>
        )}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 28 },
  message: { maxWidth: 280, lineHeight: 20 },
  button: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
