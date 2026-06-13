export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderFocus: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    onPrimary: string;
    onSecondary: string;
  };
}

export const colors: { light: ColorPalette; dark: ColorPalette } = {
  light: {
    primary: '#4F46E5', // Indigo-600
    primaryLight: '#EEF2FF', // Indigo-50
    primaryDark: '#3730A3', // Indigo-800
    
    secondary: '#0F172A', // Slate-900
    secondaryLight: '#F1F5F9', // Slate-100
    secondaryDark: '#1E293B', // Slate-800

    success: '#10B981', // Emerald-500
    successLight: '#ECFDF5', // Emerald-50
    
    warning: '#F59E0B', // Amber-500
    warningLight: '#FEF3C7', // Amber-50
    
    danger: '#EF4444', // Red-500
    dangerLight: '#FEF2F2', // Red-50
    
    background: '#FAFAFA', // Warm gray bg
    surface: '#FFFFFF', // Clean white card
    surfaceElevated: '#F8FAFC',
    
    border: '#E2E8F0', // Slate-200
    borderFocus: '#818CF8', // Indigo-400
    
    text: {
      primary: '#0F172A', // Slate-900 (High contrast)
      secondary: '#475569', // Slate-600 (Medium contrast)
      tertiary: '#94A3B8', // Slate-400 (Low contrast/Placeholder)
      onPrimary: '#FFFFFF',
      onSecondary: '#FFFFFF',
    },
  },
  dark: {
    primary: '#6366F1', // Indigo-500
    primaryLight: '#1E1B4B', // Indigo-950
    primaryDark: '#4F46E5', // Indigo-600
    
    secondary: '#F8FAFC', // Slate-50
    secondaryLight: '#1E293B', // Slate-800
    secondaryDark: '#E2E8F0', // Slate-200

    success: '#10B981', // Emerald-500
    successLight: '#022C22', // Emerald-950
    
    warning: '#F59E0B', // Amber-500
    warningLight: '#451A03', // Amber-950
    
    danger: '#EF4444', // Red-500
    dangerLight: '#450A0A', // Red-950
    
    background: '#090D16', // Deep Dark Blue-Gray (Premium dark mode bg)
    surface: '#121826', // Deep Slate card
    surfaceElevated: '#1B2336',
    
    border: '#1E293B', // Slate-800
    borderFocus: '#6366F1', // Indigo-500
    
    text: {
      primary: '#F8FAFC', // Slate-50
      secondary: '#94A3B8', // Slate-400
      tertiary: '#64748B', // Slate-500
      onPrimary: '#FFFFFF',
      onSecondary: '#0F172A',
    },
  },
};
