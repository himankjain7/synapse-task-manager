import React, { useCallback, useMemo, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useProject, useUpdateProject, useDeleteProject } from '../../../../hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask, useCreateTask } from '../../../../hooks/useTasks';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { triggerHaptic } from '../../../../utils/haptics';
import { TaskStatus, TaskWithAssignee } from '../../../../types/project';

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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const priorityColors: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#64748B',
    none: 'transparent',
  };

  return (
    <Animated.View style={[styles.taskCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, transform: [{ scale: scaleAnim }], shadowColor: theme.dark ? '#000' : theme.colors.border }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={() => {
          triggerHaptic('medium');
          Alert.alert('Move Task', 'Select a status:', [
            ...COLUMNS.filter(c => c.key !== task.status).map(c => ({
              text: c.label,
              onPress: () => onStatusChange(c.key),
            })),
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        activeOpacity={1}
      >
        <View style={styles.taskCardContent}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColors[task.priority] || 'transparent' }]} />
          <View style={styles.taskCardBody}>
            <Text weight="semibold" style={styles.taskTitle} numberOfLines={2}>
              {task.title}
            </Text>
            {task.assignee && (
              <View style={styles.assigneeRow}>
                <View style={[styles.assigneeDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  {task.assignee.name}
                </Text>
              </View>
            )}
            {task.dueDate && (
              <Text variant="caption" color={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'danger' : 'tertiary'}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
            {task.labels.length > 0 && (
              <View style={styles.labelRow}>
                {task.labels.slice(0, 3).map(l => (
                  <View key={l.id} style={[styles.labelPill, { backgroundColor: l.color + '20', borderColor: l.color }]}>
                    <Text style={[styles.labelText, { color: l.color }]}>{l.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProjectDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const showToast = useToastStore((s) => s.showToast);

  const { data: project, isLoading: projectLoading, isError: projectError, refetch: refetchProject } = useProject(projectId);
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useTasks(projectId);
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: updateProject } = useUpdateProject();
  const { mutateAsync: deleteProject } = useDeleteProject();

  const tasks = tasksData?.data ?? [];

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, TaskWithAssignee[]> = {
      backlog: [], todo: [], in_progress: [], review: [], done: [],
    };
    tasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
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
      showToast('Failed to update task', 'error');
    }
  }, [updateTask, showToast]);

  const handleDeleteProject = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert('Delete Project', 'All tasks will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProject(projectId!);
          triggerHaptic('success');
          showToast('Project deleted', 'success');
          router.back();
        } catch {
          triggerHaptic('error');
          showToast('Failed to delete project', 'error');
        }
      }},
    ]);
  }, [projectId, deleteProject, router, showToast]);

  if (projectLoading || tasksLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingView fullScreen message="Loading project..." />
      </SafeAreaView>
    );
  }

  if (projectError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorState title="Could not load project" onRetry={() => { refetchProject(); refetchTasks(); }} />
      </SafeAreaView>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = groupedTasks.done.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Heading level={4} numberOfLines={1}>{project?.name || 'Project'}</Heading>
        </View>
        <TouchableOpacity onPress={handleDeleteProject} style={styles.headerButton}>
          <Text color="danger" weight="semibold">Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.progressFill, { width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%', backgroundColor: theme.colors.success }]} />
      </View>

      <View style={styles.statsRow}>
        <Text variant="caption" color="tertiary">
          {completedTasks}/{totalTasks} tasks
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(protected)/projects/${projectId}/tasks/create`)}
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

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
                <View style={[styles.columnCount, { backgroundColor: COLUMN_COLORS[column.key] + '20' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: COLUMN_COLORS[column.key] }}>{columnTasks.length}</Text>
                </View>
              </View>

              <FlatList
                data={columnTasks}
                keyExtractor={t => t.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnList}
                ListEmptyComponent={
                  <View style={styles.emptyColumn}>
                    <Text variant="caption" color="tertiary">No tasks</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: { minWidth: 50, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  progressBar: { height: 3, width: '100%' },
  progressFill: { height: '100%', borderRadius: 1.5 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  columnsContainer: { paddingHorizontal: 12, paddingBottom: 24 },
  column: {
    width: COLUMN_WIDTH,
    marginHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
    borderBottomWidth: 2,
  },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  columnList: { padding: 10, paddingBottom: 20 },
  emptyColumn: { paddingVertical: 32, alignItems: 'center' },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardContent: { flexDirection: 'row' },
  priorityIndicator: { width: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  taskCardBody: { flex: 1, padding: 12, gap: 6 },
  taskTitle: { fontSize: 14, lineHeight: 20 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeDot: { width: 6, height: 6, borderRadius: 3 },
  labelRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  labelPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5 },
  labelText: { fontSize: 10, fontWeight: '500' },
});
