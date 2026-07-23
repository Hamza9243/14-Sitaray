import * as Haptics from 'expo-haptics';
import { forwardRef, useImperativeHandle } from 'react';
import { Platform, StyleSheet, Text as RNText, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design-system/useTheme';

export interface DraggableEmojiHandle {
  /** Spring the item back to its origin and play a "wrong answer" shake. */
  rejectDrop: () => void;
  /** Pop and fade the item out in place — the "correct, absorbed into the zone" resolution. */
  resolveDrop: () => void;
}

export interface DraggableEmojiProps {
  emoji: string;
  size?: number;
  disabled?: boolean;
  onDrop: (absoluteX: number, absoluteY: number) => void;
}

/** A single draggable emoji "item" — the reusable building block for every drag-and-drop mission. */
export const DraggableEmoji = forwardRef<DraggableEmojiHandle, DraggableEmojiProps>(function DraggableEmoji(
  { emoji, size = 64, disabled, onDrop },
  ref
) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useImperativeHandle(ref, () => ({
    rejectDrop: () => {
      translateX.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
      translateY.value = withSpring(0, theme.motion.spring.gentle);
    },
    resolveDrop: () => {
      scale.value = withSequence(withTiming(1.3, { duration: 140 }), withTiming(0, { duration: 160 }));
      opacity.value = withTiming(0, { duration: 260 });
    },
  }));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      scale.value = withSpring(1.15, theme.motion.spring.pop);
      if (Platform.OS !== 'web') {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    })
    .onEnd((e) => {
      scale.value = withSpring(1, theme.motion.spring.gentle);
      runOnJS(onDrop)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.item, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface, borderRadius: size / 2 }, theme.shadow('md')]}
        />
        <RNText style={{ fontSize: size * 0.55 }}>{emoji}</RNText>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
