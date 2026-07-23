import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { StarIcon } from '@/components/ui/StarIcon';
import { useTheme } from '@/design-system/useTheme';

const PARTICLE_COUNT = 10;

/**
 * A one-shot burst of stars flying outward from the center and fading —
 * the reward moment behind every celebration Dialog (star unlock, dua
 * completed, quiz correct, streak milestone). Remount with a changing
 * `burstKey` to replay it.
 */
export function CelebrationBurst({ burstKey }: { burstKey: string | number }) {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
        <Particle key={`${burstKey}-${index}`} index={index} />
      ))}
    </View>
  );
}

function Particle({ index }: { index: number }) {
  const { theme } = useTheme();
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
  const distance = 70 + ((index * 37) % 40);
  const size = 12 + ((index * 13) % 12);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      (index % PARTICLE_COUNT) * 25,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: 1 - progress.value * 0.4 },
    ],
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <StarIcon size={size} fill={1} outlineColor={theme.palette.star[600]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
