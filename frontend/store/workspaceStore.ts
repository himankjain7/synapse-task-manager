import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkspaceState {
  selectedWorkspaceId: string | null;
  selectWorkspace: (id: string | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      selectWorkspace: (id) => set({ selectedWorkspaceId: id }),
      clearWorkspace: () => set({ selectedWorkspaceId: null }),
    }),
    {
      name: 'synapse-workspace-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedWorkspaceId: state.selectedWorkspaceId }),
      skipHydration: true,
    }
  )
);
