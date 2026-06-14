import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useTask, useUpdateTask, useDeleteTask, useTaskComments, useCreateComment, useDeleteComment } from '../../../../hooks/useTasks';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { triggerHaptic } from '../../../../utils/haptics';
import { formatDate, formatRelativeTime } from '../../../../utils/date';
import { getInitials } from '../../../../utils/formatting';
import { useAuthStore } from '../../../../store/authStore';
import { TaskStatus, TaskPriority } from '../../../../types/project';

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'none', label: 'None', color: '#64748B' },
  { key: 'low', label: 'Low', color: '#64748B' },
  { key: 'medium', label: 'Medium', color: '#3B82F6' },
  { key: 'high', label: 'High', color: '#F59E0B' },
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
];

export default function TaskDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const scrollRef = useRef<ScrollView>(null);

  const { data: task, isLoading, isError, refetch } = useTask(id);
  const { data: commentsData, refetch: refetchComments } = useTaskComments(id);
  const { mutateAsync: updateTask, isPending: updating } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: addComment } = useCreateComment();
  const { mutateAsync: removeComment } = useDeleteComment();

  const [commentText, setCommentText] = useState('');

  const comments = commentsData?.data ?? [];

  const handleStatusChange = useCallback((newStatus: TaskStatus) => {
    triggerHaptic('light');
    updateTask({ id: id!, input: { status: newStatus } }).catch(() => {
      triggerHaptic('error');
      showToast('Failed to update status', 'error');
    });
  }, [id, updateTask, showToast]);

  const handlePriorityChange = useCallback((newPriority: TaskPriority) => {
    triggerHaptic('light');
    updateTask({ id: id!, input: { priority: newPriority } }).catch(() => {
      triggerHaptic('error');
      showToast('Failed to update priority', 'error');
    });
  }, [id, updateTask, showToast]);

  const handleDeleteTask = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert('Delete Task', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTask(id!);
          triggerHaptic('success');
          showToast('Task deleted', 'success');
          router.back();
        } catch {
          triggerHaptic('error');
          showToast('Failed to delete task', 'error');
        }
      }},
    ]);
  }, [id, deleteTask, router, showToast]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    Keyboard.dismiss();
    try {
      triggerHaptic('light');
      await addComment({ taskId: id!, input: { content: commentText.trim() } });
      setCommentText('');
      refetchComments();
    } catch {
      triggerHaptic('error');
      showToast('Failed to add comment', 'error');
    }
  }, [commentText, id, addComment, refetchComments, showToast]);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        removeComment({ taskId: id!, commentId }).catch(() => {
          showToast('Failed to delete comment', 'error');
        });
      }},
    ]);
  }, [id, removeComment, showToast]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingView fullScreen message="Loading task..." />
      </SafeAreaView>
    );
  }

  if (isError || !task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorState title="Could not load task" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteTask} style={styles.headerButton}>
          {updating ? <ActivityIndicator size="small" /> : <Text color="danger" weight="semibold">Delete</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Heading level={1} style={styles.taskTitle}>{task.title}</Heading>
          {task.description && (
            <Text variant="bodyLarge" color="secondary" style={styles.description}>
              {task.description}
            </Text>
          )}

          <View style={styles.metaSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>STATUS</Text>
            <View style={styles.chipRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, { backgroundColor: task.status === s.key ? theme.colors.primaryLight : theme.colors.surface, borderColor: task.status === s.key ? theme.colors.primary : theme.colors.border }]}
                  onPress={() => handleStatusChange(s.key)}
                >
                  <Text variant="bodySmall" weight={task.status === s.key ? 'semibold' : 'regular'} color={task.status === s.key ? 'primary' : 'secondary'}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 16 }]}>PRIORITY</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.chip, { backgroundColor: task.priority === p.key ? (p.color + '20') : theme.colors.surface, borderColor: task.priority === p.key ? p.color : theme.colors.border }]}
                  onPress={() => handlePriorityChange(p.key)}
                >
                  <Text variant="bodySmall" weight={task.priority === p.key ? 'semibold' : 'regular'} style={{ color: task.priority === p.key ? p.color : theme.colors.text.secondary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.metaGrid}>
              {task.assignee && (
                <View style={styles.metaItem}>
                  <Text variant="caption" color="tertiary">Assignee</Text>
                  <View style={styles.assigneeRow}>
                    <View style={[styles.assigneeDot, { backgroundColor: theme.colors.primary }]} />
                    <Text variant="bodySmall">{task.assignee.name}</Text>
                  </View>
                </View>
              )}
              {task.dueDate && (
                <View style={styles.metaItem}>
                  <Text variant="caption" color="tertiary">Due Date</Text>
                  <Text variant="bodySmall" color={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'danger' : 'primary'}>
                    {formatDate(task.dueDate)}
                  </Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Text variant="caption" color="tertiary">Created</Text>
                <Text variant="bodySmall">{formatRelativeTime(task.createdAt)}</Text>
              </View>
            </View>

            {task.labels.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 16 }]}>LABELS</Text>
                <View style={styles.chipRow}>
                  {task.labels.map(l => (
                    <View key={l.id} style={[styles.labelPill, { backgroundColor: l.color + '20', borderColor: l.color }]}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: l.color }}>{l.name}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            COMMENTS ({comments.length})
          </Text>

          {comments.length === 0 && (
            <View style={styles.emptyComments}>
              <Text variant="bodyMedium" color="tertiary">No comments yet</Text>
            </View>
          )}

          {comments.map((comment) => {
            const isAuthor = comment.authorId === user?.id;
            return (
              <View key={comment.id} style={[styles.commentRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.commentAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[styles.commentAvatarText, { color: theme.colors.primary }]}>
                    {getInitials(comment.author.name)}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text weight="semibold" variant="bodySmall">{comment.author.name}</Text>
                    <Text variant="caption" color="tertiary">{formatRelativeTime(comment.createdAt)}</Text>
                  </View>
                  <Text variant="bodyMedium">{comment.content}</Text>
                  {isAuthor && (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={styles.deleteComment}>
                      <Text variant="caption" color="danger">Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.commentInputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleAddComment}
            style={[styles.sendButton, { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.border }]}
            disabled={!commentText.trim()}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Send</Text>
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
  headerButton: { minWidth: 50, alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 100 },
  taskTitle: { marginBottom: 8 },
  description: { marginBottom: 24, lineHeight: 22 },
  metaSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  metaGrid: { marginTop: 16, gap: 12 },
  metaItem: { gap: 4 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeDot: { width: 8, height: 8, borderRadius: 4 },
  labelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5 },
  divider: { height: 1, marginVertical: 24 },
  emptyComments: { paddingVertical: 32, alignItems: 'center' },
  commentRow: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '600' },
  commentBody: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteComment: { marginTop: 4 },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});
