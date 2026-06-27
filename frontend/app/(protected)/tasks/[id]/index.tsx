import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Animated,
  Linking,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../hooks/useTheme';
import { useTask, useTasks, useUpdateTask, useDeleteTask, useTaskComments, useCreateComment, useDeleteComment, useUpdateComment, useLabels, useCreateLabel, useAssignLabel, useRemoveLabel, useTaskActivity, useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask, useAddReaction, useRemoveReaction } from '../../../../hooks/useTasks';
import { Subtask } from '../../../../services/task';
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment } from '../../../../hooks/useAttachments';
import { Attachment } from '../../../../services/attachments';
import { useMembers } from '../../../../hooks/useWorkspaces';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { PressScale } from '../../../../components/animations/PressScale';
import { FadeIn } from '../../../../components/animations/FadeIn';
import { MentionText } from '../../../../components/MentionText';
import { triggerHaptic } from '../../../../utils/haptics';
import { formatDate, formatRelativeTime } from '../../../../utils/date';
import { getInitials } from '../../../../utils/formatting';
import { useAuthStore } from '../../../../store/authStore';
import api from '../../../../services/api';
import { TaskStatus, TaskPriority } from '../../../../types/project';
import { useProjectRoom, useTaskViewing } from '../../../../hooks/useProjectRoom';
import { useTypingIndicator } from '../../../../hooks/useTypingIndicator';
import { usePresenceStore } from '../../../../store/presenceStore';

const COLUMN_COLORS: Record<TaskStatus, string> = {
  backlog: '#64748B',
  todo: '#3B82F6',
  in_progress: '#F59E0B',
  review: '#8B5CF6',
  done: '#10B981',
};

const STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: '#64748B' },
  { key: 'todo', label: 'Todo', color: '#3B82F6' },
  { key: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { key: 'review', label: 'Review', color: '#8B5CF6' },
  { key: 'done', label: 'Done', color: '#10B981' },
];

const EMPTY_VIEWERS: readonly [] = [];

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

function AttachmentCard({ att, theme, onDelete }: { att: Attachment; theme: ReturnType<typeof useTheme>; onDelete: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showImagePreview, setShowImagePreview] = useState(false);
  const isImage = att.mimeType.startsWith('image/');
  const fileIcon = isImage ? '🖼️' : att.mimeType === 'application/pdf' ? '📄' : att.mimeType.includes('spreadsheet') || att.mimeType.includes('csv') ? '📊' : att.mimeType.includes('word') || att.mimeType.includes('document') ? '📝' : '📎';

  const handleView = useCallback(() => {
    if (isImage) {
      setShowImagePreview(true);
    } else {
      const fileUrl = att.fileUrl.startsWith('http') ? att.fileUrl : `${api.defaults.baseURL}${att.fileUrl}`;
      Linking.openURL(fileUrl).catch(() => {
        triggerHaptic('error');
        Alert.alert('Cannot Open', 'No app available to open this file type.');
      });
    }
  }, [isImage, att.fileUrl]);

  return (
    <>
      <Animated.View style={[styles.attachmentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handleView}
          onLongPress={() => {
            triggerHaptic('medium');
            Alert.alert('Delete Attachment', `Remove "${att.fileName}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => {
                Animated.spring(scaleAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
                setTimeout(onDelete, 200);
              }},
            ]);
          }}
          activeOpacity={0.8}
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, friction: 8, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start()}
        >
          <View style={[styles.attachmentPreview, { backgroundColor: isImage ? theme.colors.background : theme.colors.secondaryLight }]}>
            <Text style={{ fontSize: 28 }}>{isImage ? '🖼️' : fileIcon}</Text>
          </View>
          <View style={styles.attachmentCardInfo}>
            <Text variant="bodySmall" weight="semibold" numberOfLines={1} style={styles.attachmentCardName}>{att.fileName}</Text>
            <Text variant="caption" color="tertiary">{(att.size / 1024).toFixed(1)} KB</Text>
            <Text variant="caption" color="tertiary">{att.uploaderName} · {formatRelativeTime(att.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      {showImagePreview && isImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowImagePreview(false)}>
          <TouchableOpacity style={styles.imagePreviewOverlay} activeOpacity={1} onPress={() => setShowImagePreview(false)}>
            <Image
              source={{ uri: att.fileUrl.startsWith('http') ? att.fileUrl : `${api.defaults.baseURL}${att.fileUrl}` }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
            <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setShowImagePreview(false)}>
              <Text style={{ color: '#FFF', fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

function formatActivity(action: string, details: Record<string, unknown>, _userName: string): string {
  const actions: Record<string, string> = {
    task_created: `created this task`,
    title_changed: `changed title from "${details.from}" to "${details.to}"`,
    description_changed: `updated the description`,
    status_changed: `changed status from ${fmt(details.from)} to ${fmt(details.to)}`,
    priority_changed: `changed priority from ${fmt(details.from)} to ${fmt(details.to)}`,
    assignee_changed: details.to ? `assigned task to ${details.to}` : `removed assignee`,
    due_date_changed: details.to ? `set due date to ${fmtDate(details.to)}` : `removed due date`,
    label_added: `added label ${details.label || ''}`,
    label_removed: `removed label ${details.label || ''}`,
    comment_created: `added a comment`,
    comment_deleted: details.content ? `deleted comment: ${details.content}` : `deleted a comment`,
    comment_updated: `edited a comment`,
  };
  return actions[action] || `${action.replace(/_/g, ' ')}`;
}

export default function TaskDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, workspaceId: routeWsId } = useLocalSearchParams<{ id: string; workspaceId?: string }>();
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
  const { mutateAsync: editComment } = useUpdateComment();

  const workspaceId = routeWsId ?? task?.workspaceId ?? task?.project?.workspaceId;
  console.log("[DEBUG TaskDetail] workspaceId resolution:", { routeWsId, taskWorkspaceId: task?.workspaceId, projectWorkspaceId: task?.project?.workspaceId, resolved: workspaceId, task });
  const projectId = task?.projectId;
  const { data: membersData, isLoading: membersLoading, isError: membersError } = useMembers(workspaceId);
  const { data: labelsData, refetch: refetchLabels } = useLabels(projectId);
  const { mutateAsync: assignLabel } = useAssignLabel();
  const { mutateAsync: removeLabel } = useRemoveLabel();
  const { mutateAsync: createLabel } = useCreateLabel();
  const { data: projectTasksData } = useTasks(projectId);
  const { data: subtasks, refetch: refetchSubtasks } = useSubtasks(id);
  const { mutateAsync: createSubtask } = useCreateSubtask();
  const { mutateAsync: updateSubtask } = useUpdateSubtask();
  const { mutateAsync: deleteSubtask } = useDeleteSubtask();

  useProjectRoom(projectId);
  useTaskViewing(projectId, id);
  const { typingUsers, emitTyping } = useTypingIndicator(projectId || '', id || '');
  const viewers = usePresenceStore((s) => id ? (s.viewersByTask[id] ?? EMPTY_VIEWERS) : EMPTY_VIEWERS);
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);
  const { mutateAsync: addReaction } = useAddReaction(id!);
  const { mutateAsync: removeReaction } = useRemoveReaction(id!);

  const [newLabelName, setNewLabelName] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showNewSubtask, setShowNewSubtask] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionTarget, setMentionTarget] = useState<'comment' | 'reply'>('comment');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customPickerDate, setCustomPickerDate] = useState(new Date());
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const { data: attachments, isLoading: attachmentsLoading, refetch: refetchAttachments } = useTaskAttachments(id);
  const { mutateAsync: uploadAttachment, isPending: uploading } = useUploadAttachment();
  const { mutateAsync: deleteAttachment } = useDeleteAttachment();

  const comments = commentsData?.data ?? [];
  const labels = labelsData ?? [];
  const taskLabels = task?.labels ?? [];
  const members = membersData?.data ?? [];
  const filteredMembers = useMemo(() => {
    if (!assigneeSearch.trim()) return members;
    const q = assigneeSearch.toLowerCase();
    return members.filter(m => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q));
  }, [members, assigneeSearch]);

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescriptionDraft(task.description || '');
    }
  }, [task?.title, task?.description]);

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
    try { await updateTask({ id: id!, input: { description: descriptionDraft } }); triggerHaptic('light'); showToast('Description updated', 'success'); setEditingDescription(false); }
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

  const handleAssigneeChange = useCallback(async (assignedUserId: string | null) => {
    setShowAssigneePicker(false);
    triggerHaptic('light');
    try {
      await updateTask({ id: id!, input: { assignedTo: assignedUserId } });
      showToast(assignedUserId ? 'Task assigned' : 'Assignee removed', 'success');
    } catch { triggerHaptic('error'); showToast('Failed to assign', 'error'); }
  }, [id, updateTask, showToast]);

  const handleDueDateChange = useCallback(async (date: string | null) => {
    setShowDatePicker(false);
    triggerHaptic('light');
    try {
      await updateTask({ id: id!, input: { dueDate: date } });
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

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editingCommentText.trim()) { setEditingCommentId(null); return; }
    Keyboard.dismiss();
    try {
      triggerHaptic('light');
      await editComment({ taskId: id!, commentId, input: { content: editingCommentText.trim() } });
      setEditingCommentId(null);
      refetchComments();
    } catch {
      triggerHaptic('error');
      showToast('Failed to update comment', 'error');
    }
  }, [editingCommentText, id, editComment, refetchComments, showToast]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0 && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [comments.length]);

  const handleAddComment = useCallback(async (parentCommentId?: string) => {
    const text = parentCommentId ? replyText : commentText;
    if (!text.trim()) return;
    Keyboard.dismiss();
    try {
      triggerHaptic('light');
      await addComment({ taskId: id!, input: { content: text.trim(), parentId: parentCommentId } });
      if (parentCommentId) {
        setReplyText('');
        setReplyingToId(null);
      } else {
        setCommentText('');
      }
      refetchComments();
    } catch { triggerHaptic('error'); showToast('Failed to add comment', 'error'); }
  }, [commentText, replyText, id, addComment, refetchComments, showToast]);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeComment({ taskId: id!, commentId }).catch(() => showToast('Failed to delete', 'error')); } },
    ]);
  }, [id, removeComment, showToast]);

  const handleToggleReaction = useCallback(async (commentId: string, emoji: string, existingReactions: { userId: string; emoji: string }[] = []) => {
    const hasReacted = existingReactions.some(r => r.userId === user?.id && r.emoji === emoji);
    try {
      if (hasReacted) {
        await removeReaction({ commentId, emoji });
      } else {
        await addReaction({ commentId, emoji });
      }
    } catch { showToast('Failed to update reaction', 'error'); }
  }, [addReaction, removeReaction, user, showToast]);

  const handleInsertMention = useCallback((member: { userId: string; user: { name: string } }) => {
    const tag = ` @[${member.user.name}](${member.userId}) `;
    if (mentionTarget === 'reply') {
      setReplyText(prev => prev + tag);
    } else {
      setCommentText(prev => prev + tag);
    }
    setShowMentionPicker(false);
  }, [mentionTarget]);

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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerBtn} />
        <View style={[styles.skelBlock, { width: 100, height: 18, backgroundColor: theme.colors.border, borderRadius: 4 }]} />
        <View style={styles.headerBtn} />
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={[styles.skelBlock, { width: '60%', height: 14, backgroundColor: theme.colors.border, borderRadius: 6 }]} />
        <View style={[styles.skelBlock, { width: '40%', height: 28, backgroundColor: theme.colors.border, borderRadius: 8 }]} />
        <View style={[styles.skelBlock, { width: '100%', height: 60, backgroundColor: theme.colors.border, borderRadius: 12 }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3].map(i => <View key={i} style={[styles.skelBlock, { flex: 1, height: 72, backgroundColor: theme.colors.border, borderRadius: 12 }]} />)}
        </View>
        <View style={[styles.skelBlock, { width: '80%', height: 40, backgroundColor: theme.colors.border, borderRadius: 10 }]} />
        <View style={[styles.skelBlock, { width: '60%', height: 40, backgroundColor: theme.colors.border, borderRadius: 10 }]} />
      </View>
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
                  <Text style={{ color: theme.colors.text.onPrimary, fontWeight: '600' }}>Save</Text>
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
                  <Text style={{ color: theme.colors.text.onPrimary, fontWeight: '600' }}>Save</Text>
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

          {/* Subtask Checklist */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <Text variant="bodyLarge" weight="semibold">Subtasks</Text>
              <View style={[styles.subtaskProgressRing, { borderColor: theme.colors.border }]}>
                <Text variant="caption" weight="bold" color="primary">
                  {subtasks?.filter(s => s.completed).length ?? 0}/{subtasks?.length ?? 0}
                </Text>
              </View>
            </View>
            <View style={[styles.subtaskList, { borderColor: theme.colors.border }]}>
              {subtasks?.map((subtask) => (
                <FadeIn key={subtask.id} slide delay={100}>
                  <View style={[styles.subtaskItem, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity
                      onPress={() => updateSubtask({ taskId: id, subtaskId: subtask.id, input: { completed: !subtask.completed } })}
                      accessibilityLabel={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                      accessibilityRole="button"
                    >
                      <View style={[
                        styles.subtaskCheckbox,
                        { borderColor: subtask.completed ? theme.colors.success : theme.colors.border },
                        subtask.completed && { backgroundColor: theme.colors.success },
                      ]}>
                        {subtask.completed && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    <TextInput
                      value={subtask.title}
                      onChangeText={(text) => updateSubtask({ taskId: id, subtaskId: subtask.id, input: { title: text } })}
                      style={[styles.subtaskInput, subtask.completed && { textDecorationLine: 'line-through', color: theme.colors.text.tertiary }]}
                      placeholderTextColor={theme.colors.text.tertiary}
                    />
                    <TouchableOpacity
                      onPress={() => deleteSubtask({ taskId: id, subtaskId: subtask.id })}
                      accessibilityLabel="Delete subtask"
                    >
                      <Text style={{ color: theme.colors.text.tertiary, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </FadeIn>
              ))}
              {subtasks?.length === 0 && !showNewSubtask && (
                <PressScale scaleTo={0.95}>
                  <TouchableOpacity style={styles.subtaskAdd} onPress={() => { setShowNewSubtask(true); triggerHaptic('light'); }}>
                    <Text color="primary" weight="semibold">+ Add subtask</Text>
                  </TouchableOpacity>
                </PressScale>
              )}
              {showNewSubtask && (
                <View style={[styles.newSubtaskRow, { borderTopColor: theme.colors.border }]}>
                  <TextInput
                    style={[styles.newSubtaskInput, { color: theme.colors.text.primary }]}
                    placeholder="Subtask title..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={newSubtaskTitle}
                    onChangeText={setNewSubtaskTitle}
                    autoFocus
                    onSubmitEditing={() => {
                      const title = newSubtaskTitle.trim();
                      if (title) {
                        createSubtask({ taskId: id, input: { title } });
                        triggerHaptic('light');
                      }
                      setNewSubtaskTitle('');
                      setShowNewSubtask(false);
                    }}
                    onBlur={() => {
                      const title = newSubtaskTitle.trim();
                      if (title) {
                        createSubtask({ taskId: id, input: { title } });
                        triggerHaptic('light');
                      }
                      setNewSubtaskTitle('');
                      setShowNewSubtask(false);
                    }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={() => { setNewSubtaskTitle(''); setShowNewSubtask(false); }}>
                    <Text color="tertiary" style={{ fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              {subtasks && subtasks.length > 0 && !showNewSubtask && (
                <PressScale scaleTo={0.95}>
                  <TouchableOpacity style={styles.subtaskAdd} onPress={() => { setShowNewSubtask(true); triggerHaptic('light'); }}>
                    <Text color="primary" weight="semibold">+ Add subtask</Text>
                  </TouchableOpacity>
                </PressScale>
              )}
            </View>
          </View>

          {/* Meta Cards Row */}
          <View style={styles.metaRow}>
            {/* Assignee Card */}
            <TouchableOpacity style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => { triggerHaptic('light'); setAssigneeSearch(''); setShowAssigneePicker(true); }}
            >
              <Text variant="caption" color="tertiary">Assignee</Text>
              {task.assignee ? (
                <View style={styles.metaAssignee}>
                  <View style={[styles.metaAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.metaAvatarText, { color: theme.colors.primary }]}>{getInitials(task.assignee.name)}</Text>
                  </View>
                  {projectId && isUserOnline(projectId, task.assignee.id) && (
                    <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
                  )}
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
                <PressScale key={s.key} scaleTo={0.95}>
                  <TouchableOpacity
                    style={[styles.chip, { backgroundColor: task.status === s.key ? s.color + '18' : theme.colors.surface, borderColor: task.status === s.key ? s.color : theme.colors.border }]}
                    onPress={() => handleStatusChange(s.key)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: s.color }]} />
                    <Text variant="bodySmall" weight={task.status === s.key ? 'semibold' : 'regular'} style={{ color: task.status === s.key ? s.color : theme.colors.text.secondary }}>{s.label}</Text>
                  </TouchableOpacity>
                </PressScale>
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
            <PressScale scaleTo={0.95}>
              <TouchableOpacity onPress={() => { triggerHaptic('light'); setShowLabelPicker(true); }}>
                <Text variant="caption" color="primary">Manage</Text>
              </TouchableOpacity>
            </PressScale>
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

          {/* Attachments */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>ATTACHMENTS ({attachments?.length || 0})</Text>
            <PressScale scaleTo={0.95}>
              <TouchableOpacity
                onPress={async () => {
                  if (uploading) return;
                  try {
                    const pickResult = await DocumentPicker.getDocumentAsync({
                      type: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv'],
                      copyToCacheDirectory: false,
                    });
                    if (pickResult.canceled || !pickResult.assets?.[0]) return;
                    const file = pickResult.assets[0];
                    const formData = new FormData();
                    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
                    triggerHaptic('light');
                    await uploadAttachment({ taskId: id!, file: formData });
                    showToast('File uploaded', 'success');
                    refetchAttachments();
                  } catch {
                    triggerHaptic('error');
                    showToast('Upload failed', 'error');
                  }
                }}
                disabled={uploading}
              >
                <Text variant="caption" color="primary">{uploading ? 'Uploading...' : 'Upload'}</Text>
              </TouchableOpacity>
            </PressScale>
          </View>
          {uploading && (
            <View style={[styles.uploadProgress, { backgroundColor: theme.colors.primaryLight }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="caption" color="primary" weight="semibold">Uploading file...</Text>
            </View>
          )}
          {attachmentsLoading ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {[1, 2].map(i => (
                <View key={i} style={[styles.attachmentSkeleton, { backgroundColor: theme.colors.border }]} />
              ))}
            </View>
          ) : attachments && attachments.length > 0 ? (
            <View style={styles.attachmentGrid}>
              {attachments.map((att) => (
                <AttachmentCard key={att.id} att={att} theme={theme} onDelete={() => {
                  deleteAttachment({ taskId: id!, id: att.id }).then(() => refetchAttachments()).catch(() => showToast('Failed to delete', 'error'));
                }} />
              ))}
            </View>
          ) : (
            <Text variant="bodySmall" color="tertiary" style={{ marginTop: 4 }}>No attachments</Text>
          )}

          {/* Activity Timeline */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, marginTop: 20 }]}>ACTIVITY</Text>
          {activityData && activityData.length > 0 ? (
            <View style={styles.timeline}>
              {activityData.map((log, idx) => {
                const isLast = idx === activityData.length - 1;
                const actionIconMap: Record<string, string> = {
                  task_created: '✨', title_changed: '✏️', description_changed: '📝',
                  status_changed: '🔄', priority_changed: '⚡', assignee_changed: '👤',
                  due_date_changed: '📅', label_added: '🏷️', label_removed: '🏷️',
                  comment_created: '💬', comment_deleted: '🗑️', comment_updated: '✏️',
                  task_deleted: '🗑️',
                };
                const icon = actionIconMap[log.action] || '📌';
                return (
                  <View key={log.id} style={styles.timelineItem}>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.colors.border }]} />}
                    <View style={[styles.timelineDot, { backgroundColor: log.action === 'comment_created' ? theme.colors.success : theme.colors.primary }]}>
                      <Text style={styles.timelineIcon}>{icon}</Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <View style={[styles.timelineAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                          <Text style={[styles.timelineAvatarText, { color: theme.colors.primary }]}>{getInitials(log.user?.name || 'U')}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodySmall">
                            <Text weight="semibold">{log.user?.name || 'Someone'}</Text>
                            {' '}{formatActivity(log.action, log.details || {}, '')}
                          </Text>
                          <Text variant="caption" color="tertiary">{formatRelativeTime(log.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text variant="bodyMedium" color="tertiary">No activity yet</Text>
            </View>
          )}

          {/* Related Tasks */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>RELATED TASKS</Text>
            <PressScale scaleTo={0.95}>
              <TouchableOpacity onPress={() => projectId && router.push(`/(protected)/projects/${projectId}?workspaceId=${workspaceId}`)}>
                <Text variant="caption" color="primary">View Board</Text>
              </TouchableOpacity>
            </PressScale>
          </View>
          {projectTasksData?.data ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              {projectTasksData.data
                .filter(t => t.id !== id && t.status !== 'done')
                .slice(0, 4)
                .map(t => (
                  <PressScale key={t.id} scaleTo={0.97}>
                    <TouchableOpacity style={[styles.relatedTaskRow, { borderBottomColor: theme.colors.border }]}
                      onPress={() => router.push(`/(protected)/tasks/${t.id}`)}
                    >
                      <View style={[styles.relatedStatusDot, { backgroundColor: COLUMN_COLORS[t.status] }]} />
                      <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Text>
                      {t.assignee && (
                        <View style={[styles.miniAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                          <Text style={{ fontSize: 8, fontWeight: '600', color: theme.colors.primary }}>{getInitials(t.assignee.name)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </PressScale>
                ))}
              {projectTasksData.data.filter(t => t.id !== id && t.status !== 'done').length === 0 && (
                <Text variant="bodySmall" color="tertiary" style={{ paddingVertical: 8 }}>No other open tasks in this project</Text>
              )}
            </View>
          ) : null}

          {/* Comments */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>COMMENTS ({comments.length})</Text>
          {comments.length === 0 && (
            <View style={styles.emptySection}><Text variant="bodyMedium" color="tertiary">No comments yet</Text></View>
          )}
          {comments.filter(c => !c.parentId).map((comment, idx) => {
            const isAuthor = comment.userId === user?.id;
            const commentUserName = comment.user?.name ?? 'Unknown';
            const isEditing = editingCommentId === comment.id;
            const isReplying = replyingToId === comment.id;
            return (
              <FadeIn key={comment.id} slide delay={Math.min(idx * 50, 300)}>
                <View style={[styles.commentRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.commentAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.commentAvatarText, { color: theme.colors.primary }]}>{getInitials(commentUserName)}</Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text weight="semibold" variant="bodySmall">{commentUserName}</Text>
                      <Text variant="caption" color="tertiary">
                        {comment.createdAt !== comment.updatedAt ? 'edited ' : ''}{formatRelativeTime(comment.createdAt)}
                      </Text>
                    </View>
                    {isEditing ? (
                      <View>
                        <TextInput
                          style={[styles.commentEditInput, { color: theme.colors.text.primary, borderColor: theme.colors.primary, backgroundColor: theme.colors.surface }]}
                          value={editingCommentText}
                          onChangeText={setEditingCommentText}
                          autoFocus multiline maxLength={1000}
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity onPress={() => setEditingCommentId(null)} style={[styles.editBtnCancel, { borderColor: theme.colors.border }]}>
                            <Text color="secondary" weight="semibold" variant="caption">Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleEditComment(comment.id)} style={[styles.editBtnSave, { backgroundColor: theme.colors.primary }]}>
                            <Text style={{ color: theme.colors.text.onPrimary, fontWeight: '600', fontSize: 11 }}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <MentionText text={comment.content} variant="bodyMedium" />
                    )}
                    <View style={styles.commentActions}>
                      {isAuthor && !isEditing && (
                        <>
                          <TouchableOpacity onPress={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }}>
                            <Text variant="caption" color="primary">Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                            <Text variant="caption" color="danger">Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {!isAuthor && !isEditing && <View style={{ flex: 1 }} />}
                      <TouchableOpacity onPress={() => { setReplyingToId(isReplying ? null : comment.id); if (!isReplying) setReplyText(''); }}>
                        <Text variant="caption" color="primary">{isReplying ? 'Cancel' : 'Reply'}</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Reaction pills */}
                    <View style={styles.reactionRow}>
                      {['👍','❤️','😄','🎉','😢','😮'].map(emoji => {
                        const reacted = comment.reactions?.some(r => r.userId === user?.id && r.emoji === emoji) ?? false;
                        const count = comment.reactions?.filter(r => r.emoji === emoji).length ?? 0;
                        return (
                          <TouchableOpacity key={emoji}
                            style={[styles.reactionPill, { borderColor: theme.colors.border, backgroundColor: reacted ? theme.colors.primaryLight : 'transparent' }]}
                            onPress={() => handleToggleReaction(comment.id, emoji, comment.reactions || [])}
                          >
                            <Text style={{ fontSize: 13 }}>{emoji}</Text>
                            {count > 0 && <Text style={{ fontSize: 11, marginLeft: 2, color: theme.colors.text.secondary }}>{count}</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* Inline reply input */}
                    {isReplying && (
                      <View style={[styles.replyInputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <TouchableOpacity onPress={() => { setMentionTarget('reply'); setShowMentionPicker(true); }}
                          style={[styles.mentionBtnSmall, { backgroundColor: theme.colors.secondaryLight }]}
                        >
                          <Text style={{ fontSize: 12, color: theme.colors.secondary }}>@</Text>
                        </TouchableOpacity>
                        <TextInput style={[styles.replyInput, { color: theme.colors.text.primary }]}
                          placeholder="Write a reply..." placeholderTextColor={theme.colors.text.tertiary}
                          value={replyText} onChangeText={setReplyText} autoFocus multiline maxLength={1000}
                        />
                        <TouchableOpacity onPress={() => handleAddComment(comment.id)}
                          style={[styles.replySendBtn, { backgroundColor: replyText.trim() ? theme.colors.primary : theme.colors.border }]}
                          disabled={!replyText.trim()}
                        >
                          <Text style={{ color: theme.colors.text.onPrimary, fontSize: 11, fontWeight: '600' }}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Nested replies */}
                    {comment.replies?.map(reply => (
                      <View key={reply.id} style={[styles.replyRow, { borderLeftColor: theme.colors.border }]}>
                        <View style={[styles.commentAvatar, { backgroundColor: theme.colors.secondaryLight, width: 26, height: 26 }]}>
                          <Text style={[styles.commentAvatarText, { color: theme.colors.secondary, fontSize: 10 }]}>{getInitials(reply.user?.name ?? 'Unknown')}</Text>
                        </View>
                        <View style={styles.commentBody}>
                          <View style={styles.commentMeta}>
                            <Text weight="semibold" variant="caption">{reply.user?.name ?? 'Unknown'}</Text>
                            <Text variant="caption" color="tertiary">{formatRelativeTime(reply.createdAt)}</Text>
                          </View>
                          <MentionText text={reply.content} variant="bodyMedium" />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </FadeIn>
            );
          })}
        </ScrollView>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={[styles.typingBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Text variant="caption" color="tertiary">
              {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}

        {/* Viewing Indicator */}
        {viewers.length > 0 && (
          <View style={[styles.viewingBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <Text variant="caption" color="tertiary">
              {viewers.filter(v => v.userId !== user?.id).map(v => v.userName).join(', ')} viewing
            </Text>
          </View>
        )}

        {/* Comment Input */}
        <View style={[styles.commentBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => { setMentionTarget('comment'); setShowMentionPicker(true); }}
            style={[styles.mentionBtn, { backgroundColor: theme.colors.secondaryLight }]}
          >
            <Text style={{ fontSize: 16, color: theme.colors.secondary }}>@</Text>
          </TouchableOpacity>
          <TextInput style={[styles.commentInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
            placeholder="Add a comment..." placeholderTextColor={theme.colors.text.tertiary}
            value={commentText} onChangeText={(text) => { setCommentText(text); emitTyping(text.length > 0); }} multiline maxLength={1000}
            onBlur={() => emitTyping(false)}
          />
          <PressScale scaleTo={0.95}>
            <TouchableOpacity onPress={() => handleAddComment()}
              style={[styles.sendBtn, { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.border }]}
              disabled={!commentText.trim()}
            >
              <Text style={{ color: theme.colors.text.onPrimary, fontSize: 12, fontWeight: '600' }}>Send</Text>
            </TouchableOpacity>
          </PressScale>
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
            <View style={{ padding: 12, paddingBottom: 0 }}>
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text.primary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                placeholder="Search members..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={assigneeSearch}
                onChangeText={setAssigneeSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
              {updating && (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text variant="bodySmall" color="tertiary" style={{ marginTop: 8 }}>Updating assignment...</Text>
                </View>
              )}
              {!workspaceId && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center' }}>Workspace unavailable</Text>
                </View>
              )}
              {membersLoading && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text variant="bodySmall" color="tertiary" style={{ marginTop: 8 }}>Loading members...</Text>
                </View>
              )}
              {membersError && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', marginBottom: 12 }}>Failed to load members</Text>
                </View>
              )}
              {membersData && members.length === 0 && (
                <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24 }}>No workspace members available</Text>
              )}
              {membersData && members.length > 0 && (
                <>
                  {task.assignee && (
                    <TouchableOpacity style={[styles.assigneeOption, { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.danger }]}
                      onPress={() => handleAssigneeChange(null)}
                    >
                      <Text color="danger" weight="semibold">Remove Assignment</Text>
                    </TouchableOpacity>
                  )}
                  {filteredMembers.length === 0 && assigneeSearch ? (
                    <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24 }}>No members match "{assigneeSearch}"</Text>
                  ) : (
                    filteredMembers.map(m => {
                      const isSelected = m.userId === task.assigneeId;
                      return (
                        <TouchableOpacity key={m.id}
                          style={[styles.assigneeOption, { backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface, borderColor: isSelected ? theme.colors.primary : theme.colors.border }]}
                          onPress={() => handleAssigneeChange(m.userId)}
                        >
                          <View style={[styles.assigneeAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                            <Text style={[styles.assigneeAvatarText, { color: theme.colors.primary }]}>{getInitials(m.user.name)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text weight={isSelected ? 'semibold' : 'regular'}>{m.user.name}</Text>
                            <Text variant="caption" color="tertiary">{m.user.email}</Text>
                          </View>
                          {isSelected && <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}><Text style={{ color: theme.colors.text.onPrimary, fontSize: 10 }}>✓</Text></View>}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}
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
                  <Text style={{ color: theme.colors.text.onPrimary, fontWeight: '600', fontSize: 13 }}>Add</Text>
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
                    <View style={[styles.labelCheckbox, { backgroundColor: isAssigned ? label.color : 'transparent', borderColor: isAssigned ? label.color : theme.colors.border }]}>
                      {isAssigned && <Text style={{ color: theme.colors.text.onPrimary, fontSize: 10 }}>✓</Text>}
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

      {/* Mention Picker Modal */}
      <Modal visible={showMentionPicker} transparent animationType="slide" onRequestClose={() => setShowMentionPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMentionPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Heading level={4}>Mention a member</Heading>
              <TouchableOpacity onPress={() => setShowMentionPicker(false)}>
                <Text color="primary" weight="semibold">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
              {membersLoading && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text variant="bodySmall" color="tertiary" style={{ marginTop: 8 }}>Loading members...</Text>
                </View>
              )}
              {membersError && (
                <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24 }}>Failed to load members</Text>
              )}
              {membersData && members.length === 0 && (
                <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', padding: 24 }}>No members available</Text>
              )}
              {membersData && members.length > 0 && members.filter(m => m.userId !== user?.id).map(m => (
                <TouchableOpacity key={m.userId}
                  style={[styles.assigneeOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => handleInsertMention(m)}
                >
                  <View style={[styles.assigneeAvatar, { backgroundColor: theme.colors.secondaryLight }]}>
                    <Text style={[styles.assigneeAvatarText, { color: theme.colors.secondary }]}>{getInitials(m.user.name)}</Text>
                  </View>
                  <Text weight="regular">{m.user.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {showCustomDatePicker && (
        <DateTimePicker
          value={customPickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onValueChange={(_event: {}, date: Date) => {
            setShowCustomDatePicker(false);
            const dateStr = date.toISOString().split('T')[0];
            handleDueDateChange(dateStr);
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
  section: { marginBottom: 24 },
  subtaskList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  subtaskCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  subtaskInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
  subtaskAdd: { paddingHorizontal: 14, paddingVertical: 12 },
  subtaskProgressRing: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1.5, minWidth: 36, alignItems: 'center' },
  newSubtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  newSubtaskInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
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
  timeline: { marginTop: 4 },
  timelineItem: { flexDirection: 'row', paddingLeft: 20, paddingBottom: 16, position: 'relative' },
  timelineLine: { position: 'absolute', left: 28, top: 28, bottom: 0, width: 2 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  timelineIcon: { fontSize: 12 },
  timelineContent: { flex: 1 },
  timelineHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  timelineAvatar: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  timelineAvatarText: { fontSize: 10, fontWeight: '600' },
  emptySection: { paddingVertical: 24, alignItems: 'center' },
  commentRow: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '600' },
  commentBody: { flex: 1, gap: 4 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  commentEditInput: { fontSize: 14, lineHeight: 20, borderBottomWidth: 2, paddingVertical: 4, borderRadius: 8, paddingHorizontal: 10, minHeight: 36 },
  commentBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1 },
  typingBar: { paddingHorizontal: 12, paddingVertical: 4, borderTopWidth: 1 },
  viewingBar: { paddingHorizontal: 12, paddingVertical: 2, borderTopWidth: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginLeft: -6, marginTop: -4 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  mentionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  mentionBtnSmall: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '65%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  assigneeOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 4 },
  assigneeAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  assigneeAvatarText: { fontSize: 14, fontWeight: '600' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  dateOption: { padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  labelOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  labelCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  createLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 4 },
  createLabelInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  createLabelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  attachmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachmentCard: { width: '48%', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  attachmentPreview: { height: 72, justifyContent: 'center', alignItems: 'center' },
  attachmentCardInfo: { padding: 10, gap: 2 },
  attachmentCardName: { fontSize: 12 },
  attachmentSkeleton: { width: '48%', height: 130, borderRadius: 12 },
  uploadProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 8 },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, gap: 10 },
  attachmentIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  attachmentInfo: { flex: 1, gap: 2 },
  attachmentName: { fontSize: 13, fontWeight: '500' },
  attachmentMeta: { fontSize: 11 },
  attachmentDelete: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reactionRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, borderRadius: 12, borderWidth: 1, padding: 8 },
  replyInput: { flex: 1, fontSize: 14, paddingVertical: 4, maxHeight: 60 },
  replySendBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  replyRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, paddingLeft: 12, marginTop: 4, borderLeftWidth: 2, marginLeft: 4 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 12 },
  editBtnCancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  editBtnSave: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  skelBlock: {},
  relatedTaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8, borderBottomWidth: 0.5 },
  relatedStatusDot: { width: 8, height: 8, borderRadius: 4 },
  miniAvatar: { width: 20, height: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imagePreview: { width: '100%', height: '80%' },
  imagePreviewClose: { position: 'absolute', top: 60, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
