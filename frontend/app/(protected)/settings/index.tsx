import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useThemeStore, ThemeMode } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAuthStore } from '../../../store/authStore';
import { useWorkspaces } from '../../../hooks/useWorkspaces';
import { useMembers } from '../../../hooks/useWorkspaces';
import { authApi } from '../../../services/auth';
import { disconnectSocket } from '../../../services/socket';
import { getInitials } from '../../../utils/formatting';
import { triggerHaptic } from '../../../utils/haptics';

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{children}</View>;
}

function OptionRow({ children, isLast }: { children: React.ReactNode; isLast?: boolean }) {
  const theme = useTheme();
  return <View style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>{children}</View>;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { themeMode, setThemeMode } = useThemeStore();
  const {
    hapticsEnabled, setHapticsEnabled,
    notificationsEnabled, setNotificationsEnabled,
  } = useSettingsStore();

  const { data: workspaces } = useWorkspaces();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const ws = workspaces?.data?.[0];
  const { data: membersData } = useMembers(ws?.id);
  const memberCount = membersData?.data?.length ?? 0;
  const myMembership = membersData?.data?.find((m) => m.userId === user?.id);
  const myRole = myMembership?.role ?? 'member';

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: '☀' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '⚙' },
  ];

  const handleSaveName = useCallback(async () => {
    if (!nameDraft.trim() || nameDraft.trim() === user?.name) { setEditingName(false); return; }
    setSaving(true);
    try {
      await authApi.updateProfile(nameDraft.trim());
      useAuthStore.getState().setUser({ ...user!, name: nameDraft.trim() });
      triggerHaptic('light');
      setEditingName(false);
    } catch {
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  }, [nameDraft, user]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      triggerHaptic('success');
      Alert.alert('Success', 'Password changed successfully');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err?.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          disconnectSocket();
          await logout();
          router.replace('/(auth)');
        },
      },
    ]);
  }, [logout, router]);

  const initials = getInitials(user?.name || 'U');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: theme.colors.text.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Appearance" />
        <SectionCard>
          {themeOptions.map((opt, idx) => {
            const isSelected = themeMode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themeRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); setThemeMode(opt.key); }}
              >
                <Text style={styles.themeIcon}>{opt.icon}</Text>
                <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>{opt.label}</Text>
                <View style={[styles.radio, { borderColor: isSelected ? theme.colors.primary : theme.colors.border }]}>
                  {isSelected && <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        <SectionHeader title="Profile" />
        <SectionCard>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={[styles.nameInput, { color: theme.colors.text.primary, borderColor: theme.colors.primary }]}
                    value={nameDraft} onChangeText={setNameDraft} autoFocus maxLength={100}
                    onBlur={handleSaveName} onSubmitEditing={handleSaveName}
                  />
                  {saving && <ActivityIndicator size="small" color={theme.colors.primary} />}
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setNameDraft(user?.name || ''); setEditingName(true); triggerHaptic('light'); }}>
                  <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'User'}</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>{user?.email || ''}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={() => { triggerHaptic('light'); setEditingName(!editingName); }}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>Change Display Name</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionHeader title="Notifications" />
        <SectionCard>
          <OptionRow>
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>In-app Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) => { triggerHaptic('light'); setNotificationsEnabled(v); }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
          </OptionRow>
          <OptionRow>
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) => { triggerHaptic('light'); setNotificationsEnabled(v); }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
          </OptionRow>
          <OptionRow isLast>
            <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>Sound</Text>
            <Switch
              value={soundEnabled}
              onValueChange={(v) => { triggerHaptic('light'); setSoundEnabled(v); }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
          </OptionRow>
        </SectionCard>

        <SectionHeader title="Security" />
        <SectionCard>
          <TouchableOpacity style={styles.actionRow} onPress={() => { triggerHaptic('light'); setShowChangePassword(true); }}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>Change Password</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Text style={[styles.actionText, { color: theme.colors.danger }]}>Log Out</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionHeader title="Workspace" />
        <SectionCard>
          <View style={styles.workspaceRow}>
            <Text style={[styles.workspaceLabel, { color: theme.colors.text.tertiary }]}>Workspace</Text>
            <Text style={[styles.workspaceValue, { color: theme.colors.text.primary }]}>{ws?.name || '—'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.workspaceRow}>
            <Text style={[styles.workspaceLabel, { color: theme.colors.text.tertiary }]}>Your Role</Text>
            <Text style={[styles.workspaceValue, { color: theme.colors.text.primary, textTransform: 'capitalize' }]}>{myRole}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.workspaceRow}>
            <Text style={[styles.workspaceLabel, { color: theme.colors.text.tertiary }]}>Members</Text>
            <Text style={[styles.workspaceValue, { color: theme.colors.text.primary }]}>{memberCount}</Text>
          </View>
        </SectionCard>

        <SectionHeader title="About" />
        <SectionCard>
          <View style={styles.workspaceRow}>
            <Text style={[styles.workspaceLabel, { color: theme.colors.text.tertiary }]}>Synapse</Text>
            <Text style={[styles.workspaceValue, { color: theme.colors.text.primary }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.workspaceRow}>
            <Text style={[styles.workspaceLabel, { color: theme.colors.text.tertiary }]}>Build</Text>
            <Text style={[styles.workspaceValue, { color: theme.colors.text.primary }]}>2024.1</Text>
          </View>
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {showChangePassword && (
        <View style={[styles.passwordOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.passwordSheet, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.passwordHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.passwordTitle, { color: theme.colors.text.primary }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Text style={[styles.passwordCancel, { color: theme.colors.text.tertiary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordBody}>
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text.primary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder="Current password" placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}
              />
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text.primary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder="New password (min 8 chars)" placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry value={newPassword} onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.text.primary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder="Confirm new password" placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={[styles.passwordButton, { backgroundColor: theme.colors.primary, opacity: changingPassword ? 0.6 : 1 }]}
                onPress={handleChangePassword} disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.passwordButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1 },
  backArrow: { fontSize: 24, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginTop: 24 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  themeIcon: { fontSize: 16, width: 24 },
  optionLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 17, fontWeight: '700' },
  userEmail: { fontSize: 13 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { fontSize: 17, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 2, minWidth: 120 },
  divider: { height: 1 },
  actionRow: { paddingHorizontal: 16, paddingVertical: 15 },
  actionText: { fontSize: 15, fontWeight: '600' },
  workspaceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  workspaceLabel: { fontSize: 13, fontWeight: '500' },
  workspaceValue: { fontSize: 15, fontWeight: '600' },
  passwordOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  passwordSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  passwordTitle: { fontSize: 17, fontWeight: '700' },
  passwordCancel: { fontSize: 15, fontWeight: '500' },
  passwordBody: { padding: 16, gap: 12 },
  passwordInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  passwordButton: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  passwordButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
