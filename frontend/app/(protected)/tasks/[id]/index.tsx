import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useTask, useUpdateTask, useDeleteTask, useTaskComments, useCreateComment, useDeleteComment, useLabels, useAssignLabel, useRemoveLabel, useActivity } from '../../../../hooks/useTasks';
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

const STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: '#64748B' },
  { key: 'todo', label: 'Todo', color: '#3B82F6' },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { key: 'review', label: 'Review', color: '#8B5CF6' },
  { key: 'done', label: 'Done', color: '#10B981' },
];

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: '#64748B' },
  { key: 'medium', label: 'Medium', color: '#3B82F6' },
  { key: 'high', label: 'High', color: '#F59E0B' },
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
];

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginTop: 16, color }}>{children}</Text>
  );
}

export default function TaskDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const scrollRef = useRef<ScrollView>(null);

  const taskId = id as string;

const { data: task, isLoading, isError, refetch } =
  useTask(undefined, taskId);

const projectId = task?.projectId;

const { data: commentsData, refetch: refetchComments } =
  useTaskComments(taskId);

const { mutateAsync: updateTask, isPending: updating } =
  useUpdateTask();

const { mutateAsync: deleteTask } =
  useDeleteTask();

const { mutateAsync: addComment } =
  useCreateComment();

const { mutateAsync: removeComment } =
  useDeleteComment();

  const workspaceId = task && 'workspaceId' in task ? (task as any).workspaceId : undefined;
  const { data: labelsData } = useLabels(task?.projectId);
  const { mutateAsync: assignLabel } = useAssignLabel();
  const { mutateAsync: removeLabel } = useRemoveLabel();
  const { data: activityData } = useActivity(workspaceId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const comments = commentsData?.data ?? [];
  const labels = labelsData ?? [];
  const taskLabels = task?.labels ?? [];
  const activityItems = activityData?.filter(a => {
    const details = (a as any).details;
    return details?.taskId === id || details?.commentTaskId === id;
  }) ?? [];

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescriptionDraft(task.description ?? '');
    }
  }, [task]);

  const handleSaveTitle = useCallback(async () => {
    if (!titleDraft.trim() || titleDraft === task?.title) { setEditingTitle(false); return; }
    Keyboard.dismiss();
    try {
      await updateTask({
  projectId: projectId!,
  id: id!,
  input: { title: titleDraft.trim() }
});
      triggerHaptic('light');
      showToast('Title updated', 'success');
      setEditingTitle(false);
    } catch { triggerHaptic('error'); showToast('Failed to update', 'error'); }
  }, [titleDraft, task, id, updateTask, showToast]);

  const handleSaveDescription = useCallback(async () => {
  if (descriptionDraft === (task?.description ?? '')) {
    setEditingDescription(false);
    return;
  }

  Keyboard.dismiss();

  try {
    console.log('DESCRIPTION SAVING:', descriptionDraft);

    await updateTask({
      projectId: projectId!,
      id: taskId,
      input: {
        description: descriptionDraft.trim(),
      },
    });

    await refetch();

    console.log('DESCRIPTION UPDATED SUCCESS');

    showToast('Description updated', 'success');
    setEditingDescription(false);
  } catch (error) {
    console.error('DESCRIPTION ERROR:', error);
    showToast('Failed to update description', 'error');
  }
}, [
  descriptionDraft,
  task,
  projectId,
  taskId,
  updateTask,
  refetch,
  showToast,
]);

  const handleStatusChange = useCallback((newStatus: TaskStatus) => {
  triggerHaptic('light');

  updateTask({
    projectId: projectId!,
    id: id!,
    input: { status: newStatus }
  })
    .then((res) => {
      console.log('STATUS UPDATED', res);
      refetch();
    })
    .catch((err) => {
      console.log('STATUS ERROR', err);
      triggerHaptic('error');
      showToast('Failed to update status', 'error');
    });
}, [projectId, id, updateTask, refetch, showToast]);

const handlePriorityChange = useCallback((newPriority: TaskPriority) => {
  triggerHaptic('light');

  updateTask({
    projectId: projectId!,
    id: id!,
    input: { priority: newPriority }
  })
    .then((res) => {
      console.log('PRIORITY UPDATED', res);
      refetch();
    })
    .catch((err) => {
      console.log('PRIORITY ERROR', err);
      triggerHaptic('error');
      showToast('Failed to update priority', 'error');
    });
}, [projectId, id, updateTask, refetch, showToast]);

  const handleDeleteTask = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert('Delete Task', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteTask({
  projectId: projectId!,
  id: id!,
}); triggerHaptic('success'); showToast('Task deleted', 'success'); router.back(); }
        catch { triggerHaptic('error'); showToast('Failed to delete', 'error'); }
      }},
    ]);
  }, [id, deleteTask, router, showToast]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    Keyboard.dismiss();
    try { triggerHaptic('light'); await addComment({ taskId: id!, input: { content: commentText.trim() } }); setCommentText(''); refetchComments(); }
    catch { triggerHaptic('error'); showToast('Failed to add comment', 'error'); }
  }, [commentText, id, addComment, refetchComments, showToast]);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeComment({ taskId: id!, commentId }).catch(() => showToast('Failed to delete', 'error')); }},
    ]);
  }, [id, removeComment, showToast]);

  const handleToggleLabel = useCallback(async (labelId: string) => {
    try {
      const isAssigned = taskLabels.some(l => l.id === labelId);
      if (isAssigned) {
        await removeLabel({ taskId: id!, labelId });
      } else {
        await assignLabel({ taskId: id!, labelId });
      }
      triggerHaptic('light');
      refetch();
    } catch { triggerHaptic('error'); showToast('Failed to update labels', 'error'); }
  }, [id, taskLabels, assignLabel, removeLabel, refetch, showToast]);

  if (isLoading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LoadingView fullScreen message="Loading task..." />
    </SafeAreaView>;
  }

  if (isError || !task) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ErrorState title="Could not load task" onRetry={refetch} />
    </SafeAreaView>;
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const currentStatus = STATUSES.find(s => s.key === task.status);
  const currentPriority = PRIORITIES.find(p => p.key === task.priority);
  const unassignedLabels = labels.filter(l => !taskLabels.some(tl => tl.id === l.id));

  const activityLogs: any[] = activityItems.length > 0 ? activityItems : [
    { id: 'created', action: 'task_created', createdAt: task.createdAt, user: task.createdBy, details: {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => {
            triggerHaptic('light');
            Alert.alert('Task Options', undefined, [
              { text: 'Delete', style: 'destructive', onPress: handleDeleteTask },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }} style={styles.headerBtn}>
            <Text style={{ fontSize: 18 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: (currentStatus?.color || '#64748B') + '12' }]}>
            <View style={[styles.statusBannerDot, { backgroundColor: currentStatus?.color }]} />
            <Text weight="semibold" style={{ color: currentStatus?.color }}>{currentStatus?.label}</Text>
            {task.priority !== 'low' && (
              <>
                <Text style={{ color: theme.colors.text.tertiary, marginHorizontal: 8 }}>·</Text>
                <View style={[styles.priorityBadge, { backgroundColor: (currentPriority?.color || '#64748B') + '20' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: currentPriority?.color }}>{task.priority}</Text>
                </View>
              </>
            )}
          </View>

          {/* Title - Inline Editable */}
          {editingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: theme.colors.text.primary, borderColor: theme.colors.primary }]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={handleSaveTitle}
              onSubmitEditing={handleSaveTitle}
              autoFocus
              maxLength={200}
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity onLongPress={() => { setEditingTitle(true); triggerHaptic('light'); }}>
              <Heading level={1} style={styles.taskTitle}>{task.title}</Heading>
            </TouchableOpacity>
          )}

          {/* Description - Inline Editable */}
{editingDescription ? (
  <>
    <TextInput
      style={[
        styles.descInput,
        {
          color: theme.colors.text.secondary,
          borderColor: theme.colors.primary,
        },
      ]}
      value={descriptionDraft}
      onChangeText={setDescriptionDraft}
      multiline
      autoFocus
      maxLength={2000}
    />

    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
      }}
    >
      <TouchableOpacity onPress={handleSaveDescription}>
        <Text
          style={{
            color: '#2563EB',
            fontWeight: '600',
          }}
        >
          Save
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setDescriptionDraft(task?.description || '');
          setEditingDescription(false);
        }}
      >
        <Text
          style={{
            color: '#EF4444',
            fontWeight: '600',
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  </>
) : (
  <TouchableOpacity
    onLongPress={() => {
      setEditingDescription(true);
      triggerHaptic('light');
    }}
  >
    {task.description ? (
      <Text
        variant="bodyLarge"
        color="secondary"
        style={styles.description}
      >
        {task.description}
      </Text>
    ) : (
      <Text
        variant="bodyMedium"
        color="tertiary"
        style={styles.description}
      >
        Add description...
      </Text>
    )}
  </TouchableOpacity>
)}

          {/* Quick Meta Row */}
          <View style={styles.quickMeta}>
            {task.dueDate && (
              <View style={[styles.quickMetaItem, { backgroundColor: isOverdue ? theme.colors.dangerLight : theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text variant="caption" color={isOverdue ? 'danger' : 'tertiary'}>Due</Text>
                <Text variant="bodySmall" color={isOverdue ? 'danger' : 'primary'} weight="semibold">
                  {formatDate(task.dueDate)}
                </Text>
              </View>
            )}
            {task.assignee && (
              <View style={[styles.quickMetaItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text variant="caption" color="tertiary">Assignee</Text>
                <View style={styles.assigneeRow}>
                  <View style={[styles.assigneeAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.activityAvatar, { color: theme.colors.primary }]}>
                      {getInitials(
  task?.assignee?.name ??
  'Unassigned'
)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" weight="semibold" numberOfLines={1}>{
 task?.assignee?.name ??
 'Unassigned'}</Text>
                </View>
              </View>
            )}
            {task.createdBy && (
              <View style={[styles.quickMetaItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text variant="caption" color="tertiary">Created by</Text>
                <Text variant="bodySmall" weight="semibold" numberOfLines={1}>{task.createdBy?.name ?? 'Unknown User'}</Text>
              </View>
            )}
          </View>

          {/* Status Selector */}
          <SectionTitle color={theme.colors.text.secondary}>STATUS</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, { backgroundColor: task.status === s.key ? s.color + '18' : theme.colors.surface, borderColor: task.status === s.key ? s.color : theme.colors.border }]}
                  onPress={() => handleStatusChange(s.key)}
                >
                  <View style={[styles.chipDot, { backgroundColor: s.color }]} />
                  <Text variant="bodySmall" weight={task.status === s.key ? 'semibold' : 'regular'} style={{ color: task.status === s.key ? s.color : theme.colors.text.secondary }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Priority Selector */}
          <SectionTitle color={theme.colors.text.secondary}>PRIORITY</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.chip, { backgroundColor: task.priority === p.key ? p.color + '20' : theme.colors.surface, borderColor: task.priority === p.key ? p.color : theme.colors.border }]}
                  onPress={() => handlePriorityChange(p.key)}
                >
                  <Text variant="bodySmall" weight={task.priority === p.key ? 'semibold' : 'regular'} style={{ color: task.priority === p.key ? p.color : theme.colors.text.secondary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Labels Section */}
          <View style={styles.labelsSectionHeader}>
            <SectionTitle color={theme.colors.text.secondary}>LABELS</SectionTitle>
            <TouchableOpacity onPress={() => { triggerHaptic('light'); setShowLabelPicker(true); }}>
              <Text variant="caption" color="primary">Manage</Text>
            </TouchableOpacity>
          </View>
          {taskLabels.length > 0 ? (
            <View style={styles.chipRow}>
              {taskLabels.map(l => (
                <View key={l.id} style={[styles.labellPill, { backgroundColor: l.color + '20', borderColor: l.color }]}>
                  <View style={[styles.labelDot, { backgroundColor: l.color }]} />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: l.color }}>{l.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="bodySmall" color="tertiary">No labels</Text>
          )}

          {/* Activity Timeline */}
          <SectionTitle color={theme.colors.text.secondary}>ACTIVITY</SectionTitle>
          {activityLogs.map((log) => {
            const actionLabels: Record<string, string> = {
              task_created: 'created this task',
              task_updated: 'updated this task',
              task_status_changed: 'changed the status',
              task_assigned: 'updated the assignee',
              comment_added: 'added a comment',
            };
            let actionText = actionLabels[log.action] || log.action.replace(/_/g, ' ');
            let details = log.details as any;

            if (log.action === 'task_status_changed' && details) {
              actionText = `moved from ${details.from || '?'} to ${details.to || '?'}`;
            }

            return (
              <View key={log.id} style={[styles.activityRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.activityDot, { backgroundColor: log.action === 'comment_added' ? theme.colors.success : theme.colors.primary }]} />
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <View style={[styles.activityAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={[styles.activityAvatarText, { color: theme.colors.primary }]}>
                        {getInitials(log.user?.name ?? 'Unknown User')}
                      </Text>
                    </View>
                    <View style={styles.activityTextWrap}>
                      <Text variant="bodySmall">
                        <Text weight="semibold">{log.user?.name ?? 'Unknown User'}</Text>
                        {' '}{actionText}
                      </Text>
                    </View>
                  </View>
                  <Text variant="caption" color="tertiary">{formatRelativeTime(log.createdAt)}</Text>
                </View>
              </View>
            );
          })}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Comments */}
          <SectionTitle color={theme.colors.text.secondary}>COMMENTS ({comments.length})</SectionTitle>
          {comments.length === 0 && (
            <View style={styles.emptyComments}>
              <Text variant="bodyMedium" color="tertiary">No comments yet</Text>
            </View>
          )}
          {comments.map(comment => {
  console.log('COMMENT', comment);
  console.log('USER', user);

  const isAuthor = (comment as any).userId === user?.id;

  return (
    <View
      key={comment.id}
      style={[
        styles.commentRow,
        { borderBottomColor: theme.colors.border },
      ]}
    >
      <View
        style={[
          styles.commentAvatar,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        <Text
          style={[
            styles.commentAvatarText,
            { color: theme.colors.primary },
          ]}
        >
          {getInitials((comment as any).user?.name ?? 'U')}
        </Text>
      </View>

      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text weight="semibold" variant="bodySmall">
            {(comment as any).user?.name ?? 'Unknown User'}
          </Text>

          <Text variant="caption" color="tertiary">
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </View>

        <Text variant="bodyMedium">
          {comment.content}
        </Text>

        {isAuthor && (
          <TouchableOpacity
            onPress={() => handleDeleteComment(comment.id)}
            style={styles.deleteComment}
          >
            <Text variant="caption" color="danger">
              Delete
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
})}
        </ScrollView>

        {/* Comment Input */}
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

      {/* Label Picker Modal */}
      <Modal visible={showLabelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Heading level={4}>Manage Labels</Heading>
              <TouchableOpacity onPress={() => setShowLabelPicker(false)}>
                <Text color="primary" weight="semibold">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {labels.map(label => {
                const isAssigned = taskLabels.some(l => l.id === label.id);
                return (
                  <TouchableOpacity
                    key={label.id}
                    style={[styles.labelPickerRow, { backgroundColor: isAssigned ? label.color + '15' : theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => handleToggleLabel(label.id)}
                  >
                    <View style={[styles.labelPickerDot, { backgroundColor: label.color }]} />
                    <Text weight={isAssigned ? 'semibold' : 'regular'}>{label.name}</Text>
                    <View style={[styles.checkbox, { backgroundColor: isAssigned ? label.color : 'transparent', borderColor: isAssigned ? label.color : theme.colors.border }]}>
                      {isAssigned && <Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {labels.length === 0 && (
                <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24 }}>
                  No labels created for this project
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { minWidth: 44, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  scroll: { padding: 20, paddingBottom: 100 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16, gap: 8 },
  statusBannerDot: { width: 10, height: 10, borderRadius: 5 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  taskTitle: { marginBottom: 12 },
  titleInput: { fontSize: 24, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 4, marginBottom: 12 },
  description: { marginBottom: 16, lineHeight: 22 },
  descInput: { fontSize: 15, lineHeight: 22, borderBottomWidth: 2, paddingVertical: 4, marginBottom: 16, minHeight: 60, textAlignVertical: 'top' },
  quickMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  quickMetaItem: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4, minWidth: 100 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeAvatar: { width: 20, height: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  assigneeAvatarText: { fontSize: 10, fontWeight: '600' },
  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  labellPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5, gap: 5 },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  labelsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, marginVertical: 20 },
  activityRow: { flexDirection: 'row', paddingVertical: 10, gap: 10, borderBottomWidth: 0.5 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityContent: { flex: 1, gap: 2 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityAvatar: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  activityAvatarText: { fontSize: 10, fontWeight: '600' },
  activityTextWrap: { flex: 1 },
  emptyComments: { paddingVertical: 32, alignItems: 'center' },
  commentRow: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '600' },
  commentBody: { flex: 1, gap: 4 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteComment: { marginTop: 4 },
  commentInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  labelPickerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  labelPickerDot: { width: 12, height: 12, borderRadius: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
});
