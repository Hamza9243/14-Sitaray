/** Playful, card-forward corner radii. `full` is for pills/circular elements. */
export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

export type RadiusKey = keyof typeof radii;
