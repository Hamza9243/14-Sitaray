import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/design-system/useTheme';

import { Text } from './Text';

export interface ProgressBarProps {
  /** 0-1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  showPercentage?: boolean;
}

/** Rounded, animated linear progress track — lesson completion, download progress, etc. */
export function ProgressBar({ progress, height = 14, color, trackColor, label, showPercentage }: ProgressBarProps) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, theme.motion.timing.slow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const fillColor = color ?? theme.colors.brand;
  const track = trackColor ?? theme.colors.surfaceSunken;

  return (
    <View>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text variant="label" color="textSecondary">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showPercentage && (
            <Text variant="label" color="textSecondary">
              {Math.round(clamped * 100)}%
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2, backgroundColor: track },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            { borderRadius: height / 2, backgroundColor: fillColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
