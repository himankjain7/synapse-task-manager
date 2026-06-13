import { colors, ColorPalette } from './colors';
import { typography, TypographySystem } from './typography';
import { spacing, SpacingTokens } from './spacing';
import { radius, RadiusTokens } from './radius';
import { elevation, ElevationTokens } from './elevation';

export interface Theme {
  dark: boolean;
  colors: ColorPalette;
  typography: TypographySystem;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
}

export const lightTheme: Theme = {
  dark: false,
  colors: colors.light,
  typography,
  spacing,
  radius,
  elevation: elevation.light,
};

export const darkTheme: Theme = {
  dark: true,
  colors: colors.dark,
  typography,
  spacing,
  radius,
  elevation: elevation.dark,
};

export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { radius } from './radius';
export { elevation } from './elevation';
export type { ColorPalette } from './colors';
export type { TypographySystem } from './typography';
export type { SpacingTokens } from './spacing';
export type { RadiusTokens } from './radius';
export type { ElevationTokens, ElevationTokenKeys } from './elevation';
