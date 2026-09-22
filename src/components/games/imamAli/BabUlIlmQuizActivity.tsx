import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, NightOption, type OptionStatus, useCompleteOnce, useLater } from './shared';

interface Question {
  prompt: string;
  options: string[];
  answer: number;
}

const QUESTIONS: Question[] = [
  {
    prompt: 'The Prophet ﷺ said: "I am the city of knowledge and Ali is its ..."',
    options: ['Gate', 'Garden', 'Roof'],
    answer: 0,
  },
  {
    prompt: 'What should we do when we do not know something?',
    options: ['Pretend we know', 'Ask kindly and learn', 'Stop trying'],
    answer: 1,
  },
  {
    prompt: 'You learned something useful. What is a good thing to do?',
    options: ['Share it with others', 'Hide it from everyone', 'Forget it'],
    answer: 0,
  },
  {
    prompt: 'Which is better, according to Imam Ali (a.s.)?',
    options: ['Knowledge', 'Showing off', 'Laziness'],
    answer: 0,
  },
  {
    prompt: 'How do we open the gate of knowledge?',
    options: ['By reading, listening and asking', 'By never asking', 'By sleeping in class'],
    answer: 0,
  },
];

export function BabUlIlmQuizActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);

  const q = QUESTIONS[index];

  function choose(i: number) {
    if (right !== null) return;
    if (i === q.answer) {
      buzz('success');
      setRight(i);
      const gained = missed ? 0 : 1;
      const total = firstTry + gained;
      later(() => {
        if (index + 1 >= QUESTIONS.length) {
          complete((total / QUESTIONS.length) * 100);
        } else {
          setFirstTry(total);
          setIndex(index + 1);
          setMissed(false);
          setRight(null);
          setWrong(null);
        }
      }, 700);
    } else {
      buzz('warning');
      setMissed(true);
      setWrong(i);
      later(() => setWrong(null), 600);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Question ${index + 1} of ${QUESTIONS.length}`}
        progress={(index + (right !== null ? 1 : 0)) / QUESTIONS.length}
      />
      <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center', marginBottom: theme.spacing.lg }}>
        {q.prompt}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        {q.options.map((opt, i) => {
          const status: OptionStatus = right === i ? 'correct' : wrong === i ? 'wrong' : 'idle';
          return <NightOption key={opt} label={opt} status={status} onPress={() => choose(i)} />;
        })}
      </View>
      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.md }}>
        {wrong !== null ? 'Not quite — try again!' : right !== null ? 'Well done!' : ' '}
      </Text>
    </ScrollView>
  );
}
