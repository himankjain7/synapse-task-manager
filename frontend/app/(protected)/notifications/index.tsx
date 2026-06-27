import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, SafeAreaView, FlatList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useNotificationStore, AppNotification } from '../../../store/notificationStore';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { formatRelativeTime } from '../../../utils/date';
import { triggerHaptic } from '../../../utils/haptics';
import { getInitials } from '../../../utils/formatting';
import { PressScale } from '../../../components/animations/PressScale';
import { MentionText } from '../../../components/MentionText';

const TYPE_ICONS: Record<string, string> = {
  task_assigned: '📋', task_created: '📝', task_updated: '🔄',
  status_changed: '📌', priority_changed: '⚡', due_date_changed: '📅',
  label_added: '🏷️', label_removed: '🏷️', comment_added: '💬',
  comment_deleted: '🗑️', workspace_invite: '🏢', project_created: '📁',
  project_archived: '📦', project_unarchived: '📂', member_added: '👋',
  member_removed: '🚪', comment_updated: '✏️',
};

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (n: AppNotification) => void }) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const actorName = item.actor?.name || 'System';
  const actorInitials = getInitials(actorName);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.notificationRow, { backgroundColor: item.read ? theme.colors.surface : theme.colors.primaryLight, borderBottomColor: theme.colors.border }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.title}: ${item.message}`}
        accessibilityRole="button"
      >
        <View style={[styles.avatarCircle, { backgroundColor: item.read ? theme.colors.secondaryLight : theme.colors.primaryLight }]}>
          <Text style={[styles.avatarInitials, { color: item.read ? theme.colors.text.secondary : theme.colors.primary }]}>{actorInitials}</Text>
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifRow}>
            <Text weight="semibold" variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>{item.title}</Text>
            <Text variant="caption" color="tertiary" style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <MentionText text={item.message} variant="bodySmall" color="secondary" numberOfLines={2} style={styles.notifMessage} />
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

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

  const renderNotification = useCallback(({ item }: { item: AppNotification }) => (
    <NotificationItem item={item} onPress={handlePress} />
  ), [handlePress]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Go back">
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Heading level={4}>Notifications</Heading>
          {unreadCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <PressScale scaleTo={0.9}>
            <TouchableOpacity onPress={() => { markAllAsRead(); triggerHaptic('light'); }} style={styles.headerBtn} accessibilityLabel="Mark all as read">
              <Text color="primary" weight="semibold">Read All</Text>
            </TouchableOpacity>
          </PressScale>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState emoji="notifications" title="All caught up!" description="You have no notifications at the moment." />
        }
        renderItem={renderNotification}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { minWidth: 70, alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  headerBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  list: { paddingVertical: 4 },
  notificationRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, gap: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 14, fontWeight: '700' },
  notifBody: { flex: 1, gap: 3 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifMessage: { lineHeight: 17 },
  timeText: { marginLeft: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', right: 12, top: 18 },
});
