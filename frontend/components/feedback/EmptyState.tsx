import React from 'react';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';
import { Heading } from '../typography/Heading';
import { Spacer } from '../common/Spacer';
import { PressScale } from '../animations/PressScale';
import { FadeIn } from '../animations/FadeIn';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  emoji?: string;
}

const EMOJI_MAP: Record<string, string> = {
  tasks: '📋',
  projects: '📁',
  workspaces: '🏢',
  notifications: '🔔',
  comments: '💬',
  search: '🔍',
  members: '👥',
  calendar: '📅',
  default: '✨',
};

export function EmptyState({
  title = 'No records found',
  description = 'There are no active records in this list. Create a new item to get started.',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  icon,
  emoji,
}: EmptyStateProps) {
  const theme = useTheme();
  const resolvedEmoji = emoji ? EMOJI_MAP[emoji] || emoji : EMOJI_MAP.default;

  return (
    <FadeIn slide delay={100}>
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          {icon || <Text style={styles.emoji}>{resolvedEmoji}</Text>}
        </View>
        <Spacer size="xl" />
        <Heading level={3} align="center" style={{ color: theme.colors.text.primary }}>
          {title}
        </Heading>
        <Spacer size="sm" />
        <Text variant="bodyMedium" color="secondary" align="center" style={[styles.description, { color: theme.colors.text.tertiary }]}>
          {description}
        </Text>

        {actionLabel && onAction && (
          <>
            <Spacer size="xl" />
            <PressScale scaleTo={0.95}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={onAction}
                activeOpacity={0.85}
                accessibilityLabel={actionLabel}
                accessibilityRole="button"
              >
                <Text variant="bodyMedium" color="onPrimary" weight="semibold">{actionLabel}</Text>
              </TouchableOpacity>
            </PressScale>
          </>
        )}

        {secondaryLabel && onSecondaryAction && (
          <TouchableOpacity onPress={onSecondaryAction} style={styles.secondaryButton} accessibilityLabel={secondaryLabel}>
            <Text variant="bodyMedium" color="primary" weight="medium">{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 28 },
  description: { maxWidth: 280, lineHeight: 20 },
  button: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  secondaryButton: { marginTop: 12, paddingVertical: 8 },
});
