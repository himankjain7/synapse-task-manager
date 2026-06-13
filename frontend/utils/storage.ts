import AsyncStorage from '@react-native-async-storage/async-storage';

// Define standardized local storage keys
export const StorageKeys = {
  AUTH_TOKEN: 'synapse_auth_token',
  USER_DATA: 'synapse_user_data',
  THEME_MODE: 'synapse_theme_mode',
  APP_SETTINGS: 'synapse_app_settings',
} as const;

export type StorageKeyType = typeof StorageKeys[keyof typeof StorageKeys];

/**
 * Type-safe wrappers for basic AsyncStorage CRUD operations
 */
export const Storage = {
  async setItem(key: StorageKeyType, value: unknown): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`AsyncStorage setItem error for key "${key}":`, error);
    }
  },

  async getItem<T>(key: StorageKeyType): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`AsyncStorage getItem error for key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: StorageKeyType): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`AsyncStorage removeItem error for key "${key}":`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
    }
  },
};

export default Storage;
