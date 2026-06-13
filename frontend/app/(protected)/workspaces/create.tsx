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
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useCreateWorkspace } from '../../../hooks/useWorkspaces';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useToastStore } from '../../../store/toastStore';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { triggerHaptic } from '../../../utils/haptics';
import { ApiError } from '../../../utils/error';

export default function CreateWorkspaceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const selectWorkspace = useWorkspaceStore((s) => s.selectWorkspace);
  const showToast = useToastStore((s) => s.showToast);
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nameError = name.length > 0 && name.length < 2 ? 'Name must be at least 2 characters' : null;
  const canSubmit = name.trim().length >= 2 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      triggerHaptic('success');
      showToast('Workspace created successfully', 'success');
      selectWorkspace(workspace.id);
      router.replace(`/(protected)/workspaces/${workspace.id}`);
    } catch (err) {
      triggerHaptic('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create workspace. Please try again.');
      }
    }
  };

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
          <Heading level={4}>New Workspace</Heading>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.field}>
              <Text variant="bodySmall" color="secondary" weight="semibold" style={styles.label}>
                Workspace Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.surface, borderColor: nameError ? theme.colors.danger : theme.colors.border, color: theme.colors.text.primary },
                ]}
                placeholder="e.g. Design Team"
                placeholderTextColor={theme.colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={100}
              />
              <View style={styles.fieldFooter}>
                {nameError && (
                  <Text variant="caption" color="danger">{nameError}</Text>
                )}
                <Text variant="caption" color="tertiary" style={styles.counter}>
                  {name.length}/100
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text variant="bodySmall" color="secondary" weight="semibold" style={styles.label}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary },
                ]}
                placeholder="What's this workspace about?"
                placeholderTextColor={theme.colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text variant="caption" color="tertiary" style={styles.counter}>
                {description.length}/500
              </Text>
            </View>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: theme.colors.danger + '15' }]}>
                <Text color="danger" variant="bodySmall" style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
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
                Create Workspace
              </Text>
            )}
          </TouchableOpacity>
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
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 16,
    minHeight: 100,
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: { textAlign: 'right' },
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
    ...({ shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 } as any),
  },
  submitText: { fontSize: 16 },
});
