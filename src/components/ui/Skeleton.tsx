import { useEffect } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/design-system/useTheme';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A shimmering placeholder block for loading states — shown in place of cards before content is ready. */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 650, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: theme.colors.surfaceSunken,
        },
        style,
      ]}
    />
  );
}

/** A full story-card-shaped skeleton — used while stories/progress are hydrating from storage. */
export function StoryCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: theme.spacing.sm },
      ]}
    >
      <Skeleton height={140} radius={theme.radii.md} />
      <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.xs }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={8} style={{ marginTop: theme.spacing.xs }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
