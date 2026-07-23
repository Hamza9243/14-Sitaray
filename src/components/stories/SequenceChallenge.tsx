import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface SequenceChallengeProps {
  /** Story beats in correct chronological order — shuffled internally. */
  events: string[];
  onComplete: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.length > 1 && copy.every((item, index) => item === items[index])) {
    return shuffle(items);
  }
  return copy;
}

/** Tap the story's events in the correct order to rebuild the timeline. */
export function SequenceChallenge({ events, onComplete }: SequenceChallengeProps) {
  const { theme } = useTheme();
  const shuffled = useMemo(() => shuffle(events), [events]);
  const [placedCount, setPlacedCount] = useState(0);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState<number | null>(null);

  function handleTap(event: string, shuffledIndex: number) {
    if (usedIndices.includes(shuffledIndex)) return;

    if (event === events[placedCount]) {
      setUsedIndices((prev) => [...prev, shuffledIndex]);
      const next = placedCount + 1;
      setPlacedCount(next);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= events.length) {
        setTimeout(onComplete, 650);
      }
    } else {
      setShakeKey(shuffledIndex);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  return (
    <View style={{ gap: theme.spacing.lg, width: '100%' }}>
      <Text variant="label" color="brandStrong" style={{ textAlign: 'center' }}>
        ARRANGE THE STORY IN ORDER
      </Text>

      <View style={{ gap: theme.spacing.xs }}>
        {events.map((event, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              minHeight: 44,
              borderBottomWidth: 2,
              borderBottomColor: index < placedCount ? theme.colors.brand : theme.colors.border,
              paddingVertical: 6,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: theme.radii.full,
                backgroundColor: index < placedCount ? theme.colors.brand : theme.colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" style={{ color: index < placedCount ? theme.colors.textOnBrand : theme.colors.textSecondary }}>
                {index + 1}
              </Text>
            </View>
            <Text variant="bodySmall" color={index < placedCount ? 'textPrimary' : 'textSecondary'} style={{ flex: 1 }}>
              {index < placedCount ? event : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {shuffled.map((event, index) => (
          <EventChip
            key={`${event}-${index}`}
            event={event}
            used={usedIndices.includes(index)}
            shake={shakeKey === index}
            onShakeEnd={() => setShakeKey(null)}
            onPress={() => handleTap(event, index)}
          />
        ))}
      </View>
    </View>
  );
}

function EventChip({
  event,
  used,
  shake,
  onShakeEnd,
  onPress,
}: {
  event: string;
  used: boolean;
  shake: boolean;
  onShakeEnd: () => void;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!shake) return undefined;
    translateX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
    const timer = setTimeout(onShakeEnd, 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  if (used) return null;

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.97}>
      <Animated.View
        style={[
          animatedStyle,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.border,
            ...theme.shadow('sm'),
          },
        ]}
      >
        <Text variant="body">{event}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}
