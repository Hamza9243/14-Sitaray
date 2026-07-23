import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/design-system/useTheme';

import { StarIcon } from './StarIcon';

export interface StarRatingProps {
  /** Number of filled stars, e.g. 3.5. */
  value: number;
  max?: number;
  size?: number;
  /** When provided, stars become tappable and call back with the tapped star's value (1-based). */
  onChange?: (value: number) => void;
  accessibilityLabel?: string;
}

/** A row of the brand star mark — lesson ratings, difficulty, or "stars earned" summaries. */
export function StarRating({ value, max = 5, size = 28, onChange, accessibilityLabel }: StarRatingProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.18, theme.motion.spring.pop), withSpring(1, theme.motion.spring.bouncy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[{ flexDirection: 'row', gap: theme.spacing.xxs }, animatedStyle]}
      accessibilityRole={onChange ? undefined : 'text'}
      accessibilityLabel={accessibilityLabel ?? `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));
        const star = <StarIcon key={index} size={size} fill={fill} />;

        if (!onChange) return star;

        return (
          <Pressable
            key={index}
            onPress={() => onChange(index + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${index + 1} out of ${max}`}
            hitSlop={6}
          >
            {star}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
