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
import { useTheme } from '../../../../../hooks/useTheme';
import { useCreateTask } from '../../../../../hooks/useTasks';
import { useToastStore } from '../../../../../store/toastStore';
import { Text } from '../../../../../components/typography/Text';
import { Heading } from '../../../../../components/typography/Heading';
import { triggerHaptic } from '../../../../../utils/haptics';
import { TaskPriority, TaskStatus } from '../../../../../types/project';

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: '#64748B' },
  { key: 'medium', label: 'Medium', color: '#3B82F6' },
  { key: 'high', label: 'High', color: '#F59E0B' },
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
];

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export default function CreateTaskScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const showToast = useToastStore((s) => s.showToast);
  const { mutateAsync: createTask, isPending } = useCreateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('low');

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      triggerHaptic('error');
      showToast('Task title is required', 'error');
      return;
    }
    try {
      triggerHaptic('medium');
      await createTask({
        projectId: projectId!,
        input: { title: title.trim(), description: description.trim() || undefined, status, priority },
      });
      triggerHaptic('success');
      showToast('Task created', 'success');
      router.back();
    } catch {
      triggerHaptic('error');
      showToast('Failed to create task', 'error');
    }
  }, [title, description, status, priority, projectId, createTask, router, showToast]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Cancel</Text>
        </TouchableOpacity>
        <Heading level={4}>New Task</Heading>
        <TouchableOpacity onPress={handleCreate} style={styles.headerButton} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text color="primary" weight="semibold">Add</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>TITLE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            autoFocus
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="Add details..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>STATUS</Text>
          <View style={styles.chipRow}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, { backgroundColor: status === s.key ? theme.colors.primaryLight : theme.colors.surface, borderColor: status === s.key ? theme.colors.primary : theme.colors.border }]}
                onPress={() => { setStatus(s.key); triggerHaptic('light'); }}
              >
                <Text variant="bodySmall" weight={status === s.key ? 'semibold' : 'regular'} color={status === s.key ? 'primary' : 'secondary'}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>PRIORITY</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, { backgroundColor: priority === p.key ? theme.colors.primaryLight : theme.colors.surface, borderColor: priority === p.key ? p.color : theme.colors.border }]}
                onPress={() => { setPriority(p.key); triggerHaptic('light'); }}
              >
                <Text variant="bodySmall" weight={priority === p.key ? 'semibold' : 'regular'} style={{ color: priority === p.key ? p.color : theme.colors.text.secondary }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 4 },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
});
