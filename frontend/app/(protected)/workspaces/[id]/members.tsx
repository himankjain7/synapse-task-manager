import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../hooks/useTheme';
import { useWorkspace, useMembers, useUpdateMemberRole, useRemoveMember } from '../../../../hooks/useWorkspaces';
import { useAuthStore } from '../../../../store/authStore';
import { useToastStore } from '../../../../store/toastStore';
import { Text } from '../../../../components/typography/Text';
import { Heading } from '../../../../components/typography/Heading';
import { LoadingView } from '../../../../components/feedback/LoadingView';
import { ErrorState } from '../../../../components/feedback/ErrorState';
import { EmptyState } from '../../../../components/feedback/EmptyState';
import { getInitials } from '../../../../utils/formatting';
import { formatDate } from '../../../../utils/date';
import { triggerHaptic } from '../../../../utils/haptics';
import { WorkspaceRole } from '../../../../types/workspace';

const roleBadgeColors: Record<WorkspaceRole, { bg: string; text: string; label: string }> = {
  owner: { bg: '#FEF3C7', text: '#92400E', label: 'Owner' },
  admin: { bg: '#F3E8FF', text: '#7C3AED', label: 'Admin' },
  member: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Member' },
  guest: { bg: '#F1F5F9', text: '#64748B', label: 'Guest' },
};

export default function MembersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const { data: workspace } = useWorkspace(id);
  const { data: membersData, isLoading, isError, refetch, isRefetching } = useMembers(id);
  const { mutateAsync: updateRole } = useUpdateMemberRole(id);
  const { mutateAsync: removeMember } = useRemoveMember(id);

  const members = membersData?.data || [];
  const isOwner = workspace?.ownerId === user?.id;
  const currentUserMembership = members.find((m) => m.userId === user?.id);
  const isAdmin = isOwner || currentUserMembership?.role === 'admin';

  const handleRemoveMember = useCallback(
    (memberId: string, memberName: string) => {
      triggerHaptic('warning');
      Alert.alert('Remove Member', `Are you sure you want to remove ${memberName} from this workspace?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(memberId);
              triggerHaptic('success');
              showToast(`${memberName} removed from workspace`, 'success');
            } catch {
              triggerHaptic('error');
              showToast('Failed to remove member', 'error');
            }
          },
        },
      ]);
    },
    [removeMember, showToast]
  );

  const handleChangeRole = useCallback(
    (memberId: string, memberName: string, currentRole: WorkspaceRole) => {
      triggerHaptic('light');
      const nextRole: WorkspaceRole = currentRole === 'admin' ? 'member' : currentRole === 'member' ? 'admin' : 'member';
      const action = nextRole === 'admin' ? 'promote' : 'demote';
      const title = currentRole === 'admin' ? 'Demote to Member' : 'Promote to Admin';

      Alert.alert(title, `Change ${memberName}'s role?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: title,
          onPress: async () => {
            try {
              await updateRole({ memberId, input: { role: nextRole } });
              triggerHaptic('success');
              showToast(`${memberName} is now ${nextRole}`, 'success');
            } catch {
              triggerHaptic('error');
              showToast('Failed to update member role', 'error');
            }
          },
        },
      ]);
    },
    [updateRole, showToast]
  );

  const handleMemberAction = useCallback(
    (member: typeof members[0]) => {
      if (!isAdmin) return;
      if (member.role === 'owner') return;

      triggerHaptic('light');

      if (isOwner) {
        Alert.alert(member.user.name, `Role: ${member.role}`, [
          {
            text: member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin',
            onPress: () => handleChangeRole(member.id, member.user.name, member.role),
          },
          {
            text: 'Remove from Workspace',
            style: 'destructive',
            onPress: () => handleRemoveMember(member.id, member.user.name),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else if (isAdmin && member.role !== 'admin') {
        Alert.alert(member.user.name, `Role: ${member.role}`, [
          {
            text: member.role === 'member' ? 'Demote to Guest' : 'Promote to Member',
            onPress: () => handleChangeRole(member.id, member.user.name, member.role),
          },
          {
            text: 'Remove from Workspace',
            style: 'destructive',
            onPress: () => handleRemoveMember(member.id, member.user.name),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [isAdmin, isOwner, handleChangeRole, handleRemoveMember]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text color="primary" weight="semibold">Back</Text>
        </TouchableOpacity>
        <Heading level={4}>Members</Heading>
        <View style={styles.headerButton}>
          {isAdmin && (
            <TouchableOpacity onPress={() => router.push(`/(protected)/workspaces/${id}/invite`)}>
              <Text color="primary" weight="semibold">Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && <LoadingView fullScreen message="Loading members..." />}

      {isError && <ErrorState title="Could not load members" onRetry={refetch} />}

      {members.length === 0 && !isLoading && (
        <EmptyState title="No members yet" description="Invite people to collaborate." />
      )}

      {members.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
        >
          <View style={styles.list}>
            {members.map((member, idx) => {
              const badge = roleBadgeColors[member.role];
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberRow,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    idx === 0 && { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                    idx === members.length - 1 && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
                    idx > 0 && { borderTopWidth: 0 },
                  ]}
                  onPress={() => handleMemberAction(member)}
                  activeOpacity={isAdmin && member.role !== 'owner' ? 0.6 : 1}
                  disabled={!isAdmin || member.role === 'owner'}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
                      {getInitials(member.user.name)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text weight="semibold" variant="bodyMedium">{member.user.name}</Text>
                    <Text variant="bodySmall" color="secondary">{member.user.email}</Text>
                    <Text variant="caption" color="tertiary">
                      Joined {formatDate(member.joinedAt)}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleText, { color: badge.text }]} variant="caption" weight="semibold">
                      {badge.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
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
  headerButton: { width: 60, alignItems: 'flex-end' },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  list: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1, gap: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: { fontSize: 11, letterSpacing: 0.3 },
});
