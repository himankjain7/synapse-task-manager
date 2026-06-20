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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../hooks/useTheme';
import { useTask, useUpdateTask, useDeleteTask, useTaskComments, useCreateComment, useDeleteComment, useLabels, useCreateLabel, useAssignLabel, useRemoveLabel, useTaskActivity } from '../../../../hooks/useTasks';
import { useMembers } from '../../../../hooks/useWorkspaces';
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
  { key: 'low', label: 'Low', color: '#3B82F6' },
  { key: 'medium', label: 'Medium', color: '#F59E0B' },
  { key: 'high', label: 'High', color: '#EF4444' },
  { key: 'urgent', label: 'Urgent', color: '#DC2626' },
];

function fmt(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(d: unknown): string {
  if (typeof d !== 'string') return '';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[parseInt(parts[1], 10) - 1] || parts[1];
  return `${parseInt(parts[2], 10)} ${month} ${parts[0]}`;
}

function formatActivity(action: string, details: Record<string, unknown>, userName: string): string {
  const actions: Record<string, string> = {
    task_created: `${userName} created this task`,
    title_changed: `${userName} changed title from "${details.from}" to "${details.to}"`,
    description_changed: `${userName} updated the description`,
    status_changed: `${userName} changed status from ${fmt(details.from)} to ${fmt(details.to)}`,
    priority_changed: `${userName} changed priority from ${fmt(details.from)} to ${fmt(details.to)}`,
    assignee_changed: details.to ? `${userName} assigned task to ${details.to}` : `${userName} removed assignee`,
    due_date_changed: details.to ? `${userName} set due date to ${fmtDate(details.to)}` : `${userName} removed due date`,
    label_added: `${userName} added label ${details.label || ''}`,
    label_removed: `${userName} removed label ${details.label || ''}`,
    comment_created: `${userName} added a comment`,
    comment_deleted: details.content ? `${userName} deleted comment: ${details.content}` : `${userName} deleted a comment`,
  };
  return actions[action] || `${userName} ${action.replace(/_/g, ' ')}`;
}

export default function TaskDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const scrollRef = useRef<ScrollView>(null);

  const { data: task, isLoading, isError, refetch } =
  useTask(id);
  const { data: commentsData, refetch: refetchComments } = useTaskComments(id);
  const { data: activityData } = useTaskActivity(id);
  const { mutateAsync: updateTask, isPending: updating } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: addComment } = useCreateComment();
  const { mutateAsync: removeComment } = useDeleteComment();

  const workspaceId = task ? (task as any).workspaceId || (task as any).project?.workspaceId : undefined;
  const projectId = task?.projectId;
  const { data: membersData } = useMembers(workspaceId);
  const { data: labelsData, refetch: refetchLabels } = useLabels(projectId);
  const { mutateAsync: assignLabel } = useAssignLabel();
  const { mutateAsync: removeLabel } = useRemoveLabel();
  const { mutateAsync: createLabel } = useCreateLabel();
  const [newLabelName, setNewLabelName] = useState('');

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customPickerDate, setCustomPickerDate] = useState(new Date());

  const comments = commentsData?.data ?? [];
  const labels = labelsData ?? [];
  const taskLabels = task?.labels ?? [];
  const members = membersData?.data ?? [];

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescriptionDraft(task.description || '');
    }
  }, [task]);

  const handleSaveTitle = useCallback(async () => {
    if (!titleDraft.trim() || titleDraft === task?.title) { setEditingTitle(false); return; }
    Keyboard.dismiss();
    try { await updateTask({ id: id!, input: { title: titleDraft.trim() } }); triggerHaptic('light'); showToast('Title updated', 'success'); setEditingTitle(false); }
    catch { triggerHaptic('error'); showToast('Failed to update', 'error'); }
  }, [titleDraft, task, id, updateTask, showToast]);

  const handleCancelTitle = useCallback(() => {
    Keyboard.dismiss();
    setTitleDraft(task?.title || '');
    setEditingTitle(false);
  }, [task]);

  const handleSaveDescription = useCallback(async () => {
    if (descriptionDraft === (task?.description || '')) { setEditingDescription(false); return; }
    Keyboard.dismiss();
    try { await updateTask({ id: id!, input: { description: descriptionDraft || null } as any }); triggerHaptic('light'); showToast('Description updated', 'success'); setEditingDescription(false); }
    catch { triggerHaptic('error'); showToast('Failed to update', 'error'); }
  }, [descriptionDraft, task, id, updateTask, showToast]);

  const handleCancelDescription = useCallback(() => {
    Keyboard.dismiss();
    setDescriptionDraft(task?.description || '');
    setEditingDescription(false);
  }, [task]);

  const handleStatusChange = useCallback((newStatus: TaskStatus) => {
    triggerHaptic('light');
    updateTask({ id: id!, input: { status: newStatus } }).catch(() => { triggerHaptic('error'); showToast('Failed to update status', 'error'); });
  }, [id, updateTask, showToast]);

  const handlePriorityChange = useCallback((newPriority: TaskPriority) => {
    triggerHaptic('light');
    updateTask({ id: id!, input: { priority: newPriority } }).catch(() => { triggerHaptic('error'); showToast('Failed to update priority', 'error'); });
  }, [id, updateTask, showToast]);

  const handleAssigneeChange = useCallback(async (assigneeId: string | null) => {
    setShowAssigneePicker(false);
    triggerHaptic('light');
    try {
      await updateTask({ id: id!, input: { assigneeId } as any });
      showToast(assigneeId ? 'Task assigned' : 'Assignee removed', 'success');
    } catch { triggerHaptic('error'); showToast('Failed to assign', 'error'); }
  }, [id, updateTask, showToast]);

  const handleDueDateChange = useCallback(async (date: string | null) => {
    setShowDatePicker(false);
    triggerHaptic('light');
    try {
      await updateTask({ id: id!, input: { dueDate: date } as any });
      showToast(date ? 'Due date set' : 'Due date removed', 'success');
    } catch { triggerHaptic('error'); showToast('Failed to update due date', 'error'); }
  }, [id, updateTask, showToast]);

  const handleDeleteTask = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert('Delete Task', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteTask(id!); triggerHaptic('success'); showToast('Task deleted', 'success'); router.back(); } catch { triggerHaptic('error'); showToast('Failed to delete', 'error'); } } },
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
      { text: 'Delete', style: 'destructive', onPress: () => { removeComment({ taskId: id!, commentId }).catch(() => showToast('Failed to delete', 'error')); } },
    ]);
  }, [id, removeComment, showToast]);

  const handleToggleLabel = useCallback(async (labelId: string) => {
    try {
      const isAssigned = taskLabels.some(l => l.id === labelId);
      if (isAssigned) await removeLabel({ taskId: id!, labelId });
      else await assignLabel({ taskId: id!, labelId });
      triggerHaptic('light');
      refetch();
    } catch { triggerHaptic('error'); showToast('Failed to update labels', 'error'); }
  }, [id, taskLabels, assignLabel, removeLabel, refetch, showToast]);

  const handleCreateLabel = useCallback(async () => {
    if (!newLabelName.trim() || !projectId) return;
    try {
      await createLabel({ projectId, input: { name: newLabelName.trim(), color: '#6366F1' } });
      triggerHaptic('light');
      setNewLabelName('');
      refetchLabels();
    } catch { triggerHaptic('error'); showToast('Failed to create label', 'error'); }
  }, [newLabelName, projectId, createLabel, refetchLabels, showToast]);

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
  const currentAssignee = members.find(m => m.userId === task.assigneeId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => { triggerHaptic('light'); Alert.alert('Task Options', undefined, [
            { text: 'Delete', style: 'destructive', onPress: handleDeleteTask },
            { text: 'Cancel', style: 'cancel' },
          ]); }} style={styles.headerBtn}>
            <Text style={{ fontSize: 18 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: (currentStatus?.color || '#64748B') + '12' }]}>
            <View style={[styles.bannerDot, { backgroundColor: currentStatus?.color }]} />
            <Text weight="semibold" style={{ color: currentStatus?.color }}>{currentStatus?.label}</Text>
            {task.priority !== 'low' && (
              <View style={[styles.priorityBadge, { backgroundColor: (currentPriority?.color || '#64748B') + '20' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: currentPriority?.color }}>{task.priority}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          {editingTitle ? (
            <View>
              <TextInput style={[styles.titleInput, { color: theme.colors.text.primary, borderColor: theme.colors.primary }]}
                value={titleDraft} onChangeText={setTitleDraft} onBlur={handleSaveTitle} onSubmitEditing={handleSaveTitle}
                autoFocus maxLength={200} returnKeyType="done"
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancelTitle}
                  style={[styles.editBtnCancel, { borderColor: theme.colors.border }]}>
                  <Text color="secondary" weight="semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTitle}
                  style={[styles.editBtnSave, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onLongPress={() => { setEditingTitle(true); triggerHaptic('light'); }}>
              <Heading level={1} style={styles.taskTitle}>{task.title}</Heading>
            </TouchableOpacity>
          )}

          {/* Description */}
          {editingDescription ? (
            <View>
              <TextInput style={[styles.descInput, { color: theme.colors.text.secondary, borderColor: theme.colors.primary }]}
                value={descriptionDraft} onChangeText={setDescriptionDraft}
                multiline autoFocus maxLength={2000}
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancelDescription}
                  style={[styles.editBtnCancel, { borderColor: theme.colors.border }]}>
                  <Text color="secondary" weight="semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveDescription}
                  style={[styles.editBtnSave, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onLongPress={() => { setEditingDescription(true); triggerHaptic('light'); }}>
              {task.description ? (
                <Text variant="bodyLarge" color="secondary" style={styles.description}>{task.description}</Text>
              ) : (
                <Text variant="bodyMedium" color="tertiary" style={styles.description}>Add description...</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Meta Cards Row */}
          <View style={styles.metaRow}>
            {/* Assignee Card */}
            <TouchableOpacity style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => { triggerHaptic('light'); setShowAssigneePicker(true); }}
            >
              <Text variant="caption" color="tertiary">Assignee</Text>
              {task.assignee ? (
                <View style={styles.metaAssignee}>
                  <View style={[styles.metaAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.metaAvatarText, { color: theme.colors.primary }]}>{getInitials(task.assignee.name)}</Text>
                  </View>
                  <Text variant="bodySmall" weight="semibold" numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>{task.assignee.name}</Text>
                </View>
              ) : (
                <Text variant="bodySmall" color="tertiary">Unassigned</Text>
              )}
            </TouchableOpacity>

            {/* Due Date Card */}
            <TouchableOpacity style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => { triggerHaptic('light'); setShowDatePicker(true); }}
            >
              <Text variant="caption" color="tertiary">Due Date</Text>
              {task.dueDate ? (
                <Text variant="bodySmall" weight="semibold" color={isOverdue ? 'danger' : 'primary'}>
                  {formatDate(task.dueDate)}
                  {isOverdue && ' (Overdue)'}
                </Text>
              ) : (
                <Text variant="bodySmall" color="tertiary">Set date</Text>
              )}
            </TouchableOpacity>

            {/* Creator Card */}
            <TouchableOpacity style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text variant="caption" color="tertiary">Created by</Text>
              <View style={styles.metaAssignee}>
                <View style={[styles.metaAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[styles.metaAvatarText, { color: theme.colors.primary }]}>
                    {getInitials(task.createdBy?.name ?? user?.name ?? 'Unknown')}
                  </Text>
                </View>
                <Text variant="bodySmall" weight="semibold" numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>
                  {task.createdBy?.name ?? user?.name ?? 'Unknown User'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Status Selector */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {STATUSES.map(s => (
                <TouchableOpacity key={s.key}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>PRIORITY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p.key}
                  style={[styles.chip, { backgroundColor: task.priority === p.key ? p.color + '20' : theme.colors.surface, borderColor: task.priority === p.key ? p.color : theme.colors.border }]}
                  onPress={() => handlePriorityChange(p.key)}
                >
                  <Text variant="bodySmall" weight={task.priority === p.key ? 'semibold' : 'regular'} style={{ color: task.priority === p.key ? p.color : theme.colors.text.secondary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Labels */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>LABELS</Text>
            <TouchableOpacity onPress={() => { triggerHaptic('light'); setShowLabelPicker(true); }}>
              <Text variant="caption" color="primary">Manage</Text>
            </TouchableOpacity>
          </View>
          {taskLabels.length > 0 ? (
            <View style={styles.chipRow}>
              {taskLabels.map(l => (
                <View key={l.id} style={[styles.labelPill, { backgroundColor: l.color + '20', borderColor: l.color }]}>
                  <View style={[styles.labelDot, { backgroundColor: l.color }]} />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: l.color }}>{l.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="bodySmall" color="tertiary">No labels</Text>
          )}

          {/* Activity Timeline */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 20 }]}>ACTIVITY</Text>
          {activityData && activityData.length > 0 ? (
            activityData.map((log) => (
              <View key={log.id} style={[styles.activityRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.activityDot, { backgroundColor: log.action === 'comment_created' ? theme.colors.success : theme.colors.primary }]} />
                <View style={styles.activityContent}>
                  <Text variant="bodySmall">
                    {formatActivity(log.action, log.details || {}, log.user?.name || 'Someone')}
                  </Text>
                  <Text variant="caption" color="tertiary">{formatRelativeTime(log.createdAt)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text variant="bodyMedium" color="tertiary">No activity yet</Text>
            </View>
          )}

          {/* Comments */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>COMMENTS ({comments.length})</Text>
          {comments.length === 0 && (
            <View style={styles.emptySection}><Text variant="bodyMedium" color="tertiary">No comments yet</Text></View>
          )}
          {comments.map(comment => {
            const isAuthor = comment.userId === user?.id;
            const commentUserName = comment.user?.name ?? 'Unknown';
            return (
              <View key={comment.id} style={[styles.commentRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.commentAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[styles.commentAvatarText, { color: theme.colors.primary }]}>{getInitials(commentUserName)}</Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    <Text weight="semibold" variant="bodySmall">{commentUserName}</Text>
                    <Text variant="caption" color="tertiary">{formatRelativeTime(comment.createdAt)}</Text>
                  </View>
                  <Text variant="bodyMedium">{comment.content}</Text>
                  {isAuthor && (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={{ marginTop: 4 }}>
                      <Text variant="caption" color="danger">Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Comment Input */}
        <View style={[styles.commentBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput style={[styles.commentInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="Add a comment..." placeholderTextColor={theme.colors.text.tertiary}
            value={commentText} onChangeText={setCommentText} multiline maxLength={1000}
          />
          <TouchableOpacity onPress={handleAddComment}
            style={[styles.sendBtn, { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.border }]}
            disabled={!commentText.trim()}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Assignee Picker Modal */}
      <Modal visible={showAssigneePicker} transparent animationType="slide" onRequestClose={() => setShowAssigneePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAssigneePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Heading level={4}>Assign Task</Heading>
              <TouchableOpacity onPress={() => setShowAssigneePicker(false)}>
                <Text color="primary" weight="semibold">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
              {task.assignee && (
                <TouchableOpacity style={[styles.assigneeOption, { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.danger }]}
                  onPress={() => handleAssigneeChange(null)}
                >
                  <Text color="danger" weight="semibold">Remove Assignment</Text>
                </TouchableOpacity>
              )}
              {members.map(m => {
                const isSelected = m.userId === task.assigneeId;
                return (
                  <TouchableOpacity key={m.id}
                    style={[styles.assigneeOption, { backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface, borderColor: isSelected ? theme.colors.primary : theme.colors.border }]}
                    onPress={() => handleAssigneeChange(m.userId)}
                  >
                    <View style={[styles.assigneeAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={[styles.assigneeAvatarText, { color: theme.colors.primary }]}>{getInitials(m.user.name)}</Text>
                    </View>
                    <Text weight={isSelected ? 'semibold' : 'regular'}>{m.user.name}</Text>
                    {isSelected && <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}><Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Due Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Heading level={4}>Set Due Date</Heading>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text color="primary" weight="semibold">Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {task.dueDate && (
                <TouchableOpacity style={[styles.dateOption, { borderColor: theme.colors.danger }]}
                  onPress={() => handleDueDateChange(null)}
                >
                  <Text color="danger" weight="semibold">Remove Due Date</Text>
                </TouchableOpacity>
              )}
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'This Weekend', days: (7 - new Date().getDay()) % 7 || 7 },
                { label: 'Next Week', days: 7 },
                { label: 'Two Weeks', days: 14 },
              ].map(opt => {
                const d = new Date();
                d.setDate(d.getDate() + opt.days);
                const dateStr = d.toISOString().split('T')[0];
                return (
                  <TouchableOpacity key={opt.label}
                    style={[styles.dateOption, { borderColor: task.dueDate === dateStr ? theme.colors.primary : theme.colors.border, backgroundColor: task.dueDate === dateStr ? theme.colors.primaryLight : theme.colors.surface }]}
                    onPress={() => handleDueDateChange(dateStr)}
                  >
                    <Text weight={task.dueDate === dateStr ? 'semibold' : 'regular'}>{opt.label}</Text>
                    <Text variant="caption" color="tertiary">{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[styles.dateOption, { borderColor: theme.colors.primary, borderStyle: 'dashed' }]}
                onPress={() => {
                  setCustomPickerDate(task.dueDate ? new Date(task.dueDate) : new Date());
                  setShowCustomDatePicker(true);
                }}
              >
                <Text color="primary">Custom Date...</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Label Picker Modal */}
      <Modal visible={showLabelPicker} transparent animationType="slide" onRequestClose={() => setShowLabelPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLabelPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Heading level={4}>Manage Labels</Heading>
              <TouchableOpacity onPress={() => setShowLabelPicker(false)}>
                <Text color="primary" weight="semibold">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              <View style={[styles.createLabelRow, { borderBottomColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.createLabelInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                  placeholder="New label name..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={newLabelName}
                  onChangeText={setNewLabelName}
                  onSubmitEditing={handleCreateLabel}
                  maxLength={30}
                />
                <TouchableOpacity
                  style={[styles.createLabelBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCreateLabel}
                  disabled={!newLabelName.trim()}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Add</Text>
                </TouchableOpacity>
              </View>
              {labels.map(label => {
                const isAssigned = taskLabels.some(l => l.id === label.id);
                return (
                  <TouchableOpacity key={label.id}
                    style={[styles.labelOption, { backgroundColor: isAssigned ? label.color + '15' : theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => handleToggleLabel(label.id)}
                  >
                    <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                    <Text weight={isAssigned ? 'semibold' : 'regular'}>{label.name}</Text>
                    <View style={[styles.checkbox, { backgroundColor: isAssigned ? label.color : 'transparent', borderColor: isAssigned ? label.color : theme.colors.border }]}>
                      {isAssigned && <Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {labels.length === 0 && (
                <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24, marginTop: 20 }}>
                  No labels in this project
                </Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {showCustomDatePicker && (
        <DateTimePicker
          value={customPickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
            setShowCustomDatePicker(false);
            if (_event.type === 'set' && selectedDate) {
              const dateStr = selectedDate.toISOString().split('T')[0];
              handleDueDateChange(dateStr);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { minWidth: 44, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 4 },
  scroll: { padding: 20, paddingBottom: 100 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16, gap: 8 },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  taskTitle: { marginBottom: 12 },
  titleInput: { fontSize: 24, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 4, marginBottom: 12 },
  description: { marginBottom: 16, lineHeight: 22 },
  descInput: { fontSize: 15, lineHeight: 22, borderBottomWidth: 2, paddingVertical: 4, marginBottom: 16, minHeight: 60, textAlignVertical: 'top' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metaCard: { flex: 1, minWidth: 100, padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  metaAssignee: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0, overflow: 'hidden' },
  metaAvatar: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  metaAvatarText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  labelPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5, gap: 5 },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, marginVertical: 20 },
  activityRow: { flexDirection: 'row', paddingVertical: 10, gap: 10, borderBottomWidth: 0.5 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  activityContent: { flex: 1, gap: 2 },
  emptySection: { paddingVertical: 24, alignItems: 'center' },
  commentRow: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '600' },
  commentBody: { flex: 1, gap: 4 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '65%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  assigneeOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 4 },
  assigneeAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  assigneeAvatarText: { fontSize: 14, fontWeight: '600' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  dateOption: { padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  createLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 4 },
  createLabelInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  createLabelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 },
  editBtnCancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  editBtnSave: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
