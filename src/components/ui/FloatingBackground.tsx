import { LinearGradient } from 'expo-linear-gradient';
import { type PropsWithChildren, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design-system/useTheme';

import { StarIcon } from './StarIcon';

export type FloatingBackgroundVariant = 'day' | 'night';
export type FloatingBackgroundDensity = 'low' | 'medium' | 'high';

export interface FloatingBackgroundProps extends PropsWithChildren {
  variant?: FloatingBackgroundVariant;
  density?: FloatingBackgroundDensity;
  style?: object;
}

const densityCount: Record<FloatingBackgroundDensity, number> = { low: 4, medium: 7, high: 11 };

/**
 * Full-bleed decorative backdrop: a soft gradient wash plus slowly drifting,
 * twinkling stars. Meant to sit behind screen content (home, celebrations,
 * onboarding) — not a component you tap or read, purely atmosphere.
 */
export function FloatingBackground({ variant = 'day', density = 'medium', style, children }: FloatingBackgroundProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const count = densityCount[density];

  const seeds = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => {
        // Deterministic pseudo-random spread so it doesn't reshuffle on every render.
        const seed = (index + 1) * 137.5;
        return {
          left: ((seed * 7) % 100),
          top: ((seed * 13) % 100),
          size: 10 + ((seed * 3) % 18),
          delay: (index * 240) % 2000,
          duration: 2600 + ((index * 431) % 1800),
        };
      }),
    [count]
  );

  const gradient = variant === 'night' ? theme.gradients.nightSky : theme.gradients.dawn;

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {seeds.map((seed, index) => (
        <FloatingStar
          key={index}
          left={(seed.left / 100) * width}
          top={(seed.top / 100) * height}
          size={seed.size}
          delay={seed.delay}
          duration={seed.duration}
          tone={variant}
        />
      ))}

      {children}
    </View>
  );
}

function FloatingStar({
  left,
  top,
  size,
  delay,
  duration,
  tone,
}: {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  tone: FloatingBackgroundVariant;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(tone === 'night' ? 0.4 : 0.5);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-14, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(tone === 'night' ? 1 : 0.9, { duration: duration * 0.8 }),
          withTiming(tone === 'night' ? 0.35 : 0.45, { duration: duration * 0.8 })
        ),
        -1,
        true
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, duration, tone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top }, animatedStyle]} pointerEvents="none">
      <StarIcon size={size} fill={1} />
    </Animated.View>
  );
}
