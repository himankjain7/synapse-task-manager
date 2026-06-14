import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { triggerHaptic } from '../../utils/haptics';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const badgeCount = useNotificationStore((s) => s.badgeCount);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  const handleOpenSettings = () => {
    router.push('/(modals)/settings');
  };

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
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.text.secondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { triggerHaptic('light'); router.push('/(protected)/notifications'); }}
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
              {badgeCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                  <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.avatarBubble, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>{initials}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.navCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push('/(protected)/workspaces')}
          activeOpacity={0.85}
        >
          <Text style={[styles.navCardTitle, { color: theme.colors.text.primary }]}>Workspaces</Text>
          <Text style={[styles.navCardDesc, { color: theme.colors.text.secondary }]}>
            Manage your workspaces, members, projects, and tasks
          </Text>
          <View style={[styles.navCardArrow, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={{ color: theme.colors.primary, fontSize: 18, fontWeight: '600' }}>→</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Quick Links
          </Text>
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.primaryLight }]}
              onPress={() => { triggerHaptic('light'); router.push('/(protected)/workspaces'); }}
            >
              <Text style={[styles.linkEmoji]}>🏢</Text>
              <Text style={[styles.linkLabel, { color: theme.colors.primary }]}>Workspaces</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.successLight }]}
              onPress={() => { triggerHaptic('light'); router.push('/(protected)/notifications'); }}
            >
              <Text style={[styles.linkEmoji]}>🔔</Text>
              <Text style={[styles.linkLabel, { color: theme.colors.success }]}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.warningLight }]}
              onPress={handleOpenSettings}
            >
              <Text style={[styles.linkEmoji]}>⚙️</Text>
              <Text style={[styles.linkLabel, { color: theme.colors.warning }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.secondaryLight }]}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
              Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 16,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
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
  avatarText: { fontSize: 16, fontWeight: '700' },
  navCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 } as any),
  },
  navCardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  navCardDesc: { fontSize: 14, lineHeight: 20 },
  navCardArrow: {
    position: 'absolute', right: 16, top: 16,
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 } as any),
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  linksContainer: { flexDirection: 'row', gap: 12 },
  linkButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  linkEmoji: { fontSize: 24 },
  linkLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actions: { gap: 12 },
  actionButton: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionButtonText: { fontSize: 15, fontWeight: '600' },
  logoutButton: { backgroundColor: '#FEF2F2' },
});
