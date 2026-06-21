import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useNotificationStore, AppNotification } from '../../../store/notificationStore';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { formatRelativeTime } from '../../../utils/date';
import { triggerHaptic } from '../../../utils/haptics';
import { getInitials } from '../../../utils/formatting';

const TYPE_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_created: '📝',
  task_updated: '🔄',
  status_changed: '📌',
  priority_changed: '⚡',
  due_date_changed: '📅',
  label_added: '🏷️',
  label_removed: '🏷️',
  comment_added: '💬',
  comment_deleted: '🗑️',
  workspace_invite: '🏢',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  const handlePress = useCallback((notification: AppNotification) => {
    triggerHaptic('light');
    markAsRead(notification.id);
    if (notification.taskId) {
      router.push(`/(protected)/tasks/${notification.taskId}`);
    } else if (notification.workspaceId) {
      router.push(`/(protected)/workspaces/${notification.workspaceId}`);
    }
  }, [markAsRead, router]);

  const renderNotification = useCallback(({ item }: { item: AppNotification }) => {
    const actorName = item.actor?.name || 'Unknown';
    const actorAvatar = item.actor?.avatar;
    return (
    <TouchableOpacity
      style={[
        styles.notificationRow,
        { backgroundColor: item.read ? theme.colors.surface : theme.colors.primaryLight, borderBottomColor: theme.colors.border },
      ]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationAvatar, { backgroundColor: theme.colors.primaryLight }]}>
        <Text style={[styles.notificationAvatarText, { color: theme.colors.primary }]}>{getInitials(actorName)}</Text>
      </View>
      <View style={styles.notificationBody}>
        <View style={styles.notificationHeader}>
          <Text weight="semibold" variant="bodyMedium" numberOfLines={1}>{item.title}</Text>
          <Text variant="caption" color="tertiary">{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text variant="bodySmall" color="secondary" numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
    </TouchableOpacity>
    );
  }, [theme, handlePress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <Heading level={4}>Notifications</Heading>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={() => { markAllAsRead(); triggerHaptic('light'); }} style={styles.headerButton}>
            <Text color="primary" weight="semibold">Read All</Text>
          </TouchableOpacity>
        )}
        {notifications.every(n => n.read) && <View style={styles.headerButton} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState title="No notifications" description="You're all caught up!" />
        }
        renderItem={renderNotification}
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
  headerButton: { minWidth: 60, alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  list: { paddingVertical: 8 },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  notificationAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notificationAvatarText: { fontSize: 13, fontWeight: '600' },
  notificationBody: { flex: 1, gap: 2 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
});
