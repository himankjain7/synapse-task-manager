import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  const { hapticsEnabled } = useSettingsStore.getState();
  if (!hapticsEnabled || Platform.OS === 'web') return;

  const map: Record<string, ExpoHaptics.ImpactFeedbackStyle> = {
    light: ExpoHaptics.ImpactFeedbackStyle.Light,
    medium: ExpoHaptics.ImpactFeedbackStyle.Medium,
    heavy: ExpoHaptics.ImpactFeedbackStyle.Heavy,
  };

  try {
    if (type === 'success') {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
    } else if (type === 'warning') {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
    } else if (type === 'error') {
      ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
    } else {
      ExpoHaptics.impactAsync(map[type] || ExpoHaptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Silently fail on devices without haptic support
  }
}
