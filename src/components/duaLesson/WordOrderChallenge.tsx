import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ArabicText } from '@/components/ui/ArabicText';
import { useTheme } from '@/design-system/useTheme';

export interface WordOrderChallengeProps {
  words: string[];
  onComplete: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // Guarantee the shuffle actually changes order when there's more than one word.
  if (copy.length > 1 && copy.every((word, index) => word === items[index])) {
    return shuffle(items);
  }
  return copy;
}

/** Tap the words in the correct order to rebuild the phrase. */
export function WordOrderChallenge({ words, onComplete }: WordOrderChallengeProps) {
  const { theme } = useTheme();
  const shuffled = useMemo(() => shuffle(words), [words]);
  const [placedCount, setPlacedCount] = useState(0);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState<number | null>(null);

  function handleTap(word: string, shuffledIndex: number) {
    if (usedIndices.includes(shuffledIndex)) return;

    if (word === words[placedCount]) {
      setUsedIndices((prev) => [...prev, shuffledIndex]);
      const next = placedCount + 1;
      setPlacedCount(next);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next >= words.length) {
        setTimeout(onComplete, 550);
      }
    } else {
      setShakeKey(shuffledIndex);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  return (
    <View style={{ gap: theme.spacing.xl, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {words.map((word, index) => (
          <View
            key={index}
            style={{
              minWidth: 56,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderBottomWidth: 2,
              borderBottomColor: index < placedCount ? theme.colors.brand : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <ArabicText size={22} color={index < placedCount ? 'brandStrong' : 'textSecondary'}>
              {index < placedCount ? words[index] : ' '}
            </ArabicText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
        {shuffled.map((word, index) => (
          <WordChip
            key={`${word}-${index}`}
            word={word}
            used={usedIndices.includes(index)}
            shake={shakeKey === index}
            onShakeEnd={() => setShakeKey(null)}
            onPress={() => handleTap(word, index)}
          />
        ))}
      </View>
    </View>
  );
}

function WordChip({
  word,
  used,
  shake,
  onShakeEnd,
  onPress,
}: {
  word: string;
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
    <AnimatedPressable onPress={onPress} scaleTo={0.92}>
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
        <ArabicText size={22}>{word}</ArabicText>
      </Animated.View>
    </AnimatedPressable>
  );
}
