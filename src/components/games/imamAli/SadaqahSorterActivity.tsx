import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, NightOption, type OptionStatus, shuffle, useCompleteOnce, useLater } from './shared';

type Bin = 'share' | 'keep';

interface Item {
  emoji: string;
  label: string;
  bin: Bin;
  hint: string;
}

const ITEMS: Item[] = [
  { emoji: '🍲', label: 'Extra food from dinner', bin: 'share', hint: 'Extra food can fill someone else\'s tummy.' },
  { emoji: '🧥', label: 'An old coat you do not wear', bin: 'share', hint: 'Someone might be cold and need it.' },
  { emoji: '🎒', label: 'Your own school bag', bin: 'keep', hint: 'You need this every day for school.' },
  { emoji: '🧸', label: 'A toy you have two of', bin: 'share', hint: 'You can happily share the spare one.' },
  { emoji: '🪥', label: 'Your toothbrush', bin: 'keep', hint: 'A toothbrush is personal, so we keep our own.' },
  { emoji: '🛏️', label: 'A spare blanket', bin: 'share', hint: 'A blanket you do not need can warm someone.' },
  { emoji: '📓', label: 'Your homework book', bin: 'keep', hint: 'You need it for your own homework.' },
  { emoji: '📚', label: 'A storybook you finished', bin: 'share', hint: 'Another child would love to read it.' },
];

export function SadaqahSorterActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const items = useMemo(() => shuffle(ITEMS), []);
  const [index, setIndex] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [hint, setHint] = useState('');
  const [wrongBin, setWrongBin] = useState<Bin | null>(null);
  const [rightBin, setRightBin] = useState<Bin | null>(null);

  const item = items[index];

  function choose(bin: Bin) {
    if (rightBin !== null) return;
    if (bin === item.bin) {
      buzz('success');
      setRightBin(bin);
      setHint('Lovely choice!');
      later(() => {
        if (index + 1 >= items.length) {
          complete((items.length / (items.length + wrongs)) * 100);
        } else {
          setIndex(index + 1);
          setRightBin(null);
          setWrongBin(null);
          setHint('');
        }
      }, 800);
    } else {
      buzz('warning');
      setWrongs((w) => w + 1);
      setWrongBin(bin);
      setHint(item.hint);
      later(() => setWrongBin(null), 700);
    }
  }

  const status = (bin: Bin): OptionStatus => (rightBin === bin ? 'correct' : wrongBin === bin ? 'wrong' : 'idle');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title={`Item ${index + 1} of ${items.length}`}
        caption="Where should this go?"
        progress={index / items.length}
      />

      <View
        style={{
          alignItems: 'center',
          gap: theme.spacing.xs,
          padding: theme.spacing.lg,
          borderRadius: theme.radii.xl,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.18)',
          marginBottom: theme.spacing.lg,
        }}
      >
        <Emoji size={72}>{item.emoji}</Emoji>
        <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
          {item.label}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <NightOption emoji="🤲" label="Share with someone in need" status={status('share')} onPress={() => choose('share')} />
        <NightOption emoji="🏠" label="Keep for myself" status={status('keep')} onPress={() => choose('keep')} />
      </View>
      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.md }}>
        {hint || ' '}
      </Text>
    </ScrollView>
  );
}
