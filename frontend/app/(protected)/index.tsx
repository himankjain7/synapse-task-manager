import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useWorkspaceAnalytics, useUserAnalytics } from '../../hooks/useAnalytics';
import { triggerHaptic } from '../../utils/haptics';
import { SkeletonCard } from '../../components/workspace/SkeletonCard';
import { PressScale } from '../../components/animations/PressScale';
import { FadeIn } from '../../components/animations/FadeIn';

function ProgressRing({ percent, size = 80, strokeWidth = 8, color, bgColor }: { percent: number; size?: number; strokeWidth?: number; color: string; bgColor: string }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animVal.setValue(0);
    Animated.spring(animVal, { toValue: percent, friction: 6, tension: 60, useNativeDriver: false }).start();
  }, [percent]);

  const rotate = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: ['-45deg', '315deg'],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: bgColor,
      }} />
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: 'transparent',
        borderTopColor: color, borderRightColor: color,
        borderBottomColor: color, borderLeftColor: color,
        transform: [{ rotate }],
        opacity: animVal.interpolate({
          inputRange: [0, 50, 100],
          outputRange: [0.3, 0.7, 1],
        }),
      }} />
      <Text style={{ fontSize: size * 0.22, fontWeight: '700', color, letterSpacing: -0.5 }}>
        {percent}%
      </Text>
    </View>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.barChart}>
      {data.map((item, idx) => (
        <View key={item.label} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: color + 'CC' }]}>{item.label}</Text>
          <View style={[styles.barTrack, { backgroundColor: color + '15' }]}>
            <AnimatedBar width={(item.value / maxVal) * 100} color={color} index={idx} />
          </View>
          <Text style={[styles.barValue, { color }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function AnimatedBar({ width, color, index }: { width: number; color: string; index: number }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, { toValue: width, duration: 600 + index * 100, useNativeDriver: false }).start();
  }, [width, index]);

  return (
    <Animated.View style={[styles.barFill, { width: animVal.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: color }]} />
  );
}

function InsightCard({ value, label, color, bgColor, screenWidth }: { value: number; label: string; color: string; bgColor: string; screenWidth: number }) {
  return (
    <PressScale scaleTo={0.95}>
      <View style={[styles.insightItem, { backgroundColor: bgColor, width: (screenWidth - 88) / 2 }]}>
        <Text style={[styles.insightValue, { color }]}>{value}</Text>
        <Text style={[styles.insightLabel, { color: color + 'B3' }]}>{label}</Text>
      </View>
    </PressScale>
  );
}

function KpiCard({ label, value, color, bgColor, index, screenWidth }: { label: string; value: number; color: string; bgColor: string; index: number; screenWidth: number }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animVal.setValue(0);
    Animated.spring(animVal, { toValue: 1, friction: 6, tension: 60, delay: index * 80, useNativeDriver: true }).start();
  }, [value, index]);

  return (
    <PressScale scaleTo={0.95}>
      <Animated.View style={[styles.kpiCard, { backgroundColor: bgColor, width: (screenWidth - 50) / 2, opacity: animVal, transform: [{ translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <Animated.Text style={[styles.kpiValue, { color }]}>
          {animVal.interpolate({
            inputRange: [0, 1],
            outputRange: [0, value],
          })}
        </Animated.Text>
        <Text style={[styles.kpiLabel, { color: color + 'B3' }]}>{label}</Text>
      </Animated.View>
    </PressScale>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuthStore();
  const badgeCount = useNotificationStore((s) => s.badgeCount);
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const firstWsId = workspaces?.data?.[0]?.id;
  const { data: wsAnalytics, isLoading: analyticsLoading } = useWorkspaceAnalytics(firstWsId);
  const { data: userAnalytics } = useUserAnalytics(firstWsId);

  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const statCards = useMemo(() => {
    if (!wsAnalytics) return [];
    return [
      { label: 'Total Tasks', value: wsAnalytics.totalTasks, color: theme.colors.primary, bgColor: theme.colors.primaryLight },
      { label: 'Completed', value: wsAnalytics.completedTasks, color: theme.colors.success, bgColor: theme.colors.successLight },
      { label: 'In Progress', value: wsAnalytics.activeTasks, color: theme.colors.warning, bgColor: theme.colors.warningLight },
      { label: 'Overdue', value: wsAnalytics.overdueTasks, color: theme.colors.danger, bgColor: theme.colors.dangerLight },
    ];
  }, [wsAnalytics, theme]);

  const isLoading = wsLoading || analyticsLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.text.secondary }]}>Welcome back</Text>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'User'}</Text>
            </View>
            <View style={styles.headerRight}>
              <PressScale scaleTo={0.92}>
                <TouchableOpacity
                  onPress={() => { triggerHaptic('light'); router.push('/(protected)/notifications'); }}
                  style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  accessibilityLabel="Notifications"
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 18 }}>🔔</Text>
                  {badgeCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                      <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </PressScale>
              <View style={[styles.avatarBubble, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>{initials}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {isLoading ? (
          <SkeletonCard variant="dashboard" />
        ) : wsAnalytics ? (
          <>
            <View style={styles.kpiRow}>
              {statCards.map((card, idx) => <KpiCard key={card.label} {...card} index={idx} screenWidth={screenWidth} />)}
            </View>

            <FadeIn slide delay={200}>
              <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Completion Progress</Text>
                <View style={styles.progressRow}>
                  <ProgressRing percent={wsAnalytics.completionPercent} color={theme.colors.primary} bgColor={theme.colors.primaryLight} />
                  <View style={styles.progressMeta}>
                    {[
                      { label: 'completed', value: wsAnalytics.completedTasks, color: theme.colors.success },
                      { label: 'in progress', value: wsAnalytics.activeTasks, color: theme.colors.warning },
                      { label: 'overdue', value: wsAnalytics.overdueTasks, color: theme.colors.danger },
                      { label: 'projects', value: wsAnalytics.totalProjects, color: theme.colors.primary },
                    ].map((item) => (
                      <View key={item.label} style={styles.progressStatRow}>
                        <View style={[styles.statDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.progressStat, { color: theme.colors.text.secondary }]}>
                          <Text style={{ color: item.color, fontWeight: '700' }}>{item.value}</Text> {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </FadeIn>

            {wsAnalytics.tasksByStatus.length > 0 && (
              <FadeIn slide delay={300}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Status Distribution</Text>
                  <BarChart data={wsAnalytics.tasksByStatus.map(s => ({ label: s.status.replace(/_/g, ' '), value: s.count }))} color={theme.colors.primary} />
                </View>
              </FadeIn>
            )}

            {wsAnalytics.tasksByPriority.length > 0 && (
              <FadeIn slide delay={400}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Priority Distribution</Text>
                  <BarChart data={wsAnalytics.tasksByPriority.map(p => ({ label: p.priority, value: p.count }))} color={theme.colors.warning} />
                </View>
              </FadeIn>
            )}

            {userAnalytics && (
              <FadeIn slide delay={500}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Productivity Insights</Text>
                  <View style={styles.insightGrid}>
                    <InsightCard value={userAnalytics.completedThisWeek} label="Done This Week" color={theme.colors.success} bgColor={theme.colors.successLight} screenWidth={screenWidth} />
                    <InsightCard value={userAnalytics.completedThisMonth} label="Done This Month" color={theme.colors.primary} bgColor={theme.colors.primaryLight} screenWidth={screenWidth} />
                    <InsightCard value={userAnalytics.assignedTasks} label="Assigned" color={theme.colors.warning} bgColor={theme.colors.warningLight} screenWidth={screenWidth} />
                    <InsightCard value={userAnalytics.overdueAssigned} label="Overdue" color={theme.colors.danger} bgColor={theme.colors.dangerLight} screenWidth={screenWidth} />
                  </View>
                  {wsAnalytics.insights?.map((insight, i) => (
                    <View key={i} style={[styles.insightBullet, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={[styles.bulletDot, { color: theme.colors.primary }]}>●</Text>
                      <Text style={[styles.insightText, { color: theme.colors.text.secondary }]}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </FadeIn>
            )}

            {wsAnalytics.upcomingDeadlines.length > 0 && (
              <FadeIn slide delay={600}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Upcoming Deadlines</Text>
                  {wsAnalytics.upcomingDeadlines.slice(0, 5).map((item) => {
                    const isOverdue = new Date(item.dueDate) < new Date();
                    return (
                      <PressScale key={item.id} scaleTo={0.97}>
                        <TouchableOpacity
                          style={[styles.deadlineItem, { borderBottomColor: theme.colors.border }]}
                          onPress={() => { triggerHaptic('light'); router.push(`/(protected)/tasks/${item.id}`); }}
                          accessibilityLabel={`Task: ${item.title}`}
                        >
                          <View style={[styles.deadlineDot, { backgroundColor: isOverdue ? theme.colors.danger : theme.colors.warning }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.deadlineTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={[styles.deadlineProject, { color: theme.colors.text.tertiary }]}>{item.projectName}</Text>
                          </View>
                          <Text style={[styles.deadlineDate, { color: isOverdue ? theme.colors.danger : theme.colors.text.secondary }]}>
                            {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </TouchableOpacity>
                      </PressScale>
                    );
                  })}
                </View>
              </FadeIn>
            )}

            {wsAnalytics.recentActivity?.length > 0 && (
              <FadeIn slide delay={700}>
                <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Recent Activity</Text>
                  {wsAnalytics.recentActivity.slice(0, 5).map((item) => (
                    <View key={item.id} style={[styles.activityItem, { borderBottomColor: theme.colors.border }]}>
                      <View style={[activityStyles.dot, { backgroundColor: theme.colors.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityAction, { color: theme.colors.text.primary }]}>{item.action}</Text>
                        <Text style={[styles.activityMeta, { color: theme.colors.text.tertiary }]}>
                          {item.userName} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </FadeIn>
            )}
          </>
        ) : null}

        <View style={styles.navRow}>
          {([
            { emoji: '🏢', label: 'Workspaces', route: '/(protected)/workspaces' as const },
            { emoji: '📅', label: 'Calendar', route: '/(protected)/calendar' as const },
            { emoji: '🔍', label: 'Search', route: '/(protected)/search' as const },
            { emoji: '⚙️', label: 'Settings', route: '/(protected)/settings' as const },
          ] as const).map((item) => (
            <PressScale key={item.label} scaleTo={0.93}>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => { triggerHaptic('light'); router.push(item.route); }}
                activeOpacity={0.7}
                accessibilityLabel={item.label}
                accessibilityRole="button"
              >
                <Text style={styles.navEmoji}>{item.emoji}</Text>
                <Text style={[styles.navButtonLabel, { color: theme.colors.text.secondary }]}>{item.label}</Text>
              </TouchableOpacity>
            </PressScale>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const activityStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 14, fontWeight: '500', letterSpacing: 0.3 },
  userName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  avatarBubble: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { padding: 18, borderRadius: 16, gap: 4 },
  kpiValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  progressMeta: { flex: 1, gap: 8 },
  progressStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  progressStat: { fontSize: 14 },
  barChart: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 80, fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  insightItem: { padding: 14, borderRadius: 12, gap: 2 },
  insightValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  insightLabel: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  insightBullet: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
  bulletDot: { fontSize: 8, marginRight: 10 },
  insightText: { fontSize: 13, flex: 1, lineHeight: 18 },
  deadlineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  deadlineDot: { width: 8, height: 8, borderRadius: 4 },
  deadlineTitle: { fontSize: 14, fontWeight: '600' },
  deadlineProject: { fontSize: 12, marginTop: 2 },
  deadlineDate: { fontSize: 12, fontWeight: '600' },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  activityAction: { fontSize: 13, lineHeight: 18 },
  activityMeta: { fontSize: 11, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  navButton: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  navEmoji: { fontSize: 22 },
  navButtonLabel: { fontSize: 12, fontWeight: '600' },
});
