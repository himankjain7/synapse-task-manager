import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useCreateProject } from '../../../hooks/useProjects';
import { useToastStore } from '../../../store/toastStore';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { FadeIn } from '../../../components/animations/FadeIn';
import { PressScale } from '../../../components/animations/PressScale';
import { triggerHaptic } from '../../../utils/haptics';

const PROJECT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const PROJECT_ICONS = ['📋', '🚀', '🎯', '💡', '📊', '🎨', '⚡', '🛠', '📝', '🎉'];

export default function CreateProjectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { workspaceId } = useLocalSearchParams<{
  workspaceId: string;
}>();
  const showToast = useToastStore((s) => s.showToast);
  const { mutateAsync: createProject, isPending } = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      triggerHaptic('error');
      showToast('Project name is required', 'error');
      return;
    }
    try {
      triggerHaptic('medium');
      await createProject({
  workspaceId,
  input: {
    name: name.trim(),
    description: description.trim() || undefined,
    color,
    icon,
  },
});
      triggerHaptic('success');
      showToast('Project created', 'success');
      router.back();
    } catch {
      triggerHaptic('error');
      showToast('Failed to create project', 'error');
    }
  }, [name, description, color, icon, createProject, router, showToast]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Cancel</Text>
        </TouchableOpacity>
        <Heading level={4}>New Project</Heading>
        <PressScale scaleTo={0.9}>
          <TouchableOpacity onPress={handleCreate} style={styles.headerButton} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text color="primary" weight="semibold">Create</Text>
            )}
          </TouchableOpacity>
        </PressScale>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FadeIn spring>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>ICON</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
            {PROJECT_ICONS.map((em) => (
              <PressScale key={em} scaleTo={0.88}>
                <TouchableOpacity
                  style={[
                    styles.iconOption,
                    { backgroundColor: icon === em ? theme.colors.primaryLight : theme.colors.surface, borderColor: icon === em ? theme.colors.primary : theme.colors.border },
                  ]}
                  onPress={() => { setIcon(em); triggerHaptic('light'); }}
                >
                  <Text style={styles.iconEmoji}>{em}</Text>
                </TouchableOpacity>
              </PressScale>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>COLOR</Text>
          <View style={styles.colorRow}>
            {PROJECT_COLORS.map((c) => (
              <PressScale key={c} scaleTo={0.88}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorSelected,
                  ]}
                  onPress={() => { setColor(c); triggerHaptic('light'); }}
                />
              </PressScale>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="Project name"
            placeholderTextColor={theme.colors.text.tertiary}
            value={name}
            onChangeText={setName}
            maxLength={60}
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="What's this project about?"
            placeholderTextColor={theme.colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          </FadeIn>
        </ScrollView>
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
  headerButton: { minWidth: 60, alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  iconRow: { flexDirection: 'row', marginBottom: 4 },
  iconOption: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginRight: 10, borderWidth: 1.5,
  },
  iconEmoji: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  colorOption: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  input: {
    borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15,
    marginBottom: 4,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
});
