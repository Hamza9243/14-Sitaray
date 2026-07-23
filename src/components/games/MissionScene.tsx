import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface MissionSceneProps {
  missionNumber: number;
  totalMissions: number;
  starsEarned: number;
  characterEmoji: string;
  prompt: string;
  onExit: () => void;
  children: ReactNode;
}

/** Shared full-screen shell for every Kindness Missions stage: background, HUD, character, prompt. */
export function MissionScene({
  missionNumber,
  totalMissions,
  starsEarned,
  characterEmoji,
  prompt,
  onExit,
  children,
}: MissionSceneProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(withSequence(withTiming(-10, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
  }, [bounce]);

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />

      <View style={{ paddingTop: insets.top + theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <AnimatedPressable
            onPress={onExit}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel="Exit game"
            style={{
              width: 32,
              height: 32,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadow('sm'),
            }}
          >
            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
          </AnimatedPressable>
          <Text variant="label" color="textSecondary">
            {`MISSION ${missionNumber} OF ${totalMissions}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Emoji size={16}>⭐</Emoji>
            <Text variant="label" color="brandStrong">
              {starsEarned}
            </Text>
          </View>
        </View>
        <ProgressBar progress={(missionNumber - 1) / totalMissions} height={10} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, padding: theme.spacing.lg }}>
        <Animated.View style={bounceStyle}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadow('md'),
            }}
          >
            <Emoji size={52}>{characterEmoji}</Emoji>
          </View>
        </Animated.View>

        <Text variant="h3" style={{ textAlign: 'center' }}>
          {prompt}
        </Text>

        {children}
      </View>
    </View>
  );
}
