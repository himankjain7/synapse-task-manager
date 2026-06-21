import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useGlobalSearch } from '../../../hooks/useSearch';
import { useDebounce } from '../../../hooks/useDebounce';
import { triggerHaptic } from '../../../utils/haptics';

const screenWidth = Dimensions.get('window').width;

function ResultSection({ title, children, color }: { title: string; children: React.ReactNode; color: string }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.sectionDot, { backgroundColor: color }]} />
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useGlobalSearch(debouncedQuery);

  const totalResults = data
    ? data.workspaces.length + data.projects.length + data.tasks.length + data.labels.length
    : 0;

  const handleSelect = useCallback((type: string, id: string) => {
    triggerHaptic('light');
    switch (type) {
      case 'workspace':
        router.push(`/(protected)/workspaces/${id}`);
        break;
      case 'project':
        router.push(`/(protected)/projects/${id}`);
        break;
      case 'task':
        router.push(`/(protected)/tasks/${id}`);
        break;
    }
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: theme.colors.text.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Search</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search workspaces, projects, tasks..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={[styles.clearBtn, { color: theme.colors.text.tertiary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {query.length < 2 ? (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={[styles.placeholderTitle, { color: theme.colors.text.primary }]}>Global Search</Text>
            <Text style={[styles.placeholderSub, { color: theme.colors.text.secondary }]}>
              Type at least 2 characters to search across workspaces, projects, tasks, and labels
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text.secondary, marginTop: 12 }}>Searching...</Text>
          </View>
        ) : totalResults === 0 ? (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={[styles.placeholderTitle, { color: theme.colors.text.primary }]}>No results found</Text>
            <Text style={[styles.placeholderSub, { color: theme.colors.text.secondary }]}>
              No matches for "{debouncedQuery}". Try a different search term.
            </Text>
          </View>
        ) : (
          <>
            {data!.workspaces.length > 0 && (
              <ResultSection title={`Workspaces (${data!.workspaces.length})`} color={theme.colors.primary}>
                {data!.workspaces.map((w) => (
                  <TouchableOpacity key={w.id} style={[styles.resultItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleSelect('workspace', w.id)}>
                    <View style={[styles.resultIcon, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={{ fontSize: 16 }}>🏢</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text.primary }]}>{w.name}</Text>
                      <Text style={[styles.resultType, { color: theme.colors.text.tertiary }]}>Workspace</Text>
                    </View>
                    <Text style={{ color: theme.colors.text.tertiary }}>→</Text>
                  </TouchableOpacity>
                ))}
              </ResultSection>
            )}

            {data!.projects.length > 0 && (
              <ResultSection title={`Projects (${data!.projects.length})`} color={theme.colors.success}>
                {data!.projects.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.resultItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleSelect('project', p.id)}>
                    <View style={[styles.resultIcon, { backgroundColor: theme.colors.successLight }]}>
                      <Text style={{ fontSize: 16 }}>📁</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text.primary }]}>{p.name}</Text>
                      <Text style={[styles.resultType, { color: theme.colors.text.tertiary }]}>Project</Text>
                    </View>
                    <Text style={{ color: theme.colors.text.tertiary }}>→</Text>
                  </TouchableOpacity>
                ))}
              </ResultSection>
            )}

            {data!.tasks.length > 0 && (
              <ResultSection title={`Tasks (${data!.tasks.length})`} color={theme.colors.warning}>
                {data!.tasks.map((t) => (
                  <TouchableOpacity key={t.id} style={[styles.resultItem, { borderBottomColor: theme.colors.border }]} onPress={() => handleSelect('task', t.id)}>
                    <View style={[styles.resultIcon, { backgroundColor: theme.colors.warningLight }]}>
                      <Text style={{ fontSize: 16 }}>✅</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>{t.title}</Text>
                      <Text style={[styles.resultType, { color: theme.colors.text.tertiary }]}>Task · {t.status.replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={{ color: theme.colors.text.tertiary }}>→</Text>
                  </TouchableOpacity>
                ))}
              </ResultSection>
            )}

            {data!.labels.length > 0 && (
              <ResultSection title={`Labels (${data!.labels.length})`} color={theme.colors.danger}>
                {data!.labels.map((l) => (
                  <View key={l.id} style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.resultIcon, { backgroundColor: l.color + '20' }]}>
                      <View style={[styles.labelColorDot, { backgroundColor: l.color }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text.primary }]}>{l.name}</Text>
                      <Text style={[styles.resultType, { color: theme.colors.text.tertiary }]}>Label</Text>
                    </View>
                  </View>
                ))}
              </ResultSection>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backArrow: { fontSize: 24, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 12, paddingHorizontal: 14, height: 48, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  clearBtn: { fontSize: 16, padding: 4 },
  scrollContent: { paddingBottom: 40 },
  placeholder: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  placeholderTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  placeholderSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  section: { marginBottom: 16, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, marginBottom: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  resultIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultType: { fontSize: 11, marginTop: 2 },
  labelColorDot: { width: 16, height: 16, borderRadius: 4 },
});
