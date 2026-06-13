import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Heading } from '../typography/Heading';
import { Text } from '../typography/Text';
import { Spacer } from '../common/Spacer';

export interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  cardStyle?: boolean;
}

export function Section({
  title,
  description,
  children,
  cardStyle = false,
}: SectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Heading level={3}>{title}</Heading>
          {description && (
            <>
              <Spacer size="xxs" />
              <Text variant="bodySmall" color="secondary">
                {description}
              </Text>
            </>
          )}
          <Spacer size="sm" />
        </View>
      )}
      <View
        style={[
          cardStyle && [
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ],
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  header: {
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
});

export default Section;
