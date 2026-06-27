import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { FadeIn } from '../../../components/animations/FadeIn';
import { PressScale } from '../../../components/animations/PressScale';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentMonth, currentYear]);

  const goToPrev = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const goToNext = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <PressScale scaleTo={0.9}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text color="primary" weight="semibold">Back</Text>
          </TouchableOpacity>
        </PressScale>
        <Heading level={4}>Calendar</Heading>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn spring>
          <View style={[styles.calendarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.monthNav}>
              <PressScale scaleTo={0.88}>
                <TouchableOpacity onPress={goToPrev} style={styles.navBtn}>
                  <Text style={{ fontSize: 18 }}>‹</Text>
                </TouchableOpacity>
              </PressScale>
              <PressScale scaleTo={0.94}>
                <TouchableOpacity onPress={goToToday}>
                  <Text weight="semibold" variant="bodyLarge" style={{ color: theme.colors.text.primary }}>{MONTHS[currentMonth]} {currentYear}</Text>
                </TouchableOpacity>
              </PressScale>
              <PressScale scaleTo={0.88}>
                <TouchableOpacity onPress={goToNext} style={styles.navBtn}>
                  <Text style={{ fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              </PressScale>
            </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => (
              <View key={d} style={styles.weekdayCell}>
                <Text variant="caption" color="tertiary" weight="medium">{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, i) => {
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              return (
                <View key={i} style={styles.dayCell}>
                  {day && (
                    <View style={[styles.dayCircle, isToday && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.dayText, { color: isToday ? theme.colors.text.onPrimary : theme.colors.text.primary }, isToday && { fontWeight: '700' }]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        </FadeIn>

        <FadeIn spring delay={120}>
          <EmptyState emoji="calendar" title="No upcoming tasks" description="Tasks with due dates will appear here." />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { minWidth: 60, alignItems: 'center' },
  scroll: { flexGrow: 1, padding: 20 },
  calendarCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, fontWeight: '500' },
});
