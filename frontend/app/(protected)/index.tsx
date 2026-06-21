import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useWorkspaceAnalytics, useUserAnalytics } from '../../hooks/useAnalytics';
import { triggerHaptic } from '../../utils/haptics';

const screenWidth = Dimensions.get('window').width;

function SkeletonBlock({ width, height, color }: { width: number; height: number; color: string }) {
  return <View style={{ width, height, borderRadius: 12, backgroundColor: color, opacity: 0.3 }} />;
}

function KpiCard({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: bgColor }]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: color + '99' }]}>{label}</Text>
    </View>
  );
}

function ProgressRing({ percent, size = 80, strokeWidth = 8, color, bgColor }: { percent: number; size?: number; strokeWidth?: number; color: string; bgColor: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: bgColor,
      }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: 'transparent',
        borderTopColor: color, borderRightColor: percent > 25 ? color : 'transparent',
        borderBottomColor: percent > 50 ? color : 'transparent',
        borderLeftColor: percent > 75 ? color : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{ fontSize: size * 0.22, fontWeight: '700', color }}>{percent}%</Text>
    </View>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.barChart}>
      {data.map((item) => (
        <View key={item.label} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: color + 'CC' }]}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(item.value / maxVal) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={[styles.barValue, { color }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const badgeCount = useNotificationStore((s) => s.badgeCount);
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const firstWsId = workspaces?.data?.[0]?.id;
  const { data: wsAnalytics, isLoading: analyticsLoading } = useWorkspaceAnalytics(firstWsId);
  const { data: userAnalytics } = useUserAnalytics();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U';

  const statCards = useMemo(() => {
    if (!wsAnalytics) return [];
    return [
      { label: 'Total Tasks', value: wsAnalytics.totalTasks, color: theme.colors.primary, bgColor: theme.colors.primaryLight },
      { label: 'Completed', value: wsAnalytics.completedTasks, color: theme.colors.success, bgColor: theme.colors.successLight },
      { label: 'Active', value: wsAnalytics.activeTasks, color: theme.colors.warning, bgColor: theme.colors.warningLight },
      { label: 'Overdue', value: wsAnalytics.overdueTasks, color: theme.colors.danger, bgColor: theme.colors.dangerLight },
    ];
  }, [wsAnalytics, theme]);

  const isLoading = wsLoading || analyticsLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.text.secondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { triggerHaptic('light'); router.push('/(protected)/notifications'); }}
              style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
              {badgeCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                  <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.avatarBubble, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>{initials}</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text.secondary, marginTop: 12 }}>Loading your dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.kpiRow}>
              {statCards.map((card) => (
                <KpiCard key={card.label} {...card} />
              ))}
            </View>

            {wsAnalytics && (
              <>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Completion Progress</Text>
                  <View style={styles.progressRow}>
                    <ProgressRing percent={wsAnalytics.completionPercent} color={theme.colors.primary} bgColor={theme.colors.primaryLight} />
                    <View style={styles.progressMeta}>
                      <Text style={[styles.progressStat, { color: theme.colors.text.secondary }]}>
                        <Text style={{ color: theme.colors.success, fontWeight: '700' }}>{wsAnalytics.completedTasks}</Text> done of {wsAnalytics.totalTasks}
                      </Text>
                      <Text style={[styles.progressStat, { color: theme.colors.text.secondary }]}>
                        <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>{wsAnalytics.activeTasks}</Text> in progress
                      </Text>
                      <Text style={[styles.progressStat, { color: theme.colors.text.secondary }]}>
                        <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{wsAnalytics.overdueTasks}</Text> overdue
                      </Text>
                      <Text style={[styles.progressStat, { color: theme.colors.text.secondary }]}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{wsAnalytics.totalProjects}</Text> projects
                      </Text>
                    </View>
                  </View>
                </View>

                {wsAnalytics.tasksByStatus.length > 0 && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Status Distribution</Text>
                    <BarChart
                      data={wsAnalytics.tasksByStatus.map(s => ({ label: s.status.replace(/_/g, ' '), value: s.count }))}
                      color={theme.colors.primary}
                    />
                  </View>
                )}

                {wsAnalytics.tasksByPriority.length > 0 && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Priority Distribution</Text>
                    <BarChart
                      data={wsAnalytics.tasksByPriority.map(p => ({ label: p.priority, value: p.count }))}
                      color={theme.colors.warning}
                    />
                  </View>
                )}

                {userAnalytics && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Productivity Insights</Text>
                    <View style={styles.insightGrid}>
                      <View style={[styles.insightItem, { backgroundColor: theme.colors.successLight }]}>
                        <Text style={[styles.insightValue, { color: theme.colors.success }]}>{userAnalytics.completedThisWeek}</Text>
                        <Text style={[styles.insightLabel, { color: theme.colors.text.secondary }]}>Done This Week</Text>
                      </View>
                      <View style={[styles.insightItem, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={[styles.insightValue, { color: theme.colors.primary }]}>{userAnalytics.completedThisMonth}</Text>
                        <Text style={[styles.insightLabel, { color: theme.colors.text.secondary }]}>Done This Month</Text>
                      </View>
                      <View style={[styles.insightItem, { backgroundColor: theme.colors.warningLight }]}>
                        <Text style={[styles.insightValue, { color: theme.colors.warning }]}>{userAnalytics.assignedTasks}</Text>
                        <Text style={[styles.insightLabel, { color: theme.colors.text.secondary }]}>Assigned</Text>
                      </View>
                      <View style={[styles.insightItem, { backgroundColor: theme.colors.dangerLight }]}>
                        <Text style={[styles.insightValue, { color: theme.colors.danger }]}>{userAnalytics.overdueAssigned}</Text>
                        <Text style={[styles.insightLabel, { color: theme.colors.text.secondary }]}>Overdue</Text>
                      </View>
                    </View>
                    <View style={styles.insightList}>
                      {wsAnalytics.insights.map((insight, i) => (
                        <View key={i} style={[styles.insightBullet, { backgroundColor: theme.colors.primaryLight }]}>
                          <Text style={{ color: theme.colors.primary, fontSize: 8, marginRight: 8 }}>●</Text>
                          <Text style={[styles.insightText, { color: theme.colors.text.secondary }]}>{insight}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {wsAnalytics.upcomingDeadlines.length > 0 && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Upcoming Deadlines</Text>
                    {wsAnalytics.upcomingDeadlines.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.deadlineItem, { borderBottomColor: theme.colors.border }]}
                        onPress={() => router.push(`/(protected)/tasks/${item.id}`)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.deadlineTitle, { color: theme.colors.text.primary }]}>{item.title}</Text>
                          <Text style={[styles.deadlineProject, { color: theme.colors.text.tertiary }]}>{item.projectName}</Text>
                        </View>
                        <Text style={[styles.deadlineDate, { color: new Date(item.dueDate) < new Date() ? theme.colors.danger : theme.colors.warning }]}>
                          {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {wsAnalytics.recentActivity.length > 0 && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Recent Activity</Text>
                    {wsAnalytics.recentActivity.slice(0, 5).map((item) => (
                      <View key={item.id} style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}>
                        <View style={[styles.activityDot, { backgroundColor: theme.colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.activityAction, { color: theme.colors.text.primary }]}>{item.action}</Text>
                          <Text style={[styles.activityMeta, { color: theme.colors.text.tertiary }]}>
                            {item.userName} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push('/(protected)/workspaces'); }}
              >
                <Text style={styles.navEmoji}>🏢</Text>
                <Text style={[styles.navButtonLabel, { color: theme.colors.text.primary }]}>Workspaces</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push('/(protected)/calendar'); }}
              >
                <Text style={styles.navEmoji}>📅</Text>
                <Text style={[styles.navButtonLabel, { color: theme.colors.text.primary }]}>Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push('/(protected)/search'); }}
              >
                <Text style={styles.navEmoji}>🔍</Text>
                <Text style={[styles.navButtonLabel, { color: theme.colors.text.primary }]}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push('/(protected)/settings'); }}
              >
                <Text style={styles.navEmoji}>⚙️</Text>
                <Text style={[styles.navButtonLabel, { color: theme.colors.text.primary }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 14, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  avatarBubble: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: (screenWidth - 50) / 2, padding: 16, borderRadius: 16 },
  kpiValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  progressMeta: { flex: 1, gap: 8 },
  progressStat: { fontSize: 14 },
  barChart: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 80, fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  insightItem: { width: (screenWidth - 88) / 2, padding: 14, borderRadius: 12 },
  insightValue: { fontSize: 22, fontWeight: '800' },
  insightLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  insightList: { gap: 8 },
  insightBullet: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10 },
  insightText: { fontSize: 13, flex: 1, lineHeight: 18 },
  deadlineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  deadlineTitle: { fontSize: 14, fontWeight: '600' },
  deadlineProject: { fontSize: 12, marginTop: 2 },
  deadlineDate: { fontSize: 12, fontWeight: '600', marginLeft: 12 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityAction: { fontSize: 13, lineHeight: 18 },
  activityMeta: { fontSize: 11, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  navButton: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  navEmoji: { fontSize: 22 },
  navButtonLabel: { fontSize: 12, fontWeight: '600' },
});
