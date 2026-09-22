import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, shuffle, useCompleteOnce, useLater } from './shared';

const FOODS = [
  { emoji: '🍞', label: 'Bread' },
  { emoji: '🥛', label: 'Milk' },
  { emoji: '🍎', label: 'Apple' },
  { emoji: '🍲', label: 'Stew' },
  { emoji: '🍚', label: 'Rice' },
];

export function YateemKaKhanaActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const labelOrder = useMemo(() => shuffle(FOODS.map((_, i) => i)), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongLabel, setWrongLabel] = useState<number | null>(null);
  const [wrongs, setWrongs] = useState(0);
  const [message, setMessage] = useState('');

  function pickFood(i: number) {
    if (matched.includes(i)) return;
    setSelected(selected === i ? null : i);
  }

  function pickLabel(i: number) {
    if (selected === null || matched.includes(i)) return;
    if (i === selected) {
      buzz('success');
      const next = [...matched, i];
      setMatched(next);
      setSelected(null);
      setMessage(`${FOODS[i].label} is packed in the basket!`);
      if (next.length === FOODS.length) {
        later(() => complete((FOODS.length / (FOODS.length + wrongs)) * 100), 900);
      }
    } else {
      buzz('warning');
      setWrongs((w) => w + 1);
      setWrongLabel(i);
      setMessage('Not a match. Try another card.');
      later(() => setWrongLabel(null), 600);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title="Fill the family basket"
        caption="Tap a food, then tap its name. Caring for orphans quietly, without showing off."
        progress={matched.length / FOODS.length}
      />

      <Text variant="label" style={{ color: theme.palette.night[200], marginBottom: theme.spacing.xs }}>
        FOOD
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
        {FOODS.map((f, i) => {
          const done = matched.includes(i);
          const sel = selected === i;
          return (
            <AnimatedPressable
              key={f.label}
              onPress={() => pickFood(i)}
              disabled={done}
              accessibilityRole="button"
              accessibilityLabel={`Food card ${f.label}${sel ? ', selected' : ''}`}
              style={{
                width: 76,
                height: 76,
                borderRadius: theme.radii.lg,
                borderWidth: 3,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: done ? theme.colors.success : sel ? theme.palette.star[400] : 'rgba(255,255,255,0.18)',
                backgroundColor: done ? theme.colors.successSurface : sel ? 'rgba(255, 197, 38, 0.2)' : 'rgba(255,255,255,0.06)',
              }}
            >
              <Emoji size={38}>{f.emoji}</Emoji>
            </AnimatedPressable>
          );
        })}
      </View>

      <Text variant="label" style={{ color: theme.palette.night[200], marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }}>
        BASKET LIST
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
        {labelOrder.map((i) => {
          const done = matched.includes(i);
          const bad = wrongLabel === i;
          return (
            <AnimatedPressable
              key={FOODS[i].label}
              onPress={() => pickLabel(i)}
              disabled={done}
              accessibilityRole="button"
              accessibilityLabel={`Name card ${FOODS[i].label}`}
              style={{
                minWidth: 96,
                height: 52,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radii.lg,
                borderWidth: 3,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: done ? theme.colors.success : bad ? theme.colors.danger : 'rgba(255,255,255,0.18)',
                backgroundColor: done ? theme.colors.successSurface : bad ? theme.colors.dangerSurface : 'rgba(255,255,255,0.06)',
              }}
            >
              <Text variant="title" style={{ color: done || bad ? theme.colors.textPrimary : theme.palette.neutral[50] }}>
                {FOODS[i].label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.md }}>
        {message || (selected === null ? 'Pick a food first.' : 'Now pick its name.')}
      </Text>
    </ScrollView>
  );
}
