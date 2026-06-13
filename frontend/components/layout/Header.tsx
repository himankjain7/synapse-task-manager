import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Heading } from '../typography/Heading';
import { Text } from '../typography/Text';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightAction,
}: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            {/* Minimal SVG or text representation of back arrow */}
            <Text style={[styles.backText, { color: theme.colors.primary }]}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleWrapper}>
          <Heading level={4}>{title}</Heading>
          {subtitle && (
            <Text variant="tiny" color="secondary">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Header;
