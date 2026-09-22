import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, useCompleteOnce, useLater } from './shared';

const TARGETS = [3, 5, 7];
const STAR_COUNT = 10;

export function LaylatulMabitActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [wrongChecks, setWrongChecks] = useState(0);
  const [message, setMessage] = useState('');
  const [locked, setLocked] = useState(false);

  const target = TARGETS[round];

  function toggle(i: number) {
    if (locked) return;
    setMessage('');
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  }

  function check() {
    if (locked) return;
    if (picked.length === target) {
      buzz('success');
      setLocked(true);
      setMessage(`Yes! ${target} stars. Well counted!`);
      later(() => {
        if (round + 1 >= TARGETS.length) {
          complete((TARGETS.length / (TARGETS.length + wrongChecks)) * 100);
        } else {
          setRound(round + 1);
          setPicked([]);
          setMessage('');
          setLocked(false);
        }
      }, 900);
    } else {
      buzz('warning');
      setWrongChecks((w) => w + 1);
      setMessage(
        picked.length < target
          ? `You chose ${picked.length}. Tap a few more stars.`
          : `You chose ${picked.length}. Tap some stars again to remove them.`,
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Tap exactly ${target} stars`}
        caption={`Round ${round + 1} of ${TARGETS.length}`}
        progress={round / TARGETS.length}
      />

      <View
        style={{
          borderRadius: theme.radii.xl,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Emoji size={44}>🌙</Emoji>
          <Emoji size={32}>🛏️</Emoji>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
          {Array.from({ length: STAR_COUNT }, (_, i) => {
            const on = picked.includes(i);
            return (
              <AnimatedPressable
                key={i}
                onPress={() => toggle(i)}
                scaleTo={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Star ${i + 1}${on ? ', selected' : ''}`}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: theme.radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: on ? theme.palette.star[400] : 'rgba(255,255,255,0.15)',
                  backgroundColor: on ? 'rgba(255, 197, 38, 0.25)' : 'transparent',
                  transform: [{ translateY: i % 2 === 0 ? 0 : 8 }],
                }}
              >
                <Emoji size={30} style={{ opacity: on ? 1 : 0.55 }}>
                  {on ? '⭐' : '✨'}
                </Emoji>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      <Text variant="body" style={{ color: theme.palette.neutral[50], textAlign: 'center', marginTop: theme.spacing.md }}>
        {`Chosen: ${picked.length}`}
      </Text>
      <View style={{ alignItems: 'center', marginTop: theme.spacing.sm }}>
        <Button label="Check" size="lg" onPress={check} disabled={locked} accessibilityLabel="Check my star count" />
      </View>
      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.sm }}>
        {message || ' '}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.md, fontStyle: 'italic' }}
      >
        On this night Imam Ali (a.s.) slept in the Prophet's ﷺ bed so the Prophet ﷺ could travel safely to Madinah, trusting Allah completely.
      </Text>
    </ScrollView>
  );
}
