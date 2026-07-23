import * as Haptics from 'expo-haptics';
import { type PropsWithChildren } from 'react';
import { type PressableProps, type StyleProp, type ViewStyle, Platform, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { pressScale, spring } from '@/design-system/tokens/motion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends PropsWithChildren<Omit<PressableProps, 'style'>> {
  style?: StyleProp<ViewStyle>;
  /** Scale factor while pressed in. Defaults to the shared design-system value. */
  scaleTo?: number;
  /** Fires a light haptic tick on press-in (native only, no-op on web). */
  haptics?: boolean;
  disabled?: boolean;
}

/**
 * Shared press-interaction primitive: a spring scale-down on press-in and
 * spring back on release, optionally paired with a light haptic tick. Every
 * tappable in the design system (Button, Card, StarRating…) is built on this
 * so the "alive" feel stays consistent app-wide.
 */
export function AnimatedPressable({
  style,
  scaleTo = pressScale.down,
  haptics = true,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, spring.pop);
        if (haptics && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(pressScale.up, spring.bouncy);
        onPressOut?.(event);
      }}
      style={[animatedStyle, style, disabled && { opacity: 0.5 }]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
