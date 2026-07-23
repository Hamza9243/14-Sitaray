import { View } from 'react-native';

import { CelebrationBurst } from '@/animations/CelebrationBurst';
import { useTheme } from '@/design-system/useTheme';
import type { StarDefinition } from '@/types/content';

import { Dialog } from './ui/Dialog';
import { Emoji } from './ui/Emoji';
import { StarIcon } from './ui/StarIcon';
import { Text } from './ui/Text';

export interface RewardDialogProps {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  message: string;
  xpGained?: number;
  newlyUnlockedStars?: StarDefinition[];
  /** A badge earned alongside XP — e.g. a story's completion badge. */
  badge?: { emoji: string; title: string };
  actionLabel?: string;
}

/** The shared "you earned something" celebration — used after a dua, quiz answer, story, or Star unlock. */
export function RewardDialog({
  visible,
  onRequestClose,
  title,
  message,
  xpGained,
  newlyUnlockedStars = [],
  badge,
  actionLabel = 'Awesome!',
}: RewardDialogProps) {
  const { theme } = useTheme();

  return (
    <Dialog
      visible={visible}
      onRequestClose={onRequestClose}
      title={title}
      message={message}
      icon={
        <View style={{ width: 90, height: 90, alignItems: 'center', justifyContent: 'center' }}>
          {visible && <CelebrationBurst burstKey={title} />}
          <StarIcon size={64} fill={1} />
        </View>
      }
      actions={[{ label: actionLabel, onPress: onRequestClose }]}
    >
      {(xpGained ?? 0) > 0 || newlyUnlockedStars.length > 0 || badge ? (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs, alignItems: 'center' }}>
          {(xpGained ?? 0) > 0 && (
            <Text variant="h3" color="brandStrong">
              {`+${xpGained} XP`}
            </Text>
          )}
          {badge && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                backgroundColor: theme.colors.brandSoft,
                borderRadius: theme.radii.full,
                paddingVertical: 6,
                paddingHorizontal: theme.spacing.md,
              }}
            >
              <Emoji size={20}>{badge.emoji}</Emoji>
              <Text variant="label" color="brandStrong">
                {badge.title}
              </Text>
            </View>
          )}
          {newlyUnlockedStars.map((star) => (
            <View key={star.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Emoji size={12}>⭐</Emoji>
              <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
                {`Star ${star.id} unlocked — ${star.name}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Dialog>
  );
}
