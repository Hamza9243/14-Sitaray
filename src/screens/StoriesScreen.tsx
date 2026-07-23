import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { StoryCard } from '@/components/stories/StoryCard';
import { AppBar } from '@/components/ui/AppBar';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StoryCardSkeleton } from '@/components/ui/Skeleton';
import { STORIES } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { getStoryProgress, getUnlockedStarIds, useAppStore } from '@/hooks/useAppStore';

export function StoriesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const xp = useAppStore((s) => s.xp);
  const completedStoryIds = useAppStore((s) => s.completedStoryIds);
  const storyProgress = useAppStore((s) => s.storyProgress);

  const unlockedStarIds = getUnlockedStarIds(xp);

  return (
    <View style={{ flex: 1 }}>
      <FloatingBackground variant="day" density="low" />

      <AppBar title="Stories" large onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        {hasHydrated && (
          <ProgressBar progress={completedStoryIds.length / STORIES.length} label="Stories finished" showPercentage />
        )}

        {!hasHydrated
          ? Array.from({ length: 3 }).map((_, index) => <StoryCardSkeleton key={index} />)
          : STORIES.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                progress={getStoryProgress(storyProgress, story.id)}
                locked={!unlockedStarIds.includes(story.relatedStarId)}
                onPress={() => router.push({ pathname: '/learn/stories/[storyId]', params: { storyId: story.id } })}
              />
            ))}
      </ScrollView>
    </View>
  );
}
