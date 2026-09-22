import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';

import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, NightOption, type OptionStatus, useCompleteOnce, useLater } from './shared';

interface Scenario {
  prompt: string;
  options: string[];
  fair: number;
}

const SCENARIOS: Scenario[] = [
  {
    prompt: 'Two children both want the last cookie. What is fair?',
    options: ['The bigger child takes it', 'Break it in two equal halves', 'Whoever grabs it first keeps it'],
    fair: 1,
  },
  {
    prompt: 'You are the teacher\'s helper and must hand out stickers. What is fair?',
    options: ['Give one to every child', 'Give more to your best friend'],
    fair: 0,
  },
  {
    prompt: 'Two friends both say the other broke the toy. What is fair?',
    options: ['Believe your favourite friend', 'Listen to both, then decide', 'Blame the quiet one'],
    fair: 1,
  },
  {
    prompt: 'There is one swing and a line of children. What is fair?',
    options: ['Everyone takes a turn', 'Only the oldest child swings'],
    fair: 0,
  },
  {
    prompt: 'A new child joins your game. What is fair?',
    options: ['Let them play too', 'Tell them there is no space', 'Only let them watch'],
    fair: 0,
  },
];

const START_TILT = 20;

export function AdlKaTaraazuActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);

  const tilt = useRef(new Animated.Value(START_TILT)).current;
  const targetTilt = START_TILT * (1 - solved / SCENARIOS.length);

  useEffect(() => {
    const anim = Animated.timing(tilt, {
      toValue: targetTilt,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [tilt, targetTilt]);

  const rotate = tilt.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
  const s = SCENARIOS[index];
  const balanced = right !== null && solved === SCENARIOS.length;

  function choose(i: number) {
    if (right !== null) return;
    if (i === s.fair) {
      buzz('success');
      setRight(i);
      setSolved(index + 1);
      const total = firstTry + (missed ? 0 : 1);
      later(() => {
        if (index + 1 >= SCENARIOS.length) {
          complete((total / SCENARIOS.length) * 100);
        } else {
          setFirstTry(total);
          setIndex(index + 1);
          setMissed(false);
          setRight(null);
          setWrong(null);
        }
      }, 1100);
    } else {
      buzz('warning');
      setMissed(true);
      setWrong(i);
      later(() => setWrong(null), 700);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Round ${index + 1} of ${SCENARIOS.length}`}
        caption="Choose what is fair to balance the scale."
        progress={solved / SCENARIOS.length}
      />

      <View style={{ alignItems: 'center', height: 130, marginBottom: theme.spacing.md }}>
        <Animated.View
          style={{ width: 240, height: 56, alignItems: 'center', justifyContent: 'center', transform: [{ rotate }] }}
        >
          <View style={{ width: 240, height: 8, borderRadius: 4, backgroundColor: theme.palette.star[400] }} />
          <View style={{ position: 'absolute', left: 0, top: 0 }}>
            <Emoji size={40}>🍪</Emoji>
          </View>
          <View style={{ position: 'absolute', right: 0, top: 0 }}>
            <Emoji size={40}>🍪</Emoji>
          </View>
        </Animated.View>
        <View style={{ width: 10, height: 50, backgroundColor: theme.palette.star[600], borderRadius: 5 }} />
        <View style={{ width: 90, height: 10, backgroundColor: theme.palette.star[600], borderRadius: 5 }} />
      </View>

      <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center', marginBottom: theme.spacing.md }}>
        {s.prompt}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        {s.options.map((opt, i) => {
          const status: OptionStatus = right === i ? 'correct' : wrong === i ? 'wrong' : 'idle';
          return <NightOption key={opt} label={opt} status={status} onPress={() => choose(i)} />;
        })}
      </View>
      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.md }}>
        {balanced ? 'The scale is balanced!' : wrong !== null ? 'Hmm, is that fair to everyone? Try again.' : right !== null ? 'Fair! The scale moves closer to balance.' : ' '}
      </Text>
    </ScrollView>
  );
}
