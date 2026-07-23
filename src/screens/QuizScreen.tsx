import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { QUIZ_QUESTIONS } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { getNewlyUnlockedStars, useAppStore } from '@/hooks/useAppStore';
import type { StarDefinition } from '@/types/content';

export function QuizScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const answerQuizCorrect = useAppStore((s) => s.answerQuizCorrect);
  const completedQuizIds = useAppStore((s) => s.completedQuizIds);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [status, setStatus] = useState<'unanswered' | 'correct' | 'wrong'>('unanswered');
  const [reward, setReward] = useState<{ explanation: string; xp: number; stars: StarDefinition[] } | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  const question = QUIZ_QUESTIONS[currentIndex];
  const finished = currentIndex >= QUIZ_QUESTIONS.length;

  function handleSelect(optionIndex: number) {
    if (status === 'correct') return;
    setSelectedOption(optionIndex);

    if (optionIndex === question.correctIndex) {
      setStatus('correct');
      setSessionCorrect((count) => count + 1);
      const previousXp = useAppStore.getState().xp;
      const { xpGained } = answerQuizCorrect(question.id);
      const newXp = useAppStore.getState().xp;
      setReward({ explanation: question.explanation, xp: xpGained, stars: getNewlyUnlockedStars(previousXp, newXp) });
    } else {
      setStatus('wrong');
    }
  }

  function goToNext() {
    setReward(null);
    setSelectedOption(null);
    setStatus('unanswered');
    setCurrentIndex((index) => index + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Quiz Time" onBack={() => router.back()} />

      <View style={{ padding: theme.spacing.md, gap: theme.spacing.lg, flex: 1 }}>
        {!finished && (
          <ProgressBar progress={currentIndex / QUIZ_QUESTIONS.length} label={`Question ${currentIndex + 1} of ${QUIZ_QUESTIONS.length}`} />
        )}

        {finished ? (
          <Card variant="raised" style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
            <Ionicons name="trophy" size={56} color={theme.palette.star[500]} />
            <Text variant="h2" style={{ marginTop: theme.spacing.sm }}>
              Quiz Complete!
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              {`You answered ${sessionCorrect} out of ${QUIZ_QUESTIONS.length} correctly. Total answered so far: ${completedQuizIds.length}/${QUIZ_QUESTIONS.length}.`}
            </Text>
            <Button
              label="Back to Learn"
              onPress={() => router.back()}
              fullWidth
              style={{ marginTop: theme.spacing.lg }}
            />
          </Card>
        ) : (
          <Card variant="raised">
            <Text variant="title">{question.question}</Text>
            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              {question.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = index === question.correctIndex;
                const showCorrect = status !== 'unanswered' && isCorrectOption;
                const showWrong = status === 'wrong' && isSelected && !isCorrectOption;

                return (
                  <AnimatedPressable
                    key={option}
                    onPress={() => handleSelect(index)}
                    disabled={status === 'correct'}
                    style={{
                      borderRadius: theme.radii.md,
                      borderWidth: 2,
                      borderColor: showCorrect
                        ? theme.colors.success
                        : showWrong
                          ? theme.colors.danger
                          : theme.colors.border,
                      backgroundColor: showCorrect
                        ? theme.colors.successSurface
                        : showWrong
                          ? theme.colors.dangerSurface
                          : theme.colors.surface,
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="body">{option}</Text>
                    {showCorrect && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
                    {showWrong && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
                  </AnimatedPressable>
                );
              })}
            </View>

            {status === 'wrong' && (
              <Text variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.sm }}>
                Not quite — give it another try!
              </Text>
            )}
          </Card>
        )}
      </View>

      <RewardDialog
        visible={reward !== null}
        onRequestClose={goToNext}
        title="Great Job!"
        message={reward?.explanation ?? ''}
        xpGained={reward?.xp}
        newlyUnlockedStars={reward?.stars}
        actionLabel={currentIndex + 1 >= QUIZ_QUESTIONS.length ? 'See Results' : 'Next Question'}
      />
    </View>
  );
}
