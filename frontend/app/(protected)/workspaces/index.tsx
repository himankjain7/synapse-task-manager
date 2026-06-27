import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../hooks/useTheme';
import { useAuthStore } from '../../../store/authStore';
import { useWorkspaces } from '../../../hooks/useWorkspaces';
import { useWorkspaceStore, previousWorkspaceId } from '../../../store/workspaceStore';
import { usePresenceStore } from '../../../store/presenceStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { getSocket } from '../../../services/socket';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { SkeletonCard } from '../../../components/workspace/SkeletonCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PressScale } from '../../../components/animations/PressScale';
import { FadeIn } from '../../../components/animations/FadeIn';
import { getInitials } from '../../../utils/formatting';
import { formatRelativeTime } from '../../../utils/date';
import { triggerHaptic } from '../../../utils/haptics';
import { WorkspaceWithOwner } from '../../../types/workspace';

const roleColors: Record<string, string> = {
  owner: '#F59E0B',
  admin: '#8B5CF6',
  member: '#3B82F6',
  guest: '#94A3B8',
};

function WorkspaceCard({
  workspace,
  onPress,
}: {
  workspace: WorkspaceWithOwner;
  onPress: () => void;
}) {
  const theme = useTheme();
  const initials = getInitials(workspace.name);

  return (
    <PressScale lift onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.cardContent}>
            <Heading level={4} style={styles.cardName}>
              {workspace.name}
            </Heading>
            {workspace.description && (
              <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                {workspace.description}
              </Text>
            )}
            <View style={styles.cardMeta}>
              <Text variant="caption" color="tertiary">
                Updated {formatRelativeTime(workspace.updatedAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

export default function WorkspacesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const selectWorkspace = useWorkspaceStore((s) => s.selectWorkspace);
  const resetPresence = usePresenceStore((s) => s.reset);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const clearBadge = useNotificationStore((s) => s.clearBadge);
  const {
  data,
  isLoading,
  error,
  refetch,
  isRefetching,
} = useWorkspaces();
  const queryClient = useQueryClient();

  const handleWorkspacePress = useCallback(
    (workspace: WorkspaceWithOwner) => {
      const socket = getSocket();
      if (socket && previousWorkspaceId) {
        socket.emit('leave:workspace', { workspaceId: previousWorkspaceId });
      }
      queryClient.removeQueries({ queryKey: ['projects'] });
      queryClient.removeQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['analytics'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
      queryClient.removeQueries({ queryKey: ['activity'] });
      queryClient.removeQueries({ queryKey: ['labels'] });
      queryClient.removeQueries({ queryKey: ['search'] });
      queryClient.removeQueries({ queryKey: ['workspaces', 'members'] });
      queryClient.removeQueries({ queryKey: ['attachments'] });
      queryClient.removeQueries({ queryKey: ['subtasks'] });
      queryClient.removeQueries({ queryKey: ['task-activity'] });
      AsyncStorage.removeItem('synapse-notifications');
      resetPresence();
      setNotifications([]);
      clearBadge();
      selectWorkspace(workspace.id);
      if (socket) {
        socket.emit('join:workspace', { workspaceId: workspace.id });
      }
      triggerHaptic('light');
      router.push(`/(protected)/workspaces/${workspace.id}`);
    },
    [router, selectWorkspace, queryClient, resetPresence, setNotifications, clearBadge]
  );

  const handleCreate = useCallback(() => {
    triggerHaptic('light');
    router.push('/(protected)/workspaces/create');
  }, [router]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="bodyMedium" color="secondary" style={styles.greeting}>
              {greeting},
            </Text>
            <Heading level={2} style={styles.userName}>
              {user?.name?.split(' ')[0] || 'User'}
            </Heading>
            {data && (
              <Text variant="caption" color="tertiary" style={styles.workspaceCount}>
                {data.total} {data.total === 1 ? 'Workspace' : 'Workspaces'} • Stay productive
              </Text>
            )}
          </View>
          <View style={[styles.avatarBubble, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarBubbleText, { color: theme.colors.text.onPrimary }]}>
              {getInitials(user?.name || 'User')}
            </Text>
          </View>
        </View>

        {isLoading && <SkeletonCard count={3} />}

        {!!error && !data && (
  <ErrorState
    title="Could not load workspaces"
    message="We encountered an error loading your workspaces. Pull to refresh."
    onRetry={refetch}
  />
)}

        {data && data.data.length === 0 && (
          <EmptyState
            title="No workspaces yet"
            description="Create your first workspace to start collaborating with your team."
            actionLabel="Create Workspace"
            onAction={handleCreate}
          />
        )}

          {data && data.data.length > 0 && (
          <View style={styles.list}>
            {data.data.map((workspace, index) => (
              <FadeIn key={workspace.id} spring delay={index * 80}>
                <WorkspaceCard
                  workspace={workspace}
                  onPress={() => handleWorkspacePress(workspace)}
                />
              </FadeIn>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <PressScale lift>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreate}
          activeOpacity={0.8}
        >
          <Text style={[styles.fabText, { color: theme.colors.text.onPrimary }]}>+</Text>
        </TouchableOpacity>
      </PressScale>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    marginBottom: 2,
  },
  userName: {
    marginBottom: 4,
  },
  workspaceCount: {
    marginTop: 4,
    letterSpacing: 0.2,
  },
  avatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarBubbleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    marginBottom: 0,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  bottomSpacer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
