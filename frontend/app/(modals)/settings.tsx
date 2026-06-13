import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';

export default function SettingsModal() {
  const theme = useTheme();
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeStore();
  const { hapticsEnabled, setHapticsEnabled, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();

  const handleClose = () => {
    router.back();
  };

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light Mode' },
    { key: 'dark', label: 'Dark Mode' },
    { key: 'system', label: 'System Sync' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Navbar */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Settings</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={[styles.closeText, { color: theme.colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Settings list content */}
      <View style={styles.content}>
        {/* Section: Appearance Theme */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          APPEARANCE
        </Text>
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
                <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>
                  {opt.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkIndicator, { backgroundColor: theme.colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section: Preferences */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          SYSTEM PREFERENCES
        </Text>
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
      </View>
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
  content: {
    flex: 1,
    padding: 24,
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
  optionRow: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
});
