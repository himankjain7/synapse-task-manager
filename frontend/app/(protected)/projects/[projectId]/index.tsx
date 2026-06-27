import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
  PanResponder,
  useWindowDimensions,
  TextInput,
  Alert,
  AlertButton,
  Platform,
  Modal,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useProject, useDeleteProject } from '../../../../hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask, useBulkUpdateTasks, useBulkDeleteTasks } from '../../../../hooks/useTasks';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { triggerHaptic } from '../../../../utils/haptics';
import { TaskStatus, TaskPriority, TaskWithAssignee, TaskFilters } from '../../../../types/project';
import { useAuthStore } from '../../../../store/authStore';
import { PressScale } from '../../../../components/animations/PressScale';
import { FadeIn } from '../../../../components/animations/FadeIn';
import { useProjectRoom } from '../../../../hooks/useProjectRoom';
import { usePresenceStore } from '../../../../store/presenceStore';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const COLUMN_COLORS: Record<TaskStatus, string> = {
  backlog: '#64748B',
  todo: '#3B82F6',
  in_progress: '#F59E0B',
  review: '#8B5CF6',
  done: '#10B981',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#64748B',
};

function TaskCard({
  task,
  onPress,
  onStatusChange,
  onDelete,
  theme,
  isSelected,
  selectionMode,
  onToggleSelect,
  projectId,
}: {
  task: TaskWithAssignee;
  onPress: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete?: () => void;
  theme: ReturnType<typeof useTheme>;
  isSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  projectId?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return selectionMode ? false : Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        triggerHaptic('light');
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        isDragging.current = false;
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();

        const threshold = 60;
        if (gesture.dx > threshold) {
          const currentIdx = COLUMNS.findIndex(c => c.key === task.status);
          if (currentIdx < COLUMNS.length - 1) {
            onStatusChange(COLUMNS[currentIdx + 1].key);
          }
        } else if (gesture.dx < -threshold) {
          const currentIdx = COLUMNS.findIndex(c => c.key === task.status);
          if (currentIdx > 0) {
            onStatusChange(COLUMNS[currentIdx - 1].key);
          }
        }
      },
    })
  ).current;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const isDueSoon = task.dueDate && !isOverdue && new Date(task.dueDate) < new Date(Date.now() + 86400000 * 2) && task.status !== 'done';
  const isDone = task.status === 'done';
  const cc = task._count?.comments ?? 0;
  const ac = task._count?.attachments ?? 0;

  const showContextMenu = () => {
    triggerHaptic('medium');
    const buttons: AlertButton[] = [
      { text: 'Open Task', onPress: onPress },
      ...COLUMNS.filter(c => c.key !== task.status).map(c => ({
        text: `Move to ${c.label}`,
        onPress: () => onStatusChange(c.key),
      })),
      ...(onDelete ? [{ text: 'Delete Task', style: 'destructive' as const, onPress: onDelete }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(task.title, undefined, buttons);
  };

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onToggleSelect?.();
    }
  };

  return (
    <PressScale scaleTo={0.98} lift>
      <Animated.View
        style={[
          styles.taskCard,
          theme.elevation.sm,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : (isDone ? theme.colors.success + '40' : theme.colors.border),
            borderWidth: isSelected ? 2 : 1,
            opacity: isDone ? 0.75 : 1,
            transform: [...pan.getTranslateTransform(), { scale: scaleAnim }],
          },
        ]}
        {...(selectionMode ? {} : panResponder.panHandlers)}
      >
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.95}
          accessibilityLabel={`Task: ${task.title}, ${task.status}`}
          accessibilityRole="button"
        >
          <View style={styles.taskCardInner}>
            <View style={[styles.priorityLine, { backgroundColor: isDone ? theme.colors.success : (PRIORITY_COLORS[task.priority] || 'transparent') }]} />
            <View style={styles.taskCardBody}>
              <View style={styles.taskTitleRow}>
                {selectionMode && (
                  <View style={[styles.selectionCheckbox, { borderColor: isSelected ? theme.colors.primary : theme.colors.border, backgroundColor: isSelected ? theme.colors.primary : 'transparent' }]}>
                    {isSelected && <Text style={[styles.selectionCheckmark, { color: '#FFFFFF' }]}>✓</Text>}
                  </View>
                )}
                <Text weight="semibold" style={[styles.taskTitle, isDone && { textDecorationLine: 'line-through', opacity: 0.6 }]} numberOfLines={2}>{task.title}</Text>
              </View>

              <View style={styles.taskMeta}>
                {!isDone && task.priority !== 'low' && (
                  <View style={[styles.metaPill, { backgroundColor: (PRIORITY_COLORS[task.priority] || '#64748B') + '18' }]}>
                    <Text style={[styles.metaPillText, { color: PRIORITY_COLORS[task.priority] || '#64748B' }]} numberOfLines={1}>
                      {task.priority}
                    </Text>
                  </View>
                )}

                {isDone && (
                  <View style={[styles.metaPill, { backgroundColor: theme.colors.success + '18' }]}>
                    <Text style={[styles.metaPillText, { color: theme.colors.success }]}>✓ Done</Text>
                  </View>
                )}

                {task.dueDate && !isDone && (
                  <Text variant="caption" color={
                    isOverdue ? 'danger' : isDueSoon ? 'warning' : 'tertiary'
                  }>
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                )}
              </View>

              {task.labels?.length > 0 && (
                <View style={styles.labelRow}>
                  {task.labels.slice(0, 2).map(l => (
                    <View key={l.id} style={[styles.miniLabel, { backgroundColor: l.color + '20', borderColor: l.color }]}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: l.color }}>{l.name}</Text>
                    </View>
                  ))}
                  {task.labels.length > 2 && (
                    <Text variant="caption" color="tertiary">+{task.labels.length - 2}</Text>
                  )}
                </View>
              )}

                <View style={styles.taskFooter}>
                  <View style={styles.assigneeBadge}>
                    {task.assignee ? (
                      <View style={[styles.assigneeDot, { backgroundColor: projectId && isUserOnline(projectId, task.assignee.id) ? theme.colors.success : theme.colors.primary }]} />
                    ) : (
                      <View style={[styles.assigneeDot, { backgroundColor: theme.colors.border }]} />
                    )}
                  <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.assigneeName}>
                    {task.assignee ? task.assignee.name : 'Unassigned'}
                  </Text>
                </View>
                <View style={styles.taskCounts}>
                  {cc > 0 && <Text variant="caption" color="tertiary" style={styles.countItem}>💬 {cc}</Text>}
                  {ac > 0 && <Text variant="caption" color="tertiary" style={styles.countItem}>📎 {ac}</Text>}
                  {task.description && !cc && !ac && <Text variant="caption" color="tertiary">📝</Text>}
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </PressScale>
  );
}

export default function KanbanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const COLUMN_WIDTH = SCREEN_WIDTH * 0.72;
  const { workspaceId, projectId } = useLocalSearchParams<{
  workspaceId: string;
  projectId: string;
}>();
  const showToast = useToastStore((s) => s.showToast);
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);

  useProjectRoom(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const { data: project, isLoading: projectLoading, isError: projectError, refetch: refetchProject } = useProject(workspaceId, projectId);

const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useTasks(projectId);

const { mutateAsync: updateTask } = useUpdateTask();
const { mutateAsync: deleteTask } = useDeleteTask();
const { mutateAsync: deleteProject } = useDeleteProject();
const { mutateAsync: bulkUpdate } = useBulkUpdateTasks(projectId!);
const { mutateAsync: bulkDelete } = useBulkDeleteTasks(projectId!);

  const tasks = useMemo(() => (tasksData?.data ?? []).filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description?.toLowerCase().includes(q))) return false;
    }
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  }), [tasksData, searchQuery, statusFilter, priorityFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, TaskWithAssignee[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [],
    };
    tasks.forEach(t => { if (groups[t.status]) groups[t.status].push(t); });
    Object.values(groups).forEach(g => g.sort((a, b) => a.position - b.position));
    return groups;
  }, [tasks]);

  const handleStatusChange = useCallback(async (task: TaskWithAssignee, newStatus: TaskStatus) => {
    try {
      triggerHaptic('light');
      await updateTask({ id: task.id, input: { status: newStatus } });
      showToast(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label}`, 'success');
    } catch {
      triggerHaptic('error');
      showToast('Failed to move task', 'error');
    }
  }, [updateTask, showToast]);

  const handleDeleteTaskCard = useCallback(async (task: TaskWithAssignee) => {
    triggerHaptic('warning');
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTask(task.id);
          triggerHaptic('success');
          showToast('Task deleted', 'success');
        } catch { triggerHaptic('error'); showToast('Failed to delete', 'error'); }
      }},
    ]);
  }, [deleteTask, showToast]);

  const handleDeleteProject = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert('Delete Project', 'All tasks will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProject({
  workspaceId: workspaceId!,
  id: projectId!,
});
          triggerHaptic('success');
          showToast('Project deleted', 'success');
          router.back();
        } catch { triggerHaptic('error'); showToast('Failed to delete project', 'error'); }
      }},
    ]);
  }, [projectId, deleteProject, router, showToast]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  }, []);

  const enterSelectMode = useCallback((taskId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([taskId]));
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    triggerHaptic('warning');
    Alert.alert('Delete Tasks', `Delete ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await bulkDelete(Array.from(selectedIds));
          triggerHaptic('success');
          showToast(`${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''} deleted`, 'success');
          exitSelectionMode();
        } catch {
          triggerHaptic('error');
          showToast('Failed to delete tasks', 'error');
        }
      }},
    ]);
  }, [selectedIds, bulkDelete, showToast, exitSelectionMode]);

  const handleBulkStatusChange = useCallback(async (status: TaskStatus) => {
    try {
      await bulkUpdate({ taskIds: Array.from(selectedIds), status });
      triggerHaptic('success');
      showToast(`Moved ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''} to ${COLUMNS.find(c => c.key === status)?.label}`, 'success');
      exitSelectionMode();
    } catch {
      triggerHaptic('error');
      showToast('Failed to update tasks', 'error');
    }
    setShowStatusPicker(false);
  }, [selectedIds, bulkUpdate, showToast, exitSelectionMode]);

  const handleBulkPriorityChange = useCallback(async (priority: TaskPriority) => {
    try {
      await bulkUpdate({ taskIds: Array.from(selectedIds), priority });
      triggerHaptic('success');
      showToast(`Updated priority for ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`, 'success');
      exitSelectionMode();
    } catch {
      triggerHaptic('error');
      showToast('Failed to update tasks', 'error');
    }
    setShowPriorityPicker(false);
  }, [selectedIds, bulkUpdate, showToast, exitSelectionMode]);

  const selectAllInColumn = useCallback((status?: TaskStatus) => {
    const ids = status
      ? groupedTasks[status].map(t => t.id)
      : tasks.map(t => t.id);
    setSelectedIds(new Set(ids));
    if (ids.length > 0) setSelectionMode(true);
  }, [groupedTasks, tasks]);

  const totalTasks = tasks.length;
  const completedTasks = groupedTasks.done.length;

  if (projectLoading || tasksLoading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerBtn}><Text color="primary" weight="semibold">Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}><Heading level={4}>Loading...</Heading></View>
        <View style={styles.headerBtn} />
      </View>
      <View style={{ padding: 20, gap: 12 }}>
        {[1,2,3].map((i) => (
          <View key={i} style={[styles.column, { borderColor: theme.colors.border + '30', height: 200 }]}>
            <View style={[styles.columnHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={{ width: 50, height: 14, borderRadius: 4, backgroundColor: theme.colors.border }} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>;
  }

  if (projectError) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ErrorState title="Could not load project" onRetry={() => { refetchProject(); refetchTasks(); }} />
    </SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        {selectionMode ? (
          <>
            <PressScale scaleTo={0.93}>
              <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
                <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </PressScale>
            <View style={styles.headerCenter}>
              <Text weight="semibold" variant="bodyMedium">{selectedIds.size} selected</Text>
            </View>
            <PressScale scaleTo={0.93}>
              <TouchableOpacity onPress={() => selectAllInColumn()} style={styles.headerBtn}>
                <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Select All</Text>
              </TouchableOpacity>
            </PressScale>
          </>
        ) : (
          <>
            <PressScale scaleTo={0.93}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Text color="primary" weight="semibold">Back</Text>
              </TouchableOpacity>
            </PressScale>
            <View style={styles.headerCenter}>
              <Heading level={4} numberOfLines={1}>{project?.name}</Heading>
            </View>
            <PressScale scaleTo={0.93}>
              <TouchableOpacity onPress={handleDeleteProject} style={styles.headerBtn}>
                <Text color="danger" weight="semibold">Delete</Text>
              </TouchableOpacity>
            </PressScale>
          </>
        )}
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search tasks..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!selectionMode}
        />
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterToggle}>
          <Text style={{ fontSize: 16 }}>{showFilters ? '✕' : '☰'}</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={COLUMNS} keyExtractor={c => c.key}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
            renderItem={({ item }) => (
              <PressScale scaleTo={0.95}>
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: statusFilter === item.key ? COLUMN_COLORS[item.key] + '20' : theme.colors.background, borderColor: statusFilter === item.key ? COLUMN_COLORS[item.key] : theme.colors.border }]}
                  onPress={() => setStatusFilter(statusFilter === item.key ? null : item.key)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: statusFilter === item.key ? COLUMN_COLORS[item.key] : theme.colors.text.secondary }}>{item.label}</Text>
                </TouchableOpacity>
              </PressScale>
            )}
          />
        </View>
      )}

      <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.progressFill, { width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%', backgroundColor: theme.colors.success }]} />
      </View>

      <View style={styles.statsRow}>
        <Text variant="caption" color="tertiary">{completedTasks}/{totalTasks} done</Text>
      </View>

      {totalTasks === 0 && !searchQuery ? (
        <FadeIn slide delay={100}>
          <View style={styles.emptyBoard}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Heading level={3}>No tasks yet</Heading>
            <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
              Create your first task to get started
            </Text>
            <PressScale scaleTo={0.95}>
              <TouchableOpacity
                onPress={() => router.push(`/(protected)/projects/${projectId}/tasks/create`)}
                style={[styles.emptyCTA, { backgroundColor: theme.colors.primary }]}
                accessibilityLabel="Create task"
                accessibilityRole="button"
              >
                <Text style={{ color: theme.colors.text.onPrimary, fontWeight: '600' }}>Create Task</Text>
              </TouchableOpacity>
            </PressScale>
          </View>
        </FadeIn>
      ) : (
        <FlatList
          horizontal
          data={COLUMNS}
          keyExtractor={c => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.columnsContainer, selectionMode && { paddingBottom: 100 }]}
          decelerationRate="fast"
          snapToInterval={COLUMN_WIDTH + 16}
          renderItem={({ item: column }) => {
            const columnTasks = groupedTasks[column.key];
            return (
              <View style={[styles.column, { width: COLUMN_WIDTH, borderColor: COLUMN_COLORS[column.key] + '30' }]}>
                <TouchableOpacity onPress={() => selectAllInColumn(column.key)}>
                  <View style={[styles.columnHeader, { borderBottomColor: COLUMN_COLORS[column.key] }]}>
                    <View style={[styles.columnDot, { backgroundColor: COLUMN_COLORS[column.key] }]} />
                    <Text weight="semibold" variant="bodyMedium">{column.label}</Text>
                    <View style={[styles.columnCount, { backgroundColor: COLUMN_COLORS[column.key] + '18' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLUMN_COLORS[column.key] }}>{columnTasks.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <FlatList
                  data={columnTasks}
                  keyExtractor={t => t.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.columnList}
                  ListEmptyComponent={
                    <View style={styles.emptyColumn}>
                      <Text variant="caption" color="tertiary">Empty</Text>
                    </View>
                  }
                  renderItem={({ item: task }) => (
                    <FadeIn slide delay={100}>
                      <TaskCard
                        task={task}
                        theme={theme}
                        projectId={projectId}
                        isSelected={selectedIds.has(task.id)}
                        selectionMode={selectionMode}
                        onToggleSelect={() => toggleSelect(task.id)}
                        onPress={() => {
                          if (selectionMode) return;
                          router.push(`/(protected)/tasks/${task.id}`);
                        }}
                        onStatusChange={(status) => handleStatusChange(task, status)}
                        onDelete={() => handleDeleteTaskCard(task)}
                      />
                    </FadeIn>
                  )}
                />
              </View>
            );
          }}
        />
      )}

      {selectionMode && selectedIds.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.danger + '15' }]} onPress={handleBulkDelete}>
            <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '15' }]} onPress={() => setShowStatusPicker(true)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.warning + '15' }]} onPress={() => setShowPriorityPicker(true)}>
            <Text style={{ color: theme.colors.warning, fontWeight: '600', fontSize: 13 }}>Priority</Text>
          </TouchableOpacity>
          <Text variant="caption" color="tertiary" style={{ marginLeft: 'auto' }}>{selectedIds.size}</Text>
        </View>
      )}

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Heading level={4} style={{ marginBottom: 16 }}>Change Status</Heading>
            {COLUMNS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.modalOption, { borderBottomColor: theme.colors.border }]}
                onPress={() => handleBulkStatusChange(c.key)}
              >
                <View style={[styles.modalDot, { backgroundColor: COLUMN_COLORS[c.key] }]} />
                <Text>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalCancel, { borderTopColor: theme.colors.border }]} onPress={() => setShowStatusPicker(false)}>
              <Text color="danger" weight="semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPriorityPicker} transparent animationType="fade" onRequestClose={() => setShowPriorityPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPriorityPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Heading level={4} style={{ marginBottom: 16 }}>Change Priority</Heading>
            {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.modalOption, { borderBottomColor: theme.colors.border }]}
                onPress={() => handleBulkPriorityChange(p)}
              >
                <View style={[styles.modalDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                <Text style={{ textTransform: 'capitalize' }}>{p}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalCancel, { borderTopColor: theme.colors.border }]} onPress={() => setShowPriorityPicker(false)}>
              <Text color="danger" weight="semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {!selectionMode && (
        <PressScale scaleTo={0.9}>
          <TouchableOpacity
            style={[styles.fab, theme.elevation.lg, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push(`/(protected)/projects/${projectId}/tasks/create`)}
            activeOpacity={0.8}
            accessibilityLabel="Create new task"
            accessibilityRole="button"
          >
            <Text style={[styles.fabText, { color: theme.colors.text.onPrimary }]}>+</Text>
          </TouchableOpacity>
        </PressScale>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { minWidth: 50, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  filterToggle: { padding: 6 },
  filtersRow: { paddingVertical: 8, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  progressBar: { height: 3, width: '100%' },
  progressFill: { height: '100%', borderRadius: 1.5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  addButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  columnsContainer: { paddingHorizontal: 12, paddingBottom: 24 },
  column: { marginHorizontal: 6, borderRadius: 16, borderWidth: 1, maxHeight: '100%' },
  columnHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8, borderBottomWidth: 2 },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  columnList: { padding: 10, paddingBottom: 20 },
  emptyColumn: { paddingVertical: 32, alignItems: 'center' },
  emptyBoard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyCTA: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  taskCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  taskCardInner: { flexDirection: 'row' },
  priorityLine: { width: 4, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  taskCardBody: { flex: 1, padding: 12, gap: 6 },
  taskTitle: { fontSize: 14, lineHeight: 20 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  selectionCheckmark: { fontSize: 12, fontWeight: '700', lineHeight: 14 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaPillText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', alignItems: 'center' },
  miniLabel: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, borderWidth: 0.5 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  assigneeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  assigneeDot: { width: 6, height: 6, borderRadius: 3 },
  assigneeName: { flex: 1 },
  taskCounts: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countItem: { fontSize: 10 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
    paddingBottom: 32,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  modalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
  },
});