/**
 * 14 STARS color system.
 *
 * Two families drive the whole app:
 *  - "star" (warm gold) is the primary/brand color — rewards, progress, CTAs.
 *  - "night" (deep indigo) is the celestial accent — used for gradients, the
 *    star-map motif, and dark surfaces. It is NOT the default background —
 *    the base UI stays warm and bright so the app reads as inviting, not somber.
 *
 * Each ramp runs 50 (lightest) -> 900 (darkest) so components can pick the
 * right contrast step instead of hard-coding hex values.
 */

const star = {
  50: '#FFF8E1',
  100: '#FFEDB3',
  200: '#FFE082',
  300: '#FFD24D',
  400: '#FFC526',
  500: '#FFB100',
  600: '#F59A00',
  700: '#DB8200',
  800: '#B56800',
  900: '#7A4600',
} as const;

const night = {
  50: '#EEEDFB',
  100: '#D2CEF3',
  200: '#B2ABEA',
  300: '#8D82DF',
  400: '#6B5DD3',
  500: '#4C3EC4',
  600: '#3B2FA0',
  700: '#2C2378',
  800: '#1D1752',
  900: '#100D30',
} as const;

const sky = {
  50: '#E7F7FF',
  100: '#C7ECFF',
  200: '#9ADDFF',
  300: '#63C9FF',
  400: '#33B4FF',
  500: '#0D9EF5',
  600: '#0A80C7',
  700: '#08639B',
  800: '#064870',
  900: '#043354',
} as const;

const meadow = {
  50: '#EAFBF0',
  100: '#CBF4DA',
  200: '#9FE9BB',
  300: '#6DD99A',
  400: '#3FC77D',
  500: '#1FB165',
  600: '#178F51',
  700: '#146F40',
  800: '#0F5230',
  900: '#0A3820',
} as const;

const blossom = {
  50: '#FFEFF3',
  100: '#FFD6E1',
  200: '#FFB3C8',
  300: '#FF8AAB',
  400: '#FF5F8F',
  500: '#F53C74',
  600: '#D6265C',
  700: '#AD1C48',
  800: '#821436',
  900: '#570D24',
} as const;

const berry = {
  50: '#F6EEFC',
  100: '#E7D2F8',
  200: '#D2ADF2',
  300: '#B87EE9',
  400: '#9F52DE',
  500: '#8730CC',
  600: '#6E24A8',
  700: '#551B80',
  800: '#3C135A',
  900: '#250B38',
} as const;

const neutral = {
  0: '#FFFFFF',
  50: '#FFFDF9',
  100: '#FBF6EC',
  200: '#F3EBDA',
  300: '#E5DAC2',
  400: '#C9BC9E',
  500: '#A69876',
  600: '#7D7259',
  700: '#5A5240',
  800: '#3A3529',
  900: '#211E17',
  1000: '#121017',
} as const;

const semantic = {
  success: meadow[500],
  successSurface: meadow[50],
  warning: star[600],
  warningSurface: star[50],
  danger: '#E5484D',
  dangerSurface: '#FDECEC',
  info: sky[500],
  infoSurface: sky[50],
} as const;

export const palette = { star, night, sky, meadow, blossom, berry, neutral, semantic } as const;

export const gradients = {
  starBurst: [star[300], star[500], star[700]] as const,
  nightSky: [night[900], night[700], night[500]] as const,
  dawn: [blossom[300], star[300], star[500]] as const,
  meadowFresh: [meadow[300], meadow[500]] as const,
  skyClimb: [sky[200], sky[500]] as const,
  berryPop: [berry[300], berry[600]] as const,
} as const;

export type ColorScheme = 'light' | 'dark';

export const colors = {
  light: {
    // surfaces
    background: neutral[50],
    backgroundAlt: neutral[100],
    surface: neutral[0],
    surfaceRaised: neutral[0],
    surfaceSunken: neutral[200],
    border: neutral[300],
    overlay: 'rgba(23, 20, 12, 0.45)',

    // text
    textPrimary: neutral[900],
    textSecondary: neutral[600],
    textInverse: neutral[0],
    textOnBrand: night[900],

    // brand
    brand: star[500],
    brandStrong: star[700],
    brandSoft: star[100],
    accent: night[600],
    accentSoft: night[50],

    ...semantic,
  },
  dark: {
    background: night[900],
    backgroundAlt: night[800],
    surface: '#1B1730',
    surfaceRaised: '#241F3D',
    surfaceSunken: night[900],
    border: night[700],
    overlay: 'rgba(4, 3, 10, 0.6)',

    textPrimary: neutral[50],
    textSecondary: night[200],
    textInverse: neutral[900],
    textOnBrand: night[900],

    brand: star[400],
    brandStrong: star[300],
    brandSoft: 'rgba(255, 197, 38, 0.16)',
    accent: sky[400],
    accentSoft: 'rgba(13, 158, 245, 0.16)',

    success: meadow[400],
    successSurface: 'rgba(63, 199, 125, 0.16)',
    warning: star[400],
    warningSurface: 'rgba(255, 197, 38, 0.16)',
    danger: '#FF6B6F',
    dangerSurface: 'rgba(229, 72, 77, 0.18)',
    info: sky[400],
    infoSurface: 'rgba(13, 158, 245, 0.16)',
  },
} as const;

/** Widened to `string` per key so the light/dark variants (different literal hex values) unify cleanly. */
export type AppColors = { [K in keyof typeof colors.light]: string };
