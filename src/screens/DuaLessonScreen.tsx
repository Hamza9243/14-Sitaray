import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { DuaAudioPlayer } from '@/components/duaLesson/DuaAudioPlayer';
import { MeaningCard } from '@/components/duaLesson/MeaningCard';
import { MeaningMatchChallenge } from '@/components/duaLesson/MeaningMatchChallenge';
import { MissingWordChallenge } from '@/components/duaLesson/MissingWordChallenge';
import { RepeatPrompt } from '@/components/duaLesson/RepeatPrompt';
import { SyncedTextHighlight } from '@/components/duaLesson/SyncedTextHighlight';
import { WordOrderChallenge } from '@/components/duaLesson/WordOrderChallenge';
import { AppBar } from '@/components/ui/AppBar';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { DUAS } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { getNewlyUnlockedStars, useAppStore } from '@/hooks/useAppStore';
import type { StarDefinition } from '@/types/content';

type StepKind = 'listen' | 'repeat' | 'meaning' | 'wordOrder' | 'missingWord' | 'meaningMatch' | 'reward';

const STEP_LABELS: Record<StepKind, string> = {
  listen: 'Listen',
  repeat: 'Your Turn',
  meaning: 'What It Means',
  wordOrder: 'Put It In Order',
  missingWord: 'Missing Word',
  meaningMatch: 'Match The Meaning',
  reward: 'Complete',
};

function pickDistractorWords(excludeId: string, count: number): string[] {
  const pool = DUAS.filter((d) => d.id !== excludeId)
    .flatMap((d) => d.arabic.split(' '))
    .filter((w) => w.length > 1);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickDistractorEmojis(excludeId: string): string[] {
  return DUAS.filter((d) => d.id !== excludeId).flatMap((d) => d.conceptEmojis);
}

export function DuaLessonScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { duaId } = useLocalSearchParams<{ duaId: string }>();
  const completeDua = useAppStore((s) => s.completeDua);

  const dua = DUAS.find((d) => d.id === duaId);

  const [step, setStep] = useState<StepKind>('listen');
  const [repeatIndex, setRepeatIndex] = useState(0);
  const [reward, setReward] = useState<{ xp: number; stars: StarDefinition[] } | null>(null);

  const words = useMemo(() => dua?.arabic.split(' ') ?? [], [dua]);
  const blankIndex = useMemo(() => Math.min(Math.floor(words.length / 2), words.length - 1), [words]);
  const missingWordOptions = useMemo(() => {
    if (!dua) return [];
    const correct = words[blankIndex];
    const distractors = pickDistractorWords(dua.id, 2).filter((w) => w !== correct);
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dua, blankIndex]);

  if (!dua) return null;

  const stepOrder: StepKind[] = ['listen', ...dua.repeatSegments.map(() => 'repeat' as const), 'meaning', 'wordOrder', 'missingWord', 'meaningMatch'];
  const currentStepPosition = step === 'repeat' ? stepOrder.indexOf('repeat') + repeatIndex : stepOrder.indexOf(step);

  function goToNextAfterRepeat() {
    if (repeatIndex + 1 < dua!.repeatSegments.length) {
      setRepeatIndex((i) => i + 1);
    } else {
      setStep('meaning');
    }
  }

  function handleFinish() {
    const previousXp = useAppStore.getState().xp;
    const { xpGained } = completeDua(dua!.id);
    const newXp = useAppStore.getState().xp;
    setReward({ xp: xpGained, stars: getNewlyUnlockedStars(previousXp, newXp) });
    setStep('reward');
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />

      <AppBar title={dua.title} onBack={() => router.back()} />

      {step !== 'reward' && (
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <ProgressBar progress={currentStepPosition / stepOrder.length} label={STEP_LABELS[step]} />
        </View>
      )}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
        {step === 'listen' && (
          <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
            <Text variant="bodyLarge" color="textSecondary" style={{ textAlign: 'center' }}>
              Listen carefully
            </Text>
            {dua.audioUrl ? (
              <>
                <ArabicText size={30} weight="semiBold" style={{ textAlign: 'center' }}>
                  {dua.arabic}
                </ArabicText>
                <DuaAudioPlayer audioUrl={dua.audioUrl} reciterName={dua.reciterName} />
              </>
            ) : (
              // No real reciter recording yet — falls back to the device's built-in
              // voice (free, on-device) instead of showing nothing at all.
              <SyncedTextHighlight text={dua.arabic} script="arabic" />
            )}
            <Text variant="bodySmall" color="textSecondary" style={{ fontStyle: 'italic', textAlign: 'center' }}>
              {dua.transliteration}
            </Text>
            <ContinueRow onPress={() => setStep('repeat')} />
          </View>
        )}

        {step === 'repeat' && (
          <RepeatPrompt
            phrase={dua.arabicSegments[repeatIndex]}
            transliteration={dua.repeatSegments[repeatIndex]}
            onDone={goToNextAfterRepeat}
          />
        )}

        {step === 'meaning' && (
          <View style={{ alignItems: 'center', gap: theme.spacing.xl }}>
            <MeaningCard emoji={dua.meaningEmoji} explainer={dua.meaningExplainer} />
            <ContinueRow onPress={() => setStep('wordOrder')} />
          </View>
        )}

        {step === 'wordOrder' && <WordOrderChallenge words={words} onComplete={() => setStep('missingWord')} />}

        {step === 'missingWord' && (
          <MissingWordChallenge
            words={words}
            blankIndex={blankIndex}
            options={missingWordOptions}
            onComplete={() => setStep('meaningMatch')}
          />
        )}

        {step === 'meaningMatch' && (
          <MeaningMatchChallenge
            pairs={dua.conceptEmojis.map((emoji, i) => ({ emoji, label: dua.conceptLabels[i] }))}
            distractorEmojis={pickDistractorEmojis(dua.id)}
            onComplete={handleFinish}
          />
        )}
      </View>

      <RewardDialog
        visible={step === 'reward' && reward !== null}
        onRequestClose={() => router.back()}
        title="Dua Learned!"
        message={`Great job learning "${dua.title}"!`}
        xpGained={reward?.xp}
        newlyUnlockedStars={reward?.stars}
        actionLabel="Continue"
      />
    </View>
  );
}

function ContinueRow({ onPress }: { onPress: () => void }) {
  return <Button label="Continue" size="lg" onPress={onPress} />;
}
