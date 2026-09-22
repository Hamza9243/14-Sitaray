import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, shuffle, useCompleteOnce, useLater } from './shared';

const SAYINGS = [
  'Knowledge is better than wealth.',
  'Be kind to others as you would like them to be kind to you.',
  'Do not be the servant of others, for Allah has made you free.',
  'The value of every person is in what they do well.',
];

export function HikmatPuzzleActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [round, setRound] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const words = useMemo(() => SAYINGS[round].split(' '), [round]);
  const order = useMemo(() => {
    void shuffleSeed;
    return shuffle(words.map((_, i) => i));
  }, [words, shuffleSeed]);

  function tap(wordIndex: number) {
    if (locked || built.includes(wordIndex)) return;
    const expected = words[built.length];
    if (words[wordIndex] === expected) {
      buzz('success');
      const next = [...built, wordIndex];
      setBuilt(next);
      if (next.length === words.length) {
        setLocked(true);
        later(() => {
          if (round + 1 >= SAYINGS.length) {
            complete((SAYINGS.length / (SAYINGS.length + wrongs)) * 100);
          } else {
            setRound(round + 1);
            setBuilt([]);
            setLocked(false);
          }
        }, 1100);
      }
    } else {
      buzz('warning');
      setWrongs((w) => w + 1);
      setFlash(wordIndex);
      later(() => setFlash(null), 500);
    }
  }

  function reset() {
    if (locked) return;
    setBuilt([]);
    setShuffleSeed((s) => s + 1);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Saying ${round + 1} of ${SAYINGS.length}`}
        caption="Tap the words in the right order."
        progress={round / SAYINGS.length}
      />

      <View
        style={{
          minHeight: 120,
          borderRadius: theme.radii.lg,
          borderWidth: 2,
          borderColor: theme.palette.star[400],
          backgroundColor: 'rgba(255, 197, 38, 0.08)',
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        <Text variant="label" style={{ color: theme.palette.star[400] }}>
          Wisdom of Imam Ali (a.s.)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {built.map((wi, pos) => (
            <Text key={pos} variant="title" style={{ color: theme.palette.neutral[50] }}>
              {words[wi]}
            </Text>
          ))}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.lg,
        }}
      >
        {order.map((wi) => {
          const used = built.includes(wi);
          const bad = flash === wi;
          return (
            <AnimatedPressable
              key={wi}
              onPress={() => tap(wi)}
              disabled={used}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={`Word ${words[wi]}`}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radii.full,
                borderWidth: 2,
                borderColor: bad ? theme.colors.danger : 'rgba(255,255,255,0.25)',
                backgroundColor: bad ? theme.colors.dangerSurface : 'rgba(255,255,255,0.08)',
                transform: [{ translateX: bad ? 6 : 0 }],
              }}
            >
              <Text variant="body" style={{ color: bad ? theme.colors.textPrimary : theme.palette.neutral[50] }}>
                {words[wi]}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
        <Button label="Reset" variant="secondary" size="sm" onPress={reset} accessibilityLabel="Reset this saying" />
      </View>
      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.sm }}>
        {locked ? 'Beautiful words!' : ' '}
      </Text>
    </ScrollView>
  );
}
