import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Emoji } from '@/components/ui/Emoji';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export type OptionStatus = 'idle' | 'correct' | 'wrong' | 'selected';

export function buzz(kind: 'success' | 'warning') {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(
    kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
  );
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Returns a function that calls onComplete at most once. */
export function useCompleteOnce(onComplete: (score: number) => void) {
  const done = useRef(false);
  const cb = useRef(onComplete);
  cb.current = onComplete;
  return useCallback((score: number) => {
    if (done.current) return;
    done.current = true;
    cb.current(Math.max(0, Math.min(100, Math.round(score))));
  }, []);
}

/** setTimeout wrapper whose pending timers are all cleared on unmount. */
export function useLater() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );
  return useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
}

export function GameHeader({ title, caption, progress }: { title: string; caption?: string; progress: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
      <ProgressBar progress={progress} color={theme.palette.star[400]} trackColor="rgba(255,255,255,0.12)" />
      <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
        {title}
      </Text>
      {caption ? (
        <Text variant="bodySmall" style={{ color: theme.palette.night[200], textAlign: 'center' }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export interface NightOptionProps {
  label: string;
  emoji?: string;
  status?: OptionStatus;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function NightOption({ label, emoji, status = 'idle', disabled, onPress, accessibilityLabel }: NightOptionProps) {
  const { theme } = useTheme();
  const border =
    status === 'correct'
      ? theme.colors.success
      : status === 'wrong'
        ? theme.colors.danger
        : status === 'selected'
          ? theme.palette.star[400]
          : 'rgba(255,255,255,0.18)';
  const bg =
    status === 'correct'
      ? theme.colors.successSurface
      : status === 'wrong'
        ? theme.colors.dangerSurface
        : status === 'selected'
          ? 'rgba(255, 197, 38, 0.16)'
          : 'rgba(255,255,255,0.06)';
  const dark = status === 'correct' || status === 'wrong';
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        minHeight: 56,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radii.lg,
        borderWidth: 2,
        borderColor: border,
        backgroundColor: bg,
      }}
    >
      {emoji ? <Emoji size={28}>{emoji}</Emoji> : null}
      <Text
        variant="body"
        style={{ flex: 1, color: dark ? theme.colors.textPrimary : theme.palette.neutral[50] }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
