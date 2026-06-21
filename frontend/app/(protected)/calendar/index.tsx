import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useTasks } from '../../../hooks/useTasks';
import { useWorkspaces } from '../../../hooks/useWorkspaces';
import { triggerHaptic } from '../../../utils/haptics';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const screenWidth = Dimensions.get('window').width;
const DAY_SIZE = (screenWidth - 80) / 7;

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  const { data: workspaces } = useWorkspaces();
  const firstWsId = workspaces?.data?.[0]?.id;
  const { data: firstProject } = useMemo(() => {
    return workspaces?.data?.[0]?.id ? { data: undefined } : { data: undefined };
  }, [workspaces]);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) result.push(null);
    for (let i = 1; i <= daysInMonth; i++) result.push(i);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const tasksForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return [];
  }, [selectedDate]);

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();
  };

  const isPast = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return theme.colors.danger;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.primary;
      default: return theme.colors.text.tertiary;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'done': return theme.colors.success;
      case 'in_progress': return theme.colors.primary;
      case 'review': return theme.colors.warning;
      default: return theme.colors.text.tertiary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { triggerHaptic('light'); router.back(); }}>
            <Text style={[styles.backArrow, { color: theme.colors.text.primary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Calendar</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.navBtnText, { color: theme.colors.text.primary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.text.primary }]}>
            {MONTHS[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.navBtnText, { color: theme.colors.text.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayHeader, { color: theme.colors.text.tertiary }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {days.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayCell,
                  isSelected(day!) && { backgroundColor: theme.colors.primary },
                  isToday(day!) && !isSelected(day!) && { borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
                onPress={() => { if (day) { triggerHaptic('light'); setSelectedDate(new Date(currentYear, currentMonth, day)); } }}
                disabled={!day}
              >
                <Text style={[
                  styles.dayText,
                  { color: day ? (isSelected(day) ? '#FFF' : theme.colors.text.primary) : 'transparent' },
                  isPast(day!) && !isSelected(day!) && { color: theme.colors.text.tertiary },
                ]}>
                  {day || ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.agendaSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            {selectedDate
              ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'}
          </Text>

          {tasksForDate.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No tasks due</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>All clear for this day</Text>
            </View>
          )}

          {tasksForDate.map((task: any) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push(`/(protected)/tasks/${task.id}`)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.taskHeader}>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority) }]} />
                  <Text style={[styles.taskTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>{task.title}</Text>
                </View>
                <View style={styles.taskMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(task.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor(task.status) }]}>{task.status.replace(/_/g, ' ')}</Text>
                  </View>
                  {task.projectName && (
                    <Text style={[styles.projectName, { color: theme.colors.text.tertiary }]}>{task.projectName}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backArrow: { fontSize: 24, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 16 },
  navBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  navBtnText: { fontSize: 18, fontWeight: '600' },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  calendarCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 20 },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { width: DAY_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE * 0.85, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 2 },
  dayText: { fontSize: 14, fontWeight: '600' },
  agendaSection: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySubtitle: { fontSize: 13, marginTop: 4 },
  taskCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  taskTitle: { fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  projectName: { fontSize: 11, fontWeight: '500' },
});
