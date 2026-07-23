import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

import { RewardDialog } from '@/components/RewardDialog';
import { SequenceChallenge } from '@/components/stories/SequenceChallenge';
import { StoryPageView } from '@/components/stories/StoryPageView';
import { StoryQuizQuestionCard } from '@/components/stories/StoryQuizQuestionCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { CardBadge } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { STORIES } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { getNewlyUnlockedStars, getStoryProgress, useAppStore } from '@/hooks/useAppStore';
import type { StarDefinition } from '@/types/content';

type ReaderStep = 'intro' | 'reading' | 'quiz' | 'sequence' | 'moral' | 'reward';
type NarrationMode = 'listen' | 'readMyself';

const RATES = [0.75, 1, 1.25] as const;

export function StoryReaderScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { storyId } = useLocalSearchParams<{ storyId: string }>();

  const storyProgress = useAppStore((s) => s.storyProgress);
  const updateStoryPage = useAppStore((s) => s.updateStoryPage);
  const recordStoryQuiz = useAppStore((s) => s.recordStoryQuiz);
  const recordStorySequence = useAppStore((s) => s.recordStorySequence);
  const recordStoryMoral = useAppStore((s) => s.recordStoryMoral);
  const completeStory = useAppStore((s) => s.completeStory);

  const story = STORIES.find((s) => s.id === storyId);
  const progress = story ? getStoryProgress(storyProgress, story.id) : null;

  const [step, setStep] = useState<ReaderStep>('intro');
  const [mode, setMode] = useState<NarrationMode>('listen');
  const [rateIndex, setRateIndex] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [reward, setReward] = useState<{ xp: number; stars: StarDefinition[] } | null>(null);

  useEffect(() => {
    if (!story || step !== 'reading') return;
    updateStoryPage(story.id, pageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pageIndex, story?.id]);

  if (!story || !progress) return null;

  const alreadyCompleted = progress.completedAt !== null;
  const resuming = !alreadyCompleted && progress.lastPageIndex > 0;
  const startIndex = alreadyCompleted ? 0 : Math.min(progress.lastPageIndex, story.pages.length - 1);
  const rate = RATES[rateIndex];

  function beginReading() {
    setPageIndex(startIndex);
    setStep('reading');
  }

  function goToNextPage() {
    if (pageIndex + 1 < story!.pages.length) {
      setPageIndex((i) => i + 1);
    } else {
      setStep('quiz');
      setQuizIndex(0);
      setQuizCorrect(0);
    }
  }

  function goToPrevPage() {
    if (pageIndex > 0) setPageIndex((i) => i - 1);
  }

  function handleQuizAnswered(correct: boolean) {
    if (correct) setQuizCorrect((c) => c + 1);
  }

  function handleQuizAdvance() {
    if (quizIndex + 1 < story!.quiz.length) {
      setQuizIndex((i) => i + 1);
    } else {
      recordStoryQuiz(story!.id, quizCorrect);
      setStep('sequence');
    }
  }

  function handleSequenceComplete() {
    recordStorySequence(story!.id);
    setStep('moral');
  }

  function handleMoralAdvance() {
    recordStoryMoral(story!.id);
    const previousXp = useAppStore.getState().xp;
    const { xpGained } = completeStory(story!.id);
    const newXp = useAppStore.getState().xp;
    setReward({ xp: xpGained, stars: getNewlyUnlockedStars(previousXp, newXp) });
    setStep('reward');
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {step === 'intro' && (
        <IntroStep
          story={story}
          resuming={resuming}
          alreadyCompleted={alreadyCompleted}
          mode={mode}
          onSetMode={setMode}
          onBack={() => router.back()}
          onStart={beginReading}
        />
      )}

      {step === 'reading' && (
        <View style={{ flex: 1 }}>
          <AppBar
            title={story.title}
            onBack={() => router.back()}
            actions={[
              {
                icon: mode === 'listen' ? 'headset' : 'book-outline',
                onPress: () => setMode((m) => (m === 'listen' ? 'readMyself' : 'listen')),
                accessibilityLabel: mode === 'listen' ? 'Switch to Read Myself' : 'Switch to Listen mode',
              },
              {
                icon: 'speedometer-outline',
                onPress: () => setRateIndex((i) => (i + 1) % RATES.length),
                accessibilityLabel: `Narration speed ${rate}x`,
              },
            ]}
          />
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <ProgressBar progress={(pageIndex + 1) / story.pages.length} label={`Page ${pageIndex + 1} of ${story.pages.length}`} />
          </View>

          <Animated.View key={pageIndex} entering={SlideInRight.duration(280)} exiting={SlideOutLeft.duration(200)} style={{ flex: 1 }}>
            <StoryPageView
              page={story.pages[pageIndex]}
              pageIndex={pageIndex}
              totalPages={story.pages.length}
              mode={mode}
              rate={rate}
              onNarrationDone={() => {}}
            />
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md }}>
            {pageIndex > 0 && <Button label="Back" variant="outline" onPress={goToPrevPage} style={{ flex: 1 }} />}
            <Button
              label={pageIndex + 1 < story.pages.length ? 'Next' : 'Continue'}
              onPress={goToNextPage}
              style={{ flex: pageIndex > 0 ? 1 : undefined, width: pageIndex > 0 ? undefined : '100%' }}
            />
          </View>
        </View>
      )}

      {step === 'quiz' && (
        <View style={{ flex: 1 }}>
          <AppBar title="Quick Quiz" onBack={() => router.back()} />
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <ProgressBar progress={quizIndex / story.quiz.length} label={`Question ${quizIndex + 1} of ${story.quiz.length}`} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
            <StoryQuizQuestionCard
              key={quizIndex}
              question={story.quiz[quizIndex].question}
              emoji={story.quiz[quizIndex].emoji}
              options={story.quiz[quizIndex].options}
              correctIndex={story.quiz[quizIndex].correctIndex}
              onAnswered={handleQuizAnswered}
              onAdvance={handleQuizAdvance}
            />
          </View>
        </View>
      )}

      {step === 'sequence' && (
        <View style={{ flex: 1 }}>
          <AppBar title="Arrange In Order" onBack={() => router.back()} />
          <View style={{ flex: 1, padding: theme.spacing.lg, justifyContent: 'center' }}>
            <SequenceChallenge events={story.sequenceEvents} onComplete={handleSequenceComplete} />
          </View>
        </View>
      )}

      {step === 'moral' && (
        <View style={{ flex: 1 }}>
          <AppBar title="What's The Moral?" onBack={() => router.back()} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
            <StoryQuizQuestionCard
              question={story.moral.question}
              emoji="💭"
              options={story.moral.options}
              correctIndex={story.moral.correctIndex}
              onAnswered={() => {}}
              onAdvance={handleMoralAdvance}
            />
          </View>
        </View>
      )}

      <RewardDialog
        visible={step === 'reward' && reward !== null}
        onRequestClose={() => router.back()}
        title="Story Finished!"
        message={`You finished "${story.title}". Great reading!`}
        xpGained={reward?.xp}
        newlyUnlockedStars={reward?.stars}
        badge={{ emoji: story.badgeEmoji, title: story.badgeTitle }}
        actionLabel="Awesome!"
      />
    </View>
  );
}

function IntroStep({
  story,
  resuming,
  alreadyCompleted,
  mode,
  onSetMode,
  onBack,
  onStart,
}: {
  story: (typeof STORIES)[number];
  resuming: boolean;
  alreadyCompleted: boolean;
  mode: NarrationMode;
  onSetMode: (mode: NarrationMode) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
      <LinearGradient colors={story.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <AppBar variant="transparent" onBack={onBack} titleColor={theme.colors.textInverse} />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: theme.radii.full,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Emoji size={72}>{story.coverEmoji}</Emoji>
          </View>

          <Text variant="h1" style={{ color: theme.colors.textInverse, textAlign: 'center' }}>
            {story.title}
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <CardBadge label={`${story.minutes} min`} tone="neutral" />
            <CardBadge label={story.difficulty === 'easy' ? 'Easy' : story.difficulty === 'medium' ? 'Medium' : 'Hard'} tone="neutral" />
          </View>

          <Text variant="body" style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
            {story.summary}
          </Text>

          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: theme.radii.full, padding: 4, marginTop: theme.spacing.sm }}>
            <ModeButton label="🎧 Listen" active={mode === 'listen'} onPress={() => onSetMode('listen')} />
            <ModeButton label="📖 Read Myself" active={mode === 'readMyself'} onPress={() => onSetMode('readMyself')} />
          </View>

          <Button
            label={alreadyCompleted ? 'Read Again' : resuming ? 'Continue Reading' : 'Start Story'}
            size="lg"
            onPress={onStart}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.95}
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radii.full,
        backgroundColor: active ? theme.colors.surface : 'transparent',
      }}
    >
      <Text variant="bodySmall" style={{ color: active ? theme.colors.textPrimary : theme.colors.textInverse }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
