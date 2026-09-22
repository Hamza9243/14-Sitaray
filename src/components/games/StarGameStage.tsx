import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type {
  StarChoiceGame,
  StarGameDefinition,
  StarMatchGame,
  StarOrderGame,
  StarSortGame,
} from '@/types/games';

export interface StarGameStageProps {
  game: StarGameDefinition;
  /** Called exactly once, after the player has finished the whole game. */
  onComplete: () => void;
}

function buzz(kind: 'good' | 'bad') {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(
    kind === 'good' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
  ).catch(() => {});
}

/** Fisher–Yates shuffle that never returns the input order (so an "order the steps" game is never pre-solved). */
function shuffled<T>(items: T[]): T[] {
  if (items.length < 2) return [...items];
  let result = [...items];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    if (result.some((item, index) => item !== items[index])) return result;
  }
  return result;
}

/** Schedules timeouts that are all cleared on unmount, and exposes a one-shot completion latch. */
function useStageTimers(onComplete: () => void) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completed = useRef(false);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  return {
    later(fn: () => void, ms: number) {
      timers.current.push(setTimeout(fn, ms));
    },
    finish() {
      if (completed.current) return;
      completed.current = true;
      onComplete();
    },
  };
}

export function StarGameStage({ game, onComplete }: StarGameStageProps) {
  switch (game.kind) {
    case 'choice':
      return <ChoiceStage game={game} onComplete={onComplete} />;
    case 'match':
      return <MatchStage game={game} onComplete={onComplete} />;
    case 'order':
      return <OrderStage game={game} onComplete={onComplete} />;
    case 'sort':
      return <SortStage game={game} onComplete={onComplete} />;
  }
}

function ChoiceStage({ game, onComplete }: { game: StarChoiceGame; onComplete: () => void }) {
  const { theme } = useTheme();
  const { finish } = useStageTimers(onComplete);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const round = game.rounds[roundIndex];
  const isLast = roundIndex + 1 >= game.rounds.length;

  function pick(index: number) {
    if (solved) return;
    setSelected(index);
    if (index === round.correctIndex) {
      setSolved(true);
      buzz('good');
    } else {
      buzz('bad');
    }
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setRoundIndex((i) => i + 1);
    setSelected(null);
    setSolved(false);
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <ProgressBar progress={roundIndex / game.rounds.length} label={`Question ${roundIndex + 1} of ${game.rounds.length}`} />
      <Card variant="raised">
        {round.emoji ? (
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Emoji size={48}>{round.emoji}</Emoji>
          </View>
        ) : null}
        <Text variant="title" style={{ textAlign: 'center' }}>
          {round.prompt}
        </Text>

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          {round.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrect = index === round.correctIndex;
            const showCorrect = solved && isCorrect;
            const showWrong = isSelected && !isCorrect;
            return (
              <AnimatedPressable
                key={option.label}
                onPress={() => pick(index)}
                disabled={solved}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={{
                  borderRadius: theme.radii.md,
                  borderWidth: 2,
                  borderColor: showCorrect ? theme.colors.success : showWrong ? theme.colors.danger : theme.colors.border,
                  backgroundColor: showCorrect
                    ? theme.colors.successSurface
                    : showWrong
                      ? theme.colors.dangerSurface
                      : theme.colors.surface,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <Emoji size={26}>{option.emoji}</Emoji>
                <Text variant="body" style={{ flex: 1 }}>
                  {option.label}
                </Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
                {showWrong && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
              </AnimatedPressable>
            );
          })}
        </View>

        {selected !== null && !solved && (
          <Text variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.sm }}>
            Not quite — give it another try!
          </Text>
        )}
        {solved && (
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <Text variant="bodySmall" color="success">
              {round.explanation}
            </Text>
            <Button label={isLast ? 'Finish' : 'Next'} onPress={next} fullWidth />
          </View>
        )}
      </Card>
    </View>
  );
}

function MatchStage({ game, onComplete }: { game: StarMatchGame; onComplete: () => void }) {
  const { theme } = useTheme();
  const { later, finish } = useStageTimers(onComplete);
  const rightOrder = useMemo(() => shuffled(game.pairs.map((_, index) => index)), [game]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongRight, setWrongRight] = useState<number | null>(null);

  function pickLeft(index: number) {
    if (matched.includes(index)) return;
    setSelectedLeft(index);
    setWrongRight(null);
  }

  function pickRight(pairIndex: number) {
    if (selectedLeft === null || matched.includes(pairIndex)) return;
    if (pairIndex === selectedLeft) {
      buzz('good');
      const next = [...matched, pairIndex];
      setMatched(next);
      setSelectedLeft(null);
      if (next.length === game.pairs.length) later(finish, 600);
    } else {
      buzz('bad');
      setWrongRight(pairIndex);
      later(() => setWrongRight(null), 600);
    }
  }

  function cardStyle(state: 'idle' | 'selected' | 'matched' | 'wrong') {
    return {
      borderRadius: theme.radii.md,
      borderWidth: 2,
      borderColor:
        state === 'matched'
          ? theme.colors.success
          : state === 'wrong'
            ? theme.colors.danger
            : state === 'selected'
              ? theme.colors.brandStrong
              : theme.colors.border,
      backgroundColor:
        state === 'matched'
          ? theme.colors.successSurface
          : state === 'wrong'
            ? theme.colors.dangerSurface
            : state === 'selected'
              ? theme.colors.brandSoft
              : theme.colors.surface,
      padding: theme.spacing.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 4,
      minHeight: 84,
    };
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <ProgressBar progress={matched.length / game.pairs.length} label={`${matched.length} of ${game.pairs.length} matched`} />
      <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
        Tap a card on the left, then tap the card that goes with it.
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          {game.pairs.map((pair, index) => (
            <AnimatedPressable
              key={pair.left.label}
              onPress={() => pickLeft(index)}
              disabled={matched.includes(index)}
              accessibilityRole="button"
              accessibilityLabel={pair.left.label}
              style={cardStyle(matched.includes(index) ? 'matched' : selectedLeft === index ? 'selected' : 'idle')}
            >
              <Emoji size={30}>{pair.left.emoji}</Emoji>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {pair.left.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          {rightOrder.map((pairIndex) => {
            const pair = game.pairs[pairIndex];
            return (
              <AnimatedPressable
                key={pair.right.label}
                onPress={() => pickRight(pairIndex)}
                disabled={matched.includes(pairIndex)}
                accessibilityRole="button"
                accessibilityLabel={pair.right.label}
                style={cardStyle(matched.includes(pairIndex) ? 'matched' : wrongRight === pairIndex ? 'wrong' : 'idle')}
              >
                <Emoji size={30}>{pair.right.emoji}</Emoji>
                <Text variant="caption" style={{ textAlign: 'center' }}>
                  {pair.right.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function OrderStage({ game, onComplete }: { game: StarOrderGame; onComplete: () => void }) {
  const { theme } = useTheme();
  const { later, finish } = useStageTimers(onComplete);
  const options = useMemo(() => shuffled(game.steps.map((_, index) => index)), [game]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);

  function pick(stepIndex: number) {
    if (chosen.includes(stepIndex) || chosen.length >= game.steps.length) return;
    if (stepIndex === chosen.length) {
      buzz('good');
      const next = [...chosen, stepIndex];
      setChosen(next);
      setWrong(null);
      if (next.length === game.steps.length) later(finish, 700);
    } else {
      buzz('bad');
      setWrong(stepIndex);
      later(() => setWrong(null), 700);
    }
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <ProgressBar progress={chosen.length / game.steps.length} label={`Step ${Math.min(chosen.length + 1, game.steps.length)} of ${game.steps.length}`} />
      <Card variant="raised">
        <Text variant="title" style={{ textAlign: 'center' }}>
          {game.prompt}
        </Text>

        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
          {game.steps.map((step, index) => {
            const done = index < chosen.length;
            return (
              <View
                key={step.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  borderRadius: theme.radii.md,
                  borderWidth: 2,
                  borderStyle: done ? 'solid' : 'dashed',
                  borderColor: done ? theme.colors.success : theme.colors.border,
                  backgroundColor: done ? theme.colors.successSurface : theme.colors.surfaceSunken,
                  padding: theme.spacing.sm,
                  minHeight: 52,
                }}
              >
                <Text variant="title" color={done ? 'success' : 'textSecondary'} style={{ width: 24 }}>
                  {index + 1}
                </Text>
                {done ? (
                  <>
                    <Emoji size={22}>{step.emoji}</Emoji>
                    <Text variant="body" style={{ flex: 1 }}>
                      {step.label}
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        {options.map((stepIndex) => {
          const step = game.steps[stepIndex];
          const used = chosen.includes(stepIndex);
          if (used) return null;
          return (
            <AnimatedPressable
              key={step.label}
              onPress={() => pick(stepIndex)}
              accessibilityRole="button"
              accessibilityLabel={step.label}
              style={{
                borderRadius: theme.radii.md,
                borderWidth: 2,
                borderColor: wrong === stepIndex ? theme.colors.danger : theme.colors.border,
                backgroundColor: wrong === stepIndex ? theme.colors.dangerSurface : theme.colors.surface,
                padding: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <Emoji size={24}>{step.emoji}</Emoji>
              <Text variant="body" style={{ flex: 1 }}>
                {step.label}
              </Text>
            </AnimatedPressable>
          );
        })}
        {wrong !== null && (
          <Text variant="bodySmall" color="danger" style={{ textAlign: 'center' }}>
            That one comes at a different time — try another step!
          </Text>
        )}
      </View>
    </View>
  );
}

function SortStage({ game, onComplete }: { game: StarSortGame; onComplete: () => void }) {
  const { theme } = useTheme();
  const { later, finish } = useStageTimers(onComplete);
  const items = useMemo(() => shuffled(game.items), [game]);
  const [index, setIndex] = useState(0);
  const [wrongBucket, setWrongBucket] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const item = items[index];

  function choose(bucket: 0 | 1) {
    if (locked || !item) return;
    if (bucket === item.bucket) {
      buzz('good');
      setLocked(true);
      setWrongBucket(null);
      later(() => {
        setLocked(false);
        if (index + 1 >= items.length) finish();
        else setIndex((i) => i + 1);
      }, 450);
    } else {
      buzz('bad');
      setWrongBucket(bucket);
      later(() => setWrongBucket(null), 900);
    }
  }

  if (!item) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <ProgressBar progress={index / items.length} label={`${index + 1} of ${items.length}`} />
      <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
        {game.prompt}
      </Text>
      <Card variant="raised" style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
        <Emoji size={64}>{item.emoji}</Emoji>
        <Text variant="h3" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
          {item.label}
        </Text>
        {wrongBucket !== null && (
          <Text variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
            Hmm, think again — try the other one!
          </Text>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {game.buckets.map((bucket, bucketIndex) => (
          <AnimatedPressable
            key={bucket.label}
            onPress={() => choose(bucketIndex as 0 | 1)}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={bucket.label}
            style={{
              flex: 1,
              borderRadius: theme.radii.lg,
              borderWidth: 3,
              borderColor: wrongBucket === bucketIndex ? theme.colors.danger : theme.colors.border,
              backgroundColor: wrongBucket === bucketIndex ? theme.colors.dangerSurface : theme.colors.surface,
              paddingVertical: theme.spacing.md,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Emoji size={36}>{bucket.emoji}</Emoji>
            <Text variant="title">{bucket.label}</Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
}
