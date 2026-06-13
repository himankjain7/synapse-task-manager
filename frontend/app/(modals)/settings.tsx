import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/formatting';

export default function SettingsModal() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { themeMode, setThemeMode } = useThemeStore();
  const { hapticsEnabled, setHapticsEnabled, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();

  const handleClose = () => {
    router.back();
  };

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light Mode', icon: '☀' },
    { key: 'dark', label: 'Dark Mode', icon: '🌙' },
    { key: 'system', label: 'System Sync', icon: '⚙' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Settings</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={[styles.closeText, { color: theme.colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>ACCOUNT</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.profileAvatarText, { color: theme.colors.text.onPrimary }]}>
                {getInitials(user?.name || 'U')}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.optionLabel, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                {user?.name || 'User'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
                {user?.email || ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>APPEARANCE</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {themeOptions.map((opt, idx) => {
            const isSelected = themeMode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
                ]}
                onPress={() => setThemeMode(opt.key)}
              >
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionIcon]}>{opt.icon}</Text>
                  <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>
                    {opt.label}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkIndicator, { backgroundColor: theme.colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>PREFERENCES</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
          >
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>Haptic Feedback</Text>
            <View
              style={[
                styles.toggleContainer,
                { backgroundColor: hapticsEnabled ? theme.colors.success : theme.colors.border },
              ]}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>Push Notifications</Text>
            <View
              style={[
                styles.toggleContainer,
                { backgroundColor: notificationsEnabled ? theme.colors.success : theme.colors.border },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>ABOUT</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>Synapse Workspace</Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.tertiary }}>Version 1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 24,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  optionRow: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionIcon: {
    fontSize: 16,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleContainer: {
    width: 36,
    height: 20,
    borderRadius: 10,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
});
