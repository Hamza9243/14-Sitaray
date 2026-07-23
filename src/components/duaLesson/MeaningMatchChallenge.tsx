import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

import { ChoiceCard } from '../games/ChoiceCard';

export interface ConceptPair {
  emoji: string;
  label: string;
}

export interface MeaningMatchChallengeProps {
  pairs: ConceptPair[];
  /** Extra emoji pulled from other duas, mixed in as wrong options. */
  distractorEmojis: string[];
  onComplete: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Round through each concept in the dua's meaning, tapping the picture that matches the shown word. */
export function MeaningMatchChallenge({ pairs, distractorEmojis, onComplete }: MeaningMatchChallengeProps) {
  const { theme } = useTheme();
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongEmoji, setWrongEmoji] = useState<string | null>(null);
  const [correctPicked, setCorrectPicked] = useState(false);

  const current = pairs[roundIndex];

  const options = useMemo(() => {
    if (!current) return [];
    const others = distractorEmojis.filter((e) => e !== current.emoji);
    const picks = shuffle(others).slice(0, 2);
    return shuffle([current.emoji, ...picks]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  if (!current) return null;

  function handleChoose(emoji: string) {
    if (correctPicked) return;
    if (emoji === current.emoji) {
      setCorrectPicked(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        if (roundIndex + 1 >= pairs.length) {
          onComplete();
        } else {
          setRoundIndex((i) => i + 1);
          setCorrectPicked(false);
        }
      }, 550);
    } else {
      setWrongEmoji(emoji);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => setWrongEmoji(null), 500);
    }
  }

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xl }}>
      <Text variant="label" color="textSecondary">
        {`${roundIndex + 1} of ${pairs.length}`}
      </Text>
      <Text variant="h2" style={{ textAlign: 'center' }}>
        {current.label}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {options.map((emoji) => (
          <ChoiceCard
            key={emoji}
            emoji={emoji}
            status={correctPicked && emoji === current.emoji ? 'correct' : wrongEmoji === emoji ? 'wrong' : 'idle'}
            disabled={correctPicked}
            onPress={() => handleChoose(emoji)}
          />
        ))}
      </View>
    </View>
  );
}
