import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  const handleOpenSettings = () => {
    // Navigate to modals route group
    router.push('/(modals)/settings');
  };

  // Get initials for the avatar bubble
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.text.secondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'User'}</Text>
          </View>
          <View style={[styles.avatarBubble, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>{initials}</Text>
          </View>
        </View>

        {/* Dashboard Quick Stats Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Workspace Summary
          </Text>
          <Text style={[styles.cardDesc, { color: theme.colors.text.secondary }]}>
            Your Synapse node server is fully operational. Tap settings to configure dark mode preferences.
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.primary }]}>0</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.tertiary }]}>Active Tasks</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.success }]}>Online</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.tertiary }]}>Server Link</Text>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.secondaryLight }]}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
              Open Settings Modal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>
              Log Out Session
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  actions: {
    gap: 16,
  },
  actionButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
  },
});
