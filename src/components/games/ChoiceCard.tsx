import { Ionicons } from '@expo/vector-icons';

import { ArabicText } from '@/components/ui/ArabicText';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

import { AnimatedPressable } from '../ui/AnimatedPressable';

export type ChoiceStatus = 'idle' | 'correct' | 'wrong';

export interface ChoiceCardProps {
  /** Omit for a text-only word/label choice (e.g. missing-word challenges). */
  emoji?: string;
  label?: string;
  /** Renders `label` with the Arabic font + RTL, for Arabic word options. */
  labelScript?: 'arabic' | 'latin';
  status: ChoiceStatus;
  disabled?: boolean;
  onPress: () => void;
}

/** A large, tappable emoji choice — used for tap-to-choose missions (e.g. "pick the kind action"). */
export function ChoiceCard({ emoji, label, labelScript = 'latin', status, disabled, onPress }: ChoiceCardProps) {
  const { theme } = useTheme();

  const borderColor =
    status === 'correct' ? theme.colors.success : status === 'wrong' ? theme.colors.danger : theme.colors.border;
  const backgroundColor =
    status === 'correct' ? theme.colors.successSurface : status === 'wrong' ? theme.colors.dangerSurface : theme.colors.surface;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      style={{
        width: 100,
        height: 100,
        borderRadius: theme.radii.lg,
        borderWidth: 3,
        borderColor,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {emoji ? <Emoji size={42}>{emoji}</Emoji> : null}
      {label && labelScript === 'arabic' ? (
        <ArabicText size={emoji ? 16 : 22} color={emoji ? 'textSecondary' : 'textPrimary'}>
          {label}
        </ArabicText>
      ) : null}
      {label && labelScript === 'latin' ? (
        <Text variant={emoji ? 'caption' : 'title'} color={emoji ? 'textSecondary' : 'textPrimary'}>
          {label}
        </Text>
      ) : null}
      {status === 'correct' && <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} style={{ position: 'absolute', top: 6, right: 6 }} />}
      {status === 'wrong' && <Ionicons name="close-circle" size={18} color={theme.colors.danger} style={{ position: 'absolute', top: 6, right: 6 }} />}
    </AnimatedPressable>
  );
}
