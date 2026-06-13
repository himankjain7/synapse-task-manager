import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const handleMockLogin = () => {
    // Scaffold login logic to test protected state transition
    setSession('mock_jwt_token', {
      id: 'usr_1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Administrator',
    });
    // This store change automatically redirects via app/index.tsx
    router.replace('/(protected)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.logoText, { color: theme.colors.primary }]}>S</Text>
        </View>
        
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Synapse Mobile
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Collaborate seamlessly, synchronize workflows, and run operations at lightning speed.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleMockLogin}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text.onPrimary }]}>
            Log In (Mock Session)
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.caption, { color: theme.colors.text.tertiary }]}>
          Phase 1 Foundation Setup • Synapse Backend Connected
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  button: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    textAlign: 'center',
  },
});
