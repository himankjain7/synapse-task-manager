import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, SafeAreaView, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { useGlobalSearch } from '../../../hooks/useSearch';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { Text } from '../../../components/typography/Text';
import { Heading } from '../../../components/typography/Heading';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { FadeIn } from '../../../components/animations/FadeIn';
import { PressScale } from '../../../components/animations/PressScale';
import { triggerHaptic } from '../../../utils/haptics';
import { formatRelativeTime } from '../../../utils/date';
import { SkeletonCard } from '../../../components/workspace/SkeletonCard';

const RECENT_SEARCHES = ['API integration', 'Dashboard', 'Bug fixes'];

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const workspaceId = useWorkspaceStore((s) => s.selectedWorkspaceId) || undefined;
  const { data: searchResult, isLoading } = useGlobalSearch(query, workspaceId);

  const flatItems = useMemo(() => {
    if (!searchResult) return [];
    const items: Array<{ id: string; title: string; description?: string; type: string; route?: string }> = [];
    searchResult.tasks.forEach(t => items.push({ id: `task-${t.id}`, title: t.title, description: `Task · ${t.status}`, type: 'task', route: `/(protected)/tasks/${t.id}` }));
    searchResult.projects.forEach(p => items.push({ id: `proj-${p.id}`, title: p.name, description: 'Project', type: 'project', route: `/(protected)/projects/${p.id}?workspaceId=${p.workspaceId}` }));
    searchResult.workspaces.forEach(w => items.push({ id: `ws-${w.id}`, title: w.name, description: 'Workspace', type: 'workspace', route: `/(protected)/workspaces/${w.id}` }));
    searchResult.labels.forEach(l => items.push({ id: `lbl-${l.id}`, title: l.name, description: `Label · ${l.color}`, type: 'label' }));
    return items;
  }, [searchResult]);

  const renderItem = useCallback(({ item, index }: { item: typeof flatItems[0]; index: number }) => (
    <FadeIn slide delay={index * 40}>
      <PressScale lift onPress={() => { triggerHaptic('light'); if (item.route) router.push(item.route as any); }}>
        <View style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.resultIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={{ fontSize: 16 }}>{item.type === 'task' ? '📋' : item.type === 'project' ? '📁' : item.type === 'workspace' ? '🏢' : '💬'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="semibold" variant="bodyMedium" numberOfLines={1}>{item.title}</Text>
            {item.description && <Text variant="bodySmall" color="secondary" numberOfLines={1}>{item.description}</Text>}
            <Text variant="caption" color="tertiary">{item.type}</Text>
          </View>
        </View>
      </PressScale>
    </FadeIn>
  ), [router, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text color="primary" weight="semibold">Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search tasks, projects, members..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text color="tertiary" style={{ fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={flatItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !query ? (
            <View style={styles.recentSection}>
              <Text variant="caption" color="tertiary" weight="semibold" style={styles.sectionTitle}>Recent Searches</Text>
              {RECENT_SEARCHES.map((s, i) => (
                <TouchableOpacity key={i} style={[styles.recentItem, { borderBottomColor: theme.colors.border }]} onPress={() => setQuery(s)}>
                  <Text style={{ marginRight: 10, fontSize: 14 }}>🕐</Text>
                  <Text variant="bodyMedium" color="secondary">{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          query.length > 0 && !isLoading ? (
            <EmptyState emoji="search" title="No results" description={`No results found for "${query}". Try a different search term.`} />
          ) : query.length > 0 && isLoading ? (
            <SkeletonCard count={3} variant="list" />
          ) : null
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerBtn: { alignSelf: 'flex-start' },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14, height: 48, borderRadius: 14, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  listContent: { flexGrow: 1 },
  recentSection: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
