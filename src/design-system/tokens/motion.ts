import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Timing durations in ms. */
export const duration = {
  instant: 100,
  fast: 160,
  base: 240,
  slow: 380,
  celebration: 650,
} as const;

export const easing = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const timing = {
  fast: { duration: duration.fast, easing: easing.standard } satisfies WithTimingConfig,
  base: { duration: duration.base, easing: easing.standard } satisfies WithTimingConfig,
  slow: { duration: duration.slow, easing: easing.decelerate } satisfies WithTimingConfig,
} as const;

/** Spring configs — `bouncy`/`pop` are the app's signature "alive" feel. */
export const spring = {
  gentle: { damping: 18, stiffness: 180, mass: 0.9 } satisfies WithSpringConfig,
  bouncy: { damping: 10, stiffness: 180, mass: 0.8 } satisfies WithSpringConfig,
  pop: { damping: 8, stiffness: 260, mass: 0.6 } satisfies WithSpringConfig,
} as const;

/** Shared press-interaction scale used by Button/Card/StarRating etc. */
export const pressScale = {
  down: 0.94,
  up: 1,
} as const;
