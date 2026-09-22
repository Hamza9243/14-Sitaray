import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Emoji } from '@/components/ui/Emoji';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, NightOption, type OptionStatus, shuffle, useCompleteOnce, useLater } from './shared';

interface Title {
  name: string;
  meaning: string;
  emoji: string;
}

const TITLES: Title[] = [
  { name: 'Asadullah', meaning: 'Lion of Allah', emoji: '🦁' },
  { name: 'Amir al-Mu\'minin', meaning: 'Commander of the Faithful', emoji: '👑' },
  { name: 'Bab-ul-Ilm', meaning: 'Gate of Knowledge', emoji: '🚪' },
  { name: 'Murtaza', meaning: 'The Chosen / Approved One', emoji: '🌟' },
  { name: 'Haydar', meaning: 'The Lion', emoji: '🐾' },
  { name: 'Abu Turab', meaning: 'Father of Dust (a loving name from the Prophet ﷺ)', emoji: '🏜️' },
];

type Phase = 'ready' | 'spinning' | 'question';

export function AlqaabWheelActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [collected, setCollected] = useState<number[]>([]);
  const [wrongs, setWrongs] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [current, setCurrent] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [rightPick, setRightPick] = useState<number | null>(null);

  function spin() {
    if (phase !== 'ready') return;
    const remaining = TITLES.map((_, i) => i).filter((i) => !collected.includes(i));
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    const steps = 14 + ((target - highlight + TITLES.length) % TITLES.length);
    setPhase('spinning');
    setRightPick(null);
    setWrongPick(null);
    let pos = highlight;
    let step = 0;
    const tick = () => {
      step += 1;
      pos = (pos + 1) % TITLES.length;
      setHighlight(pos);
      if (step >= steps) {
        later(() => {
          const distractors = shuffle(TITLES.map((_, i) => i).filter((i) => i !== target)).slice(0, 2);
          setCurrent(target);
          setOptions(shuffle([target, ...distractors]));
          setPhase('question');
        }, 400);
        return;
      }
      later(tick, 50 + step * 12);
    };
    later(tick, 50);
  }

  function choose(i: number) {
    if (phase !== 'question' || rightPick !== null || wrongPick !== null) return;
    if (i === current) {
      buzz('success');
      setRightPick(i);
      const next = [...collected, current];
      later(() => {
        setCollected(next);
        if (next.length >= TITLES.length) {
          complete((TITLES.length / (TITLES.length + wrongs)) * 100);
        } else {
          setPhase('ready');
        }
      }, 800);
    } else {
      buzz('warning');
      setWrongs((w) => w + 1);
      setWrongPick(i);
      later(() => {
        setWrongPick(null);
        setPhase('ready');
      }, 900);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Titles collected: ${collected.length} of ${TITLES.length}`}
        caption="Spin the wheel, then match the title to its meaning."
        progress={collected.length / TITLES.length}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
        {TITLES.map((t, i) => {
          const isOn = highlight === i && phase !== 'ready';
          const got = collected.includes(i);
          return (
            <View
              key={t.name}
              style={{
                width: 104,
                height: 88,
                borderRadius: theme.radii.lg,
                borderWidth: 3,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: isOn ? theme.palette.star[400] : got ? theme.colors.success : 'rgba(255,255,255,0.18)',
                backgroundColor: isOn ? 'rgba(255, 197, 38, 0.28)' : got ? theme.colors.successSurface : 'rgba(255,255,255,0.06)',
                transform: [{ scale: isOn ? 1.06 : 1 }],
              }}
            >
              <Emoji size={28}>{got ? '✅' : t.emoji}</Emoji>
              <Text
                variant="caption"
                style={{ color: got ? theme.colors.textPrimary : theme.palette.neutral[50], textAlign: 'center' }}
              >
                {got ? t.name : '?'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
        {phase === 'question' ? (
          <>
            <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
              {`${TITLES[current].name} means...`}
            </Text>
            {options.map((o) => {
              const status: OptionStatus = rightPick === o ? 'correct' : wrongPick === o ? 'wrong' : 'idle';
              return <NightOption key={o} label={TITLES[o].meaning} status={status} onPress={() => choose(o)} />;
            })}
            <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center' }}>
              {wrongPick !== null ? 'Not this time — spin again to see it later!' : ' '}
            </Text>
          </>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Button
              label={phase === 'spinning' ? 'Spinning...' : 'Spin'}
              size="lg"
              disabled={phase === 'spinning'}
              onPress={spin}
              accessibilityLabel="Spin the wheel of titles"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
