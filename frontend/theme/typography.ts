import { Platform } from 'react-native';

export const typography = {
  fonts: {
    // System fonts standard on iOS/Android, easily extendable later
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'System' }),
    mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier' }),
  },
  sizes: {
    display: 32,
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 18,
    bodyLarge: 16,
    bodyMedium: 14,
    bodySmall: 12,
    caption: 11,
    tiny: 10,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  } as const,
  lineHeights: {
    display: 40,
    h1: 36,
    h2: 32,
    h3: 26,
    h4: 24,
    bodyLarge: 24,
    bodyMedium: 20,
    bodySmall: 16,
    caption: 14,
    tiny: 12,
  },
} as const;

export type TypographySystem = typeof typography;
