import { ViewStyle } from 'react-native';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    border: string;
    primary: string;
    primaryLight: string;
    secondary: string;
    secondaryLight: string;
    danger: string;
    dangerLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      onPrimary: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  elevation: {
    sm: ViewStyle;
    md: ViewStyle;
    lg: ViewStyle;
  };
  typography: {
    fonts: {
      mono: string;
    };
    weights: Record<'regular' | 'medium' | 'semibold' | 'bold', '400' | '500' | '600' | '700'>;
    sizes: {
      display: number;
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      bodyLarge: number;
      bodyMedium: number;
      bodySmall: number;
      caption: number;
      tiny: number;
    };
    lineHeights: {
      display: number;
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      bodyLarge: number;
      bodyMedium: number;
      bodySmall: number;
      caption: number;
      tiny: number;
    };
  };
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
};

const typography = {
  fonts: { mono: 'monospace' },
  weights: { regular: '400' as const, medium: '500' as const, semibold: '600' as const, bold: '700' as const },
  sizes: {
    display: 36, h1: 28, h2: 22, h3: 18, h4: 16,
    bodyLarge: 16, bodyMedium: 14, bodySmall: 12, caption: 11, tiny: 9,
  },
  lineHeights: {
    display: 44, h1: 34, h2: 28, h3: 24, h4: 22,
    bodyLarge: 24, bodyMedium: 20, bodySmall: 18, caption: 16, tiny: 14,
  },
};

const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    secondary: '#64748B',
    secondaryLight: '#F1F5F9',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      tertiary: '#94A3B8',
      onPrimary: '#FFFFFF',
    },
  },
  spacing,
  elevation,
  typography,
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#090D16',
    surface: '#121826',
    border: '#1E293B',
    primary: '#6366F1',
    primaryLight: '#1E1B4B',
    secondary: '#94A3B8',
    secondaryLight: '#1E293B',
    danger: '#F87171',
    dangerLight: '#2D1B1B',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#451A03',
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      onPrimary: '#FFFFFF',
    },
  },
  spacing,
  elevation,
  typography,
};

export function useTheme(): Theme {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useDeviceColorScheme();

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return isDark ? darkTheme : lightTheme;
}

export default useTheme;
