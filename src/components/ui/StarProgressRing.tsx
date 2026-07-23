import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/design-system/useTheme';

import { StarIcon } from './StarIcon';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StarProgressRingProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  /** Small caption under the count, e.g. "this week". */
  caption?: string;
}

/** Big circular "stars earned toward a goal" widget — the hero stat on the home/star-map screen. */
export function StarProgressRing({ current, total, size = 148, strokeWidth = 12, caption }: StarProgressRingProps) {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, theme.motion.timing.slow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.palette.star[300]} />
            <Stop offset="100%" stopColor={theme.palette.star[600]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceSunken}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringFill)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>

      <StarIcon size={size * 0.28} fill={1} />
      <Text variant="h3" style={{ marginTop: 4 }}>
        {current}
        <Text variant="bodySmall" color="textSecondary">
          {` / ${total}`}
        </Text>
      </Text>
      {caption ? (
        <Text variant="caption" color="textSecondary">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
