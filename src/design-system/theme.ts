import { type AppColors, colors, type ColorScheme, gradients, palette } from './tokens/colors';
import { createShadow, type ShadowLevel } from './tokens/shadows';
import { duration, easing, pressScale, spring, timing } from './tokens/motion';
import { radii } from './tokens/radii';
import { spacing } from './tokens/spacing';
import { fontFamily, typography } from './tokens/typography';

export interface Theme {
  scheme: ColorScheme;
  colors: AppColors;
  palette: typeof palette;
  gradients: typeof gradients;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  motion: {
    duration: typeof duration;
    easing: typeof easing;
    timing: typeof timing;
    spring: typeof spring;
    pressScale: typeof pressScale;
  };
  /** Shadow bound to this theme's default neutral tint — pass a color for a "glow". */
  shadow: (level: ShadowLevel, tint?: string) => Record<string, unknown>;
}

function buildTheme(scheme: ColorScheme): Theme {
  const defaultTint = scheme === 'light' ? '#3A3529' : '#000000';
  return {
    scheme,
    colors: colors[scheme],
    palette,
    gradients,
    spacing,
    radii,
    typography,
    fontFamily,
    motion: { duration, easing, timing, spring, pressScale },
    shadow: (level, tint) => createShadow(level, tint ?? defaultTint),
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
