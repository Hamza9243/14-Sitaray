import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityDefinition } from '@/types/games';

export type ActivityCardState = 'locked' | 'unlocked' | 'completed';

export interface ActivityCardProps {
  activity: ActivityDefinition;
  index: number;
  state: ActivityCardState;
  onPress: () => void;
}

/** One activity tile on a game hub (e.g. Imam Ali's 8-activity grid) — locked, unlocked, or completed. */
export function ActivityCard({ activity, index, state, onPress }: ActivityCardProps) {
  const { theme } = useTheme();
  const locked = state === 'locked';
  const completed = state === 'completed';

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={locked}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${activity.title}, locked` : activity.title}
      style={{
        width: '47%',
        borderRadius: theme.radii.lg,
        padding: theme.spacing.md,
        backgroundColor: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
        borderWidth: completed ? 2 : 1,
        borderColor: completed ? theme.palette.star[400] : 'rgba(255,255,255,0.12)',
        gap: theme.spacing.xs,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.radii.full,
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {locked ? (
          <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.4)" />
        ) : (
          <Emoji size={26}>{activity.icon}</Emoji>
        )}
      </View>

      <Text
        variant="title"
        style={{ color: locked ? 'rgba(255,255,255,0.35)' : theme.palette.neutral[50] }}
        numberOfLines={2}
      >
        {`${index}. ${activity.title}`}
      </Text>

      {completed && (
        <View style={{ position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm }}>
          <Ionicons name="checkmark-circle" size={22} color={theme.palette.star[400]} />
        </View>
      )}
    </AnimatedPressable>
  );
}
