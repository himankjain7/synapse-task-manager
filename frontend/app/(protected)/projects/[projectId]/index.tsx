import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useProject, useDeleteProject } from '../../../../hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask } from '../../../../hooks/useTasks';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { triggerHaptic } from '../../../../utils/haptics';
import { TaskStatus, TaskPriority, TaskWithAssignee, TaskFilters } from '../../../../types/project';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.72;

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
  theme,
}: {
  task: TaskWithAssignee;
  onPress: () => void;
  onStatusChange: (status: TaskStatus) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
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

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          transform: [...pan.getTranslateTransform(), { scale: scaleAnim }],
          shadowColor: theme.dark ? '#000' : theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={() => {
          triggerHaptic('medium');
          Alert.alert('Move Task', 'Move to:', [
            ...COLUMNS.filter(c => c.key !== task.status).map(c => ({
              text: c.label,
              onPress: () => onStatusChange(c.key),
            })),
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        activeOpacity={0.95}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.taskCardInner}>
          <View style={[styles.priorityLine, { backgroundColor: PRIORITY_COLORS[task.priority] || 'transparent' }]} />
          <View style={styles.taskCardBody}>
            <Text weight="semibold" style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>

            <View style={styles.taskMeta}>
              {task.priority !== 'low' && (
                <View style={[styles.metaPill, { backgroundColor: (PRIORITY_COLORS[task.priority] || '#64748B') + '18' }]}>
                  <Text style={[styles.metaPillText, { color: PRIORITY_COLORS[task.priority] || '#64748B' }]} numberOfLines={1}>
                    {task.priority}
                  </Text>
                </View>
              )}

              {task.dueDate && (
                <Text variant="caption" color={
                  isOverdue ? 'danger' : isDueSoon ? 'warning' : 'tertiary'
                }>
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              )}
            </View>

            {task.labels?.length > 0 && (
  <View style={styles.labelRow}>
    {task.labels?.slice(0, 2).map(l => (
      <View
        key={l.id}
        style={[
          styles.miniLabel,
          {
            backgroundColor: l.color + '20',
            borderColor: l.color,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: '600',
            color: l.color,
          }}
        >
          {l.name}
        </Text>
      </View>
    ))}

    {task.labels?.length > 2 && (
      <Text variant="caption" color="tertiary">
        +{(task.labels?.length ?? 0) - 2}
      </Text>
    )}
  </View>
)}

            <View style={styles.taskFooter}>
              {task.assignee ? (
                <View style={styles.assigneeBadge}>
                  <View style={[styles.assigneeDot, { backgroundColor: theme.colors.primary }]} />
                  <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.assigneeName}>
                    {task.assignee.name}
                  </Text>
                </View>
              ) : (
                <Text variant="caption" color="tertiary">Unassigned</Text>
              )}
              {task.description && (
                <Text variant="caption" color="tertiary" numberOfLines={1}>📝</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function KanbanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { workspaceId, projectId } = useLocalSearchParams<{
  workspaceId: string;
  projectId: string;
}>();
  const showToast = useToastStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: project, isLoading: projectLoading, isError: projectError, refetch: refetchProject } = useProject(workspaceId, projectId);

const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useTasks(projectId);

const { mutateAsync: updateTask } = useUpdateTask();
const { mutateAsync: deleteTask } = useDeleteTask();
const { mutateAsync: deleteProject } = useDeleteProject();

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

  const totalTasks = tasks.length;
  const completedTasks = groupedTasks.done.length;

  if (projectLoading || tasksLoading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LoadingView fullScreen message="Loading board..." />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Heading level={4} numberOfLines={1}>{project?.name}</Heading>
        </View>
        <TouchableOpacity onPress={handleDeleteProject} style={styles.headerBtn}>
          <Text color="danger" weight="semibold">Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search tasks..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
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
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: statusFilter === item.key ? COLUMN_COLORS[item.key] + '20' : theme.colors.background, borderColor: statusFilter === item.key ? COLUMN_COLORS[item.key] : theme.colors.border }]}
                onPress={() => setStatusFilter(statusFilter === item.key ? null : item.key)}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: statusFilter === item.key ? COLUMN_COLORS[item.key] : theme.colors.text.secondary }}>{item.label}</Text>
              </TouchableOpacity>
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
        <View style={styles.emptyBoard}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
          <Heading level={3}>No tasks yet</Heading>
          <Text variant="bodyMedium" color="tertiary" style={{ textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
            Create your first task to get started
          </Text>
          <TouchableOpacity
  onPress={() =>
    router.push(
  `/(protected)/projects/${projectId}/tasks/create`
)
  }
  style={[
    styles.emptyCTA,
    { backgroundColor: theme.colors.primary },
  ]}
>
  <Text
  style={{
    color: '#FFF',
    fontWeight: '600',
  }}
>
  Create Task
</Text>
</TouchableOpacity>
        </View>
      ) : (
        <FlatList
          horizontal
          data={COLUMNS}
          keyExtractor={c => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.columnsContainer}
          decelerationRate="fast"
          snapToInterval={COLUMN_WIDTH + 16}
          renderItem={({ item: column }) => {
            const columnTasks = groupedTasks[column.key];
            return (
              <View style={[styles.column, { borderColor: COLUMN_COLORS[column.key] + '30' }]}>
                <View style={[styles.columnHeader, { borderBottomColor: COLUMN_COLORS[column.key] }]}>
                  <View style={[styles.columnDot, { backgroundColor: COLUMN_COLORS[column.key] }]} />
                  <Text weight="semibold" variant="bodyMedium">{column.label}</Text>
                  <View style={[styles.columnCount, { backgroundColor: COLUMN_COLORS[column.key] + '18' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLUMN_COLORS[column.key] }}>{columnTasks.length}</Text>
                  </View>
                </View>

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
                    <TaskCard
                      task={task}
                      theme={theme}
                      onPress={() => router.push(`/(protected)/tasks/${task.id}`)}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                    />
                  )}
                />
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push(`/(protected)/projects/${projectId}/tasks/create`)}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabText, { color: theme.colors.text.onPrimary }]}>+</Text>
      </TouchableOpacity>
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
  column: { width: COLUMN_WIDTH, marginHorizontal: 6, borderRadius: 16, borderWidth: 1, maxHeight: '100%' },
  columnHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8, borderBottomWidth: 2 },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  columnList: { padding: 10, paddingBottom: 20 },
  emptyColumn: { paddingVertical: 32, alignItems: 'center' },
  emptyBoard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyCTA: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  taskCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  taskCardInner: { flexDirection: 'row' },
  priorityLine: { width: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  taskCardBody: { flex: 1, padding: 12, gap: 6 },
  taskTitle: { fontSize: 14, lineHeight: 20 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaPillText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', alignItems: 'center' },
  miniLabel: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, borderWidth: 0.5 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  assigneeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  assigneeDot: { width: 6, height: 6, borderRadius: 3 },
  assigneeName: { flex: 1 },
  commentCount: { flexDirection: 'row', alignItems: 'center' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...({ shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 } as any),
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
