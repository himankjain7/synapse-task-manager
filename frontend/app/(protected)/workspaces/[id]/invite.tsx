import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useInviteMember } from '../../../../hooks/useWorkspaces';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { FadeIn } from '../../../../components/animations/FadeIn';
import { PressScale } from '../../../../components/animations/PressScale';
import { triggerHaptic } from '../../../../utils/haptics';
import { ApiError } from '../../../../utils/error';
import { WorkspaceRole } from '../../../../types/workspace';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showToast = useToastStore((s) => s.showToast);
  const { mutateAsync: inviteMember, isPending } = useInviteMember(id);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [error, setError] = useState<string | null>(null);

  const emailError = email.length > 0 && !EMAIL_REGEX.test(email) ? 'Enter a valid email address' : null;
  const canSubmit = EMAIL_REGEX.test(email) && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await inviteMember({ email: email.trim().toLowerCase(), role });
      triggerHaptic('success');
      showToast('Invitation sent successfully', 'success');
      router.back();
    } catch (err) {
      triggerHaptic('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to send invitation. Please try again.');
      }
    }
  };

  const roles: { key: WorkspaceRole; label: string }[] = [
    { key: 'member', label: 'Member' },
    { key: 'admin', label: 'Admin' },
    { key: 'guest', label: 'Guest' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Text color="primary" weight="semibold">Cancel</Text>
          </TouchableOpacity>
          <Heading level={4}>Invite Member</Heading>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FadeIn spring>
            <View style={styles.content}>
            <View style={styles.field}>
              <Text variant="bodySmall" color="secondary" weight="semibold" style={styles.label}>
                Email Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.surface, borderColor: emailError ? theme.colors.danger : theme.colors.border, color: theme.colors.text.primary },
                ]}
                placeholder="colleague@company.com"
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoFocus
              />
              {emailError && (
                <Text variant="caption" color="danger">{emailError}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text variant="bodySmall" color="secondary" weight="semibold" style={styles.label}>
                Role
              </Text>
              <View style={styles.roleRow}>
                {roles.map((r) => (
                  <PressScale key={r.key} scaleTo={0.93}>
                    <TouchableOpacity
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: role === r.key ? theme.colors.primary : theme.colors.surface,
                          borderColor: role === r.key ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        setRole(r.key);
                        triggerHaptic('light');
                      }}
                    >
                      <Text
                        variant="bodySmall"
                        weight="semibold"
                        style={{ color: role === r.key ? theme.colors.text.onPrimary : theme.colors.text.primary }}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  </PressScale>
                ))}
              </View>
            </View>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: theme.colors.danger + '15' }]}>
                <Text color="danger" variant="bodySmall" style={styles.errorText}>{error}</Text>
              </View>
            )}
            </View>
          </FadeIn>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <PressScale lift scaleTo={0.96}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary, opacity: canSubmit ? 1 : 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color={theme.colors.text.onPrimary} />
              ) : (
                <Text style={[styles.submitText, { color: theme.colors.text.onPrimary }]} weight="semibold">
                  Send Invitation
                </Text>
              )}
            </TouchableOpacity>
          </PressScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: { width: 60 },
  scroll: { flexGrow: 1 },
  content: { padding: 24, gap: 24 },
  field: { gap: 6 },
  label: { letterSpacing: 0.3, textTransform: 'uppercase' },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
  },
  errorText: { textAlign: 'center' },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: { fontSize: 16 },
});
