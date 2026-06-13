import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../typography/Text';
import { Heading } from '../typography/Heading';
import { Spacer } from '../common/Spacer';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No records found',
  description = 'There are no active records in this list. Create a new item to get started.',
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconWrapper}>{icon}</View>
      ) : (
        <View style={[styles.defaultIconCircle, { backgroundColor: theme.colors.secondaryLight }]}>
          <Text style={{ fontSize: 24, color: theme.colors.text.secondary }}>∅</Text>
        </View>
      )}
      
      <Spacer size="lg" />
      <Heading level={3} align="center">{title}</Heading>
      <Spacer size="xs" />
      <Text variant="bodyMedium" color="secondary" align="center" style={styles.description}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <>
          <Spacer size="xl" />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={onAction}
            activeOpacity={0.8}
          >
            <Text variant="bodyMedium" color="onPrimary" weight="semibold">
              {actionLabel}
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
  iconWrapper: {
    marginBottom: 8,
  },
  defaultIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    maxWidth: 260,
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

export default EmptyState;
