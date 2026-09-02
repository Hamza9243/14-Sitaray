import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import splashIconUri from '@/assets/images/splash-icon.png';
import { StarIcon } from '@/components/ui/StarIcon';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

const STAR_COUNT = 14;
const STAGGER_MS = 110;
const SEQUENCE_DURATION_MS = STAR_COUNT * STAGGER_MS + 500;
const FADE_OUT_MS = 450;

/**
 * The approved splash artwork (assets/images/splash-icon.png) is shown exactly
 * as provided — unmodified, uncropped focus, `cover` scaling. The only motion
 * layered on top is a row of 14 stars lighting up in sequence at the bottom,
 * matching the app's "14 Stars" progression identity. This overlay hands off
 * from the native splash screen (same image, so the swap is invisible) and
 * only fades away once both the loading sequence has played and the app's
 * persisted state has finished hydrating.
 */
export function AnimatedSplashOverlay() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  const [started, setStarted] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!started) return undefined;
    const timer = setTimeout(() => setSequenceDone(true), SEQUENCE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [started]);

  useEffect(() => {
    if (!(started && sequenceDone && hasHydrated)) return undefined;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(() => setVisible(false), FADE_OUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, sequenceDone, hasHydrated]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, animatedStyle]}
      onLayout={started ? undefined : () => setStarted(true)}
    >
      <Image source={{ uri: splashIconUri }} style={StyleSheet.absoluteFill} contentFit="cover" />

      <View
        style={[
          styles.starRow,
          { bottom: insets.bottom + theme.spacing.xxl, gap: theme.spacing.xxs },
        ]}
      >
        {started && Array.from({ length: STAR_COUNT }).map((_, index) => <LoadingStar key={index} index={index} />)}
      </View>
    </Animated.View>
  );
}

function LoadingStar({ index }: { index: number }) {
  const [lit, setLit] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLit(true);
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 9, stiffness: 180 }),
        withRepeat(withSequence(withTiming(1.12, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true)
      );
    }, index * STAGGER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <StarIcon size={15} fill={lit ? 1 : 0} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0B0E2E',
    zIndex: 1000,
  },
  starRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
