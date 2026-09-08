import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { CharacterDefinition } from '@/data/characters';
import { useTheme } from '@/design-system/useTheme';

import { Emoji } from './Emoji';

export interface CharacterAvatarProps {
  character: CharacterDefinition;
  size?: number;
  /** Soft glowing ripple rings, used while the call is "ringing". */
  ringing?: boolean;
}

/**
 * The character portrait for the incoming-call screen — a gradient circle with the
 * character's emoji, optionally pulsing with ripple rings while ringing. Uses the same
 * flat `useSharedValue` + `withRepeat(withSequence(...))` pattern as FloatingBackground's
 * stars (proven safe under react-native-reanimated's web driver) rather than the
 * `entering`/`exiting` layout-animation API, which has repeatedly gotten stuck invisible
 * on web in this app (see Dialog.tsx and StoryReaderScreen's IntroStep fixes).
 */
export function CharacterAvatar({ character, size = 140, ringing = false }: CharacterAvatarProps) {
  const { theme } = useTheme();

  return (
    <View style={{ width: size * 1.8, height: size * 1.8, alignItems: 'center', justifyContent: 'center' }}>
      {ringing && <RippleRing size={size} delay={0} />}
      {ringing && <RippleRing size={size} delay={700} />}

      <LinearGradient
        colors={character.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          theme.shadow('lg'),
        ]}
      >
        <Emoji size={size * 0.5}>{character.emoji}</Emoji>
      </LinearGradient>
    </View>
  );
}

function RippleRing({ size, delay }: { size: number; delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 0 }), withTiming(1.7, { duration: 1800, easing: Easing.out(Easing.ease) })),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0.5, { duration: 0 }), withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) })),
        -1,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}
      pointerEvents="none"
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: '#FFFFFF',
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
