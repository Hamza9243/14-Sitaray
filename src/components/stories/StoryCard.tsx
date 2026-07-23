import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, CardBadge } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { getStoryProgressFraction, type StoryProgressEntry } from '@/hooks/useAppStore';
import type { Story, StoryDifficulty } from '@/types/content';

const DIFFICULTY_LABEL: Record<StoryDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_TONE: Record<StoryDifficulty, 'success' | 'info' | 'brand'> = { easy: 'success', medium: 'info', hard: 'brand' };

export interface StoryCardProps {
  story: Story;
  progress: StoryProgressEntry;
  locked: boolean;
  onPress: () => void;
}

/** A premium storybook tile: cover illustration, difficulty + time, resumable progress, and a lock state. */
export function StoryCard({ story, progress, locked, onPress }: StoryCardProps) {
  const { theme } = useTheme();
  const completed = progress.completedAt !== null;
  const fraction = getStoryProgressFraction(story.pages.length, progress);
  const started = fraction > 0 && !completed;
  const ctaLabel = completed ? 'Read Again' : started ? 'Continue Reading' : 'Start Story';

  return (
    <Card variant="raised" padding="xs" onPress={locked ? undefined : onPress} glowColor={completed ? theme.palette.star[500] : undefined}>
      <View>
        <LinearGradient
          colors={story.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: theme.radii.md, height: 132, alignItems: 'center', justifyContent: 'center' }}
        >
          <Emoji size={56}>{story.coverEmoji}</Emoji>
        </LinearGradient>

        <View style={{ position: 'absolute', top: theme.spacing.xs, left: theme.spacing.xs }}>
          <CardBadge label={DIFFICULTY_LABEL[story.difficulty]} tone={DIFFICULTY_TONE[story.difficulty]} />
        </View>

        {completed && !locked && (
          <View style={{ position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs }}>
            <Ionicons name="checkmark-circle" size={26} color="#fff" />
          </View>
        )}

        {locked && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.overlay,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={26} color={theme.colors.textInverse} />
          </View>
        )}
      </View>

      <View style={{ padding: theme.spacing.sm, paddingBottom: theme.spacing.xs, gap: 6 }}>
        <Text variant="title" numberOfLines={1}>
          {story.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text variant="caption" color="textSecondary">
            {`${story.minutes} min read`}
          </Text>
        </View>

        <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
          {story.summary}
        </Text>

        {locked ? (
          <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
            {`Unlock Star ${story.relatedStarId} to read this story`}
          </Text>
        ) : (
          <>
            {fraction > 0 && <ProgressBar progress={fraction} height={8} />}
            <Button
              label={ctaLabel}
              onPress={onPress}
              fullWidth
              size="sm"
              variant={completed ? 'secondary' : 'primary'}
              style={{ marginTop: theme.spacing.xs }}
            />
          </>
        )}
      </View>
    </Card>
  );
}
