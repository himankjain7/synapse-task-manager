import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useWorkspace, useDeleteWorkspace } from '../../../../hooks/useWorkspaces';
import { useProjects } from '../../../../hooks/useProjects';
import { useAuthStore } from '../../../../store/authStore';
import { useWorkspaceStore } from '../../../../store/workspaceStore';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { FadeIn } from '../../../../components/animations/FadeIn';
import { PressScale } from '../../../../components/animations/PressScale';
import { getInitials } from '../../../../utils/formatting';
import { formatDate, formatRelativeTime } from '../../../../utils/date';
import { triggerHaptic } from '../../../../utils/haptics';

export default function WorkspaceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
  const showToast = useToastStore((s) => s.showToast);

  const { data: workspace, isLoading, isError, refetch } = useWorkspace(id);
  const { data: projectsData, isLoading: projectsLoading } = useProjects(id);
  const { mutateAsync: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();

  const isOwner = workspace?.ownerId === user?.id;

  const handleDelete = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete Workspace',
      'Are you sure you want to delete this workspace? This action cannot be undone. All projects, tasks, and data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkspace(id!);
              triggerHaptic('success');
              showToast('Workspace deleted', 'success');
              clearWorkspace();
              router.replace('/(protected)/workspaces');
            } catch {
              triggerHaptic('error');
              showToast('Failed to delete workspace', 'error');
            }
          },
        },
      ]
    );
  }, [id, deleteWorkspace, router, clearWorkspace, showToast]);

  const handleLeave = useCallback(() => {
    triggerHaptic('warning');
    Alert.alert(
      'Leave Workspace',
      'Are you sure you want to leave this workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            showToast('You left the workspace', 'info');
            clearWorkspace();
            router.replace('/(protected)/workspaces');
          },
        },
      ]
    );
  }, [router, clearWorkspace, showToast]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingView fullScreen message="Loading workspace..." />
      </SafeAreaView>
    );
  }

  if (isError || !workspace) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorState title="Could not load workspace" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <Heading level={4}>Workspace</Heading>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn spring>
          <View style={styles.heroSection}>
          <View style={[styles.heroAvatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.heroAvatarText, { color: theme.colors.primary }]}>
              {getInitials(workspace.name)}
            </Text>
          </View>
          <Heading level={1} style={styles.heroName}>{workspace.name}</Heading>
          {workspace.description && (
            <Text variant="bodyLarge" color="secondary" style={styles.heroDesc}>
              {workspace.description}
            </Text>
          )}
          <Text variant="caption" color="tertiary">
            Created {formatDate(workspace.createdAt)}
          </Text>
        </View>

          <View style={styles.statsRow}>
            <PressScale lift style={{ flex: 1 }}>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    router.push(`/(protected)/workspaces/${id}/members`);
                  }}
                >
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>View</Text>
                  <Text variant="caption" color="tertiary" style={styles.statLabel}>Members</Text>
                </TouchableOpacity>
              </View>
            </PressScale>
            <PressScale lift style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic('light');
                  router.push(`/(protected)/workspaces/${id}`);
                }}
              >
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  {projectsData?.total ?? 0}
                </Text>
                <Text variant="caption" color="tertiary" style={styles.statLabel}>Projects</Text>
              </TouchableOpacity>
            </PressScale>
          </View>

        </FadeIn>

        {/* Projects Section */}
        <View style={styles.projectsSection}>
          <View style={styles.projectsSectionHeader}>
            <Heading level={4}>Projects</Heading>
              {isOwner && (
                <PressScale scaleTo={0.93}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      router.push(`/(protected)/projects/create?workspaceId=${id}`);
                    }}
                    style={[styles.createProjectButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={{ color: theme.colors.text.onPrimary, fontSize: 12, fontWeight: '600' }}>+ New Project</Text>
                  </TouchableOpacity>
                </PressScale>
              )}
          </View>

          {projectsLoading ? (
            <View style={styles.loadingProjects}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : !projectsData || projectsData.data.length === 0 ? (
            <EmptyState
              emoji="projects"
              title="No projects yet"
              description="Create your first project to start tracking tasks."
              actionLabel={isOwner ? 'Create Project' : undefined}
              onAction={isOwner ? () => router.push(`/(protected)/projects/create?workspaceId=${id}`) : undefined}
            />
          ) : (
            <View style={styles.projectList}>
              {projectsData.data.map((project) => {
                const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
                return (
                  <PressScale key={project.id} lift onPress={() => { triggerHaptic('light'); router.push(`/(protected)/projects/${project.id}?workspaceId=${id}`); }}>
                    <View style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <View style={styles.projectCardTop}>
                        <View style={[styles.projectIcon, { backgroundColor: (project.color || theme.colors.primaryLight) + '30' }]}>
                          <Text style={styles.projectEmoji}>{project.icon || '📁'}</Text>
                        </View>
                        <View style={styles.projectInfo}>
                          <Text weight="semibold" variant="bodyMedium">{project.name}</Text>
                          {project.description && (
                            <Text variant="bodySmall" color="secondary" numberOfLines={1}>{project.description}</Text>
                          )}
                        </View>
                        <View style={[styles.projectProgressBadge, { backgroundColor: progress >= 100 ? theme.colors.successLight : progress > 0 ? theme.colors.primaryLight : theme.colors.secondaryLight }]}>
                          <Text style={[styles.projectProgressText, { color: progress >= 100 ? theme.colors.success : progress > 0 ? theme.colors.primary : theme.colors.text.tertiary }]}>
                            {progress}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.projectMetaRow}>
                        <Text variant="caption" color="tertiary">{project.completedTaskCount}/{project.taskCount} tasks</Text>
                        {project.dueDate && (
                          <Text variant="caption" color={new Date(project.dueDate) < new Date() ? 'danger' : 'tertiary'}>
                            Due {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.projectProgressBar, { backgroundColor: theme.colors.border }]}>
                        <View style={[styles.projectProgressFill, { width: `${progress}%`, backgroundColor: progress >= 100 ? theme.colors.success : theme.colors.primary }]} />
                      </View>
                    </View>
                  </PressScale>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {isOwner && (
            <>
              <PressScale lift>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => router.push(`/(protected)/workspaces/${id}/invite`)}
                  activeOpacity={0.7}
                >
                  <Heading level={4}>Invite Members</Heading>
                  <Text variant="bodySmall" color="secondary">Add people to your workspace</Text>
                </TouchableOpacity>
              </PressScale>

              <PressScale lift>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator color={theme.colors.danger} />
                  ) : (
                    <>
                      <Heading level={4} color="danger">Delete Workspace</Heading>
                      <Text variant="bodySmall" color="secondary">Permanently remove this workspace</Text>
                    </>
                  )}
                </TouchableOpacity>
              </PressScale>
            </>
          )}

          {!isOwner && (
            <PressScale lift>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handleLeave}
                activeOpacity={0.7}
              >
                <Heading level={4} color="danger">Leave Workspace</Heading>
                <Text variant="bodySmall" color="secondary">Remove yourself from this workspace</Text>
              </TouchableOpacity>
            </PressScale>
          )}

          <PressScale lift>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => {
                triggerHaptic('light');
                router.push(`/(protected)/workspaces/${id}/members`);
              }}
              activeOpacity={0.7}
            >
              <Heading level={4}>Manage Members</Heading>
              <Text variant="bodySmall" color="secondary">View and manage member roles</Text>
            </TouchableOpacity>
          </PressScale>
        </View>
      </ScrollView>
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
  headerButton: { width: 60 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatarText: { fontSize: 28, fontWeight: '700' },
  heroName: { textAlign: 'center', marginBottom: 8 },
  heroDesc: { textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { marginTop: 2 },
  projectsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  projectsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  createProjectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  loadingProjects: { paddingVertical: 24, alignItems: 'center' },
  emptyProjects: { paddingVertical: 32, alignItems: 'center' },
  projectList: { gap: 10 },
  projectCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  projectCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  projectEmoji: { fontSize: 18 },
  projectInfo: { flex: 1, gap: 2 },
  projectProgressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  projectProgressText: { fontSize: 12, fontWeight: '700' },
  projectMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectProgressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  projectProgressFill: { height: '100%', borderRadius: 2 },
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
});
