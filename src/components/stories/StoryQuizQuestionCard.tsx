import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface StoryQuizQuestionCardProps {
  question: string;
  emoji?: string;
  options: string[];
  correctIndex: number;
  /** Fired once, on the very first answer attempt (right or wrong) — used for scoring. */
  onAnswered: (correct: boolean) => void;
  /** Fired once the correct answer has been found — used to advance to the next step. */
  onAdvance: () => void;
}

/** A single tap-to-answer question card — reused for both the quick quiz and the "choose the moral" beat. */
export function StoryQuizQuestionCard({ question, emoji, options, correctIndex, onAnswered, onAdvance }: StoryQuizQuestionCardProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [hasScored, setHasScored] = useState(false);

  function handleSelect(index: number) {
    if (status === 'correct') return;
    setSelected(index);
    const correct = index === correctIndex;

    if (!hasScored) {
      setHasScored(true);
      onAnswered(correct);
    }

    if (correct) {
      setStatus('correct');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onAdvance, 900);
    } else {
      setStatus('wrong');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => {
        setStatus('idle');
        setSelected(null);
      }, 550);
    }
  }

  return (
    <View style={{ width: '100%', gap: theme.spacing.md }}>
      {emoji ? (
        <View style={{ alignItems: 'center' }}>
          <Emoji size={64}>{emoji}</Emoji>
        </View>
      ) : null}

      <Text variant="h3" style={{ textAlign: 'center' }}>
        {question}
      </Text>

      <View style={{ gap: theme.spacing.sm }}>
        {options.map((option, index) => {
          const isSelected = selected === index;
          const showCorrect = status === 'correct' && isSelected;
          const showWrong = status === 'wrong' && isSelected;

          return (
            <AnimatedPressable
              key={option}
              onPress={() => handleSelect(index)}
              disabled={status === 'correct'}
              style={{
                borderRadius: theme.radii.md,
                borderWidth: 2,
                borderColor: showCorrect ? theme.colors.success : showWrong ? theme.colors.danger : theme.colors.border,
                backgroundColor: showCorrect ? theme.colors.successSurface : showWrong ? theme.colors.dangerSurface : theme.colors.surface,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="body" style={{ flex: 1 }}>
                {option}
              </Text>
              {showCorrect && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
              {showWrong && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
            </AnimatedPressable>
          );
        })}
      </View>

      {status === 'wrong' && (
        <Text variant="bodySmall" color="danger" style={{ textAlign: 'center' }}>
          Not quite — try again!
        </Text>
      )}
    </View>
  );
}
