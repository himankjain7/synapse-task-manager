import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: true }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.code, { color: theme.colors.primary }]}>404</Text>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Lost in Space
        </Text>
        <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
          The page you are looking for does not exist or has been moved.
        </Text>
        <Link href="/" style={[styles.link, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.linkText, { color: theme.colors.text.onPrimary }]}>
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  code: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 300,
  },
  link: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
