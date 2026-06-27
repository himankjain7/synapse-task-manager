import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Text } from './typography/Text';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Command {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

function scoreMatch(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  if (lower.includes(q)) return 60;

  let qi = 0;
  let score = 0;
  let consecutive = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive > 1 ? 3 : 2;
    } else {
      consecutive = 0;
      score -= 1;
    }
  }
  return qi === q.length ? Math.max(10, score) : -1;
}

export function useCommandPalette() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setVisible(v => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [visible]);

  return {
    visible,
    open: () => setVisible(true),
    close: () => setVisible(false),
  };
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setVisible(v => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [visible]);

  return (
    <>
      {children}
      <CommandPalette visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

export default function CommandPalette({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const workspaceId = useWorkspaceStore(s => s.selectedWorkspaceId);
  const user = useAuthStore(s => s.user);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;
  const listRef = useRef<FlatList>(null);

  const commands: Command[] = useMemo(() => [
    { id: 'create-task', label: 'Create Task', description: 'Add a new task to current project', icon: '📋', category: 'Create', shortcut: 'C', action: () => { router.push(workspaceId ? `/(protected)/projects/${workspaceId}/tasks/create` as any : '/(protected)/workspaces'); onClose(); } },
    { id: 'create-project', label: 'Create Project', description: 'Start a new project in workspace', icon: '📁', category: 'Create', shortcut: 'P', action: () => { router.push(workspaceId ? `/(protected)/projects/create?workspaceId=${workspaceId}` as any : '/(protected)/workspaces'); onClose(); } },
    { id: 'create-workspace', label: 'Create Workspace', description: 'Create a new workspace', icon: '🏢', category: 'Create', shortcut: 'W', action: () => { router.push('/(protected)/workspaces/create'); onClose(); } },
    { id: 'search', label: 'Search', description: 'Search tasks, projects, and more', icon: '🔍', category: 'Navigate', shortcut: '/', action: () => { router.push('/(protected)/search'); onClose(); } },
    { id: 'dashboard', label: 'Dashboard', description: 'View workspace analytics', icon: '📊', category: 'Navigate', shortcut: 'D', action: () => { router.push('/(protected)'); onClose(); } },
    { id: 'notifications', label: 'Notifications', description: 'View your notifications', icon: '🔔', category: 'Navigate', shortcut: 'N', action: () => { router.push('/(protected)/notifications'); onClose(); } },
    { id: 'calendar', label: 'Calendar', description: 'View tasks by due date', icon: '📅', category: 'Navigate', shortcut: 'G', action: () => { router.push('/(protected)/calendar'); onClose(); } },
    { id: 'workspaces', label: 'Workspaces', description: 'Switch workspace', icon: '🏢', category: 'Navigate', shortcut: 'S', action: () => { router.push('/(protected)/workspaces'); onClose(); } },
    { id: 'settings', label: 'Settings', description: 'App settings and preferences', icon: '⚙️', category: 'Navigate', shortcut: ',', action: () => { router.push('/(protected)/settings'); onClose(); } },
    { id: 'profile', label: 'Profile', description: `View ${user?.name || 'your'} profile`, icon: '👤', category: 'Account', action: () => { onClose(); } },
    { id: 'theme-toggle', label: 'Toggle Theme', description: 'Switch between light and dark mode', icon: '🌙', category: 'Account', action: () => { onClose(); } },
    { id: 'logout', label: 'Log Out', description: 'Sign out of your account', icon: '🚪', category: 'Account', action: () => { onClose(); } },
  ], [router, onClose, workspaceId, user?.name]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const scored = commands
      .map(c => {
        const labelScore = scoreMatch(c.label, query);
        const descScore = scoreMatch(c.description, query);
        const catScore = scoreMatch(c.category, query);
        return { command: c, score: Math.max(labelScore * 2, descScore, catScore) };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.map(item => item.command);
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups: { category: string; items: Command[] }[] = [];
    filtered.forEach(c => {
      let g = groups.find(g => g.category === c.category);
      if (!g) { g = { category: c.category, items: [] }; groups.push(g); }
      g.items.push(c);
    });
    return groups;
  }, [filtered]);

  const flatItems = useMemo(() => {
    const items: Array<{ type: 'header'; label: string } | { type: 'command'; command: Command }> = [];
    grouped.forEach(g => {
      items.push({ type: 'header', label: g.category });
      g.items.forEach(c => items.push({ type: 'command', command: c }));
    });
    return items;
  }, [grouped]);

  const totalCommands = filtered.length;

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIdx(0);
      Animated.parallel([
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.spring(translateAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
      ]).start();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      fadeAnim.setValue(0); scaleAnim.setValue(0.95); translateAnim.setValue(16);
    }
  }, [visible]);

  const runCommand = useCallback((cmd: Command) => {
    triggerHaptic('light');
    cmd.action();
    Keyboard.dismiss();
  }, []);

  const   handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (Platform.OS !== 'web') return;
    const key = e.key;
    if (key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => { const next = Math.min(i + 1, totalCommands - 1); listRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0.5 }); return next; });
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => { const prev = Math.max(i - 1, 0); listRef.current?.scrollToIndex({ index: prev, animated: true, viewPosition: 0.5 }); return prev; });
    } else if (key === 'Enter' && flatItems[selectedIdx]?.type === 'command') {
      e.preventDefault();
      runCommand(flatItems[selectedIdx].command);
    } else if (key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [flatItems, selectedIdx, totalCommands, runCommand, onClose]);

  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.palette, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, transform: [{ scale: scaleAnim }, { translateY: translateAnim }] }]}>
          <View style={[styles.inputRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.colors.text.primary }]}
              placeholder="Type a command..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Command palette search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
                <Text color="tertiary">✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            ref={listRef}
            data={flatItems}
            keyExtractor={(item, idx) => item.type === 'header' ? `h-${item.label}` : `c-${item.command.id}`}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            renderItem={({ item, index }) => {
              if (item.type === 'header') {
                return <Text variant="caption" color="tertiary" weight="semibold" style={styles.categoryHeader}>{item.label}</Text>;
              }
              const isSelected = index === selectedIdx;
              return (
                <TouchableOpacity
                  style={[styles.commandRow, { backgroundColor: isSelected ? theme.colors.primaryLight : 'transparent' }]}
                  onPress={() => { setSelectedIdx(index); runCommand(item.command); }}
                  activeOpacity={0.7}
                  accessibilityLabel={`${item.command.label}: ${item.command.description}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.commandIcon}>{item.command.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" variant="bodyMedium">{item.command.label}</Text>
                    <Text variant="caption" color="tertiary">{item.command.description}</Text>
                  </View>
                  {item.command.shortcut && (
                    <View style={[styles.shortcutBadge, { backgroundColor: theme.colors.border }]}>
                      <Text variant="tiny" color="tertiary" weight="semibold">{item.command.shortcut}</Text>
                    </View>
                  )}
                  {isSelected && <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />}
                </TouchableOpacity>
              );
            }}
          />
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Text variant="caption" color="tertiary">↑↓ Navigate · ↵ Select · ⎋ Close</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  palette: { width: Math.min(SCREEN_WIDTH - 32, 540), maxHeight: 480, borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  categoryHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 },
  commandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  commandIcon: { fontSize: 16, width: 24 },
  shortcutBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  selectedIndicator: { width: 3, height: 24, borderRadius: 2, marginLeft: 4 },
  footer: { padding: 10, alignItems: 'center', borderTopWidth: 1 },
});
