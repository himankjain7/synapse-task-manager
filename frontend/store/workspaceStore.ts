import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export let previousWorkspaceId: string | null = null;

interface WorkspaceState {
  selectedWorkspaceId: string | null;
  selectWorkspace: (id: string | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      selectWorkspace: (id) => {
        previousWorkspaceId = useWorkspaceStore.getState().selectedWorkspaceId;
        set({ selectedWorkspaceId: id });
      },
      clearWorkspace: () => {
        previousWorkspaceId = useWorkspaceStore.getState().selectedWorkspaceId;
        set({ selectedWorkspaceId: null });
      },
    }),
    {
      name: 'synapse-workspace-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedWorkspaceId: state.selectedWorkspaceId }),
      skipHydration: true,
    }
  )
);
