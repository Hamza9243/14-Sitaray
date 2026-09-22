import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityProps } from '@/types/games';

import { buzz, GameHeader, useCompleteOnce, useLater } from './shared';

const GOAL = 3;
const ZONES = [
  { start: 0.35, width: 0.3 },
  { start: 0.55, width: 0.24 },
  { start: 0.2, width: 0.2 },
];
const SPEED = 0.014;

export function KhyberKaDarwazaActivity({ onComplete }: ActivityProps) {
  const { theme } = useTheme();
  const complete = useCompleteOnce(onComplete);
  const later = useLater();
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const [successes, setSuccesses] = useState(0);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const { start: zoneStart, width: zoneWidth } = ZONES[Math.min(successes, ZONES.length - 1)];

  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      let next = posRef.current + dir * SPEED;
      if (next >= 1) {
        next = 1;
        dir = -1;
      } else if (next <= 0) {
        next = 0;
        dir = 1;
      }
      posRef.current = next;
      setPos(next);
    }, 24);
    return () => clearInterval(id);
  }, []);

  function setPause(v: boolean) {
    pausedRef.current = v;
    setPaused(v);
  }

  function lift() {
    if (paused) return;
    const p = posRef.current;
    const hit = p >= zoneStart && p <= zoneStart + zoneWidth;
    setPause(true);
    if (hit) {
      buzz('success');
      const n = successes + 1;
      setSuccesses(n);
      setMessage(n >= GOAL ? 'The great gate is lifted!' : 'Great lift! Again!');
      later(() => {
        if (n >= GOAL) {
          complete((GOAL / (GOAL + misses)) * 100);
        } else {
          setPause(false);
        }
      }, 800);
    } else {
      buzz('warning');
      setMisses((m) => m + 1);
      setMessage('Try again');
      later(() => {
        setMessage('');
        setPause(false);
      }, 600);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
      <GameHeader
        title="Lift the great gate of Khaybar"
        caption="Tap Lift when the marker is inside the green zone."
        progress={successes / GOAL}
      />

      <View style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
        <Emoji size={72} style={{ transform: [{ translateY: -successes * 10 }] }}>
          🚪
        </Emoji>
      </View>

      <View
        style={{
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
          marginTop: theme.spacing.md,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${zoneStart * 100}%`,
            width: `${zoneWidth * 100}%`,
            backgroundColor: theme.colors.success,
            opacity: 0.85,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pos * 100}%`,
            width: 8,
            marginLeft: -4,
            backgroundColor: theme.palette.star[400],
            borderRadius: 4,
          }}
        />
      </View>

      <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
        <Button label="Lift!" size="lg" onPress={lift} disabled={paused} accessibilityLabel="Lift the gate" />
      </View>
      <Text variant="body" style={{ color: theme.palette.neutral[50], textAlign: 'center', marginTop: theme.spacing.md }}>
        {message || ' '}
      </Text>
    </ScrollView>
  );
}
