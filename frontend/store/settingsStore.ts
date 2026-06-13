import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  language: string;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  setLanguage: (language: string) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      hapticsEnabled: true,
      notificationsEnabled: true,
      setLanguage: (language) => set({ language }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: 'synapse-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
    }
  )
);
