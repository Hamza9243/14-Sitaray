import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { StreakCalendarDialog } from '@/components/StreakCalendarDialog';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card, CardBadge } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { StarProgressRing } from '@/components/ui/StarProgressRing';
import { Text } from '@/components/ui/Text';
import { DUAS, QUIZ_QUESTIONS, STORIES } from '@/data';
import { TOTAL_STARS } from '@/data/stars';
import { useTheme } from '@/design-system/useTheme';
import { getUnlockedStarIds, useAppStore } from '@/hooks/useAppStore';

const STREAK_MILESTONES = [3, 7, 14, 30];

function useDailyMission() {
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const completedQuizIds = useAppStore((s) => s.completedQuizIds);
  const completedStoryIds = useAppStore((s) => s.completedStoryIds);

  return useMemo(() => {
    const nextDua = DUAS.find((d) => !completedDuaIds.includes(d.id));
    if (nextDua) {
      return { type: 'dua' as const, title: `Learn today's Dua: ${nextDua.title}`, xp: nextDua.xpReward, route: '/learn/duas' as const };
    }
    const nextQuiz = QUIZ_QUESTIONS.find((q) => !completedQuizIds.includes(q.id));
    if (nextQuiz) {
      return { type: 'quiz' as const, title: 'Answer today’s quiz question', xp: nextQuiz.xpReward, route: '/learn/quiz' as const };
    }
    const nextStory = STORIES.find((s) => !completedStoryIds.includes(s.id));
    if (nextStory) {
      return { type: 'story' as const, title: `Read: ${nextStory.title}`, xp: nextStory.xpReward, route: '/learn/stories' as const };
    }
    return null;
  }, [completedDuaIds, completedQuizIds, completedStoryIds]);
}

export function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const childName = useAppStore((s) => s.childName);
  const xp = useAppStore((s) => s.xp);
  const streakCount = useAppStore((s) => s.streakCount);
  const recordAppOpen = useAppStore((s) => s.recordAppOpen);
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const [streakCalendarVisible, setStreakCalendarVisible] = useState(false);

  const unlockedCount = getUnlockedStarIds(xp).length;
  const dailyMission = useDailyMission();
  const featuredStory = STORIES[0];

  useEffect(() => {
    const previousStreak = useAppStore.getState().streakCount;
    recordAppOpen();
    const newStreak = useAppStore.getState().streakCount;
    if (newStreak !== previousStreak && STREAK_MILESTONES.includes(newStreak)) {
      setStreakCelebration(newStreak);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FloatingBackground variant="night" density="high" />

      <AppBar
        title="14 STARS"
        large
        variant="transparent"
        titleColor={theme.colors.textInverse}
        trailing={
          <Pressable
            onPress={() => setStreakCalendarVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${streakCount} day streak, view calendar`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.full,
              paddingHorizontal: theme.spacing.sm,
              height: 40,
            }}
          >
            <Ionicons name="flame" size={18} color={theme.palette.blossom[500]} />
            <Text variant="title">{streakCount}</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg, paddingBottom: 140 }}>
        <Card variant="raised" style={{ alignItems: 'center' }}>
          <Text variant="bodyLarge" color="textSecondary">
            Assalamu Alaikum,
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm }}>
            <Text variant="h2">{childName}</Text>
            <Emoji size={20}>✨</Emoji>
          </View>
          <StarProgressRing current={unlockedCount} total={TOTAL_STARS} caption="Stars Unlocked" />
        </Card>

        {dailyMission && (
          <Card variant="raised" glowColor={theme.palette.star[600]}>
            <CardBadge label="Today's Mission" tone="brand" />
            <Text variant="title" style={{ marginTop: theme.spacing.xs }}>
              {dailyMission.title}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              {`+${dailyMission.xp} XP reward`}
            </Text>
            <Button
              label="Continue Learning"
              onPress={() => router.push(dailyMission.route)}
              fullWidth
              style={{ marginTop: theme.spacing.sm }}
            />
          </Card>
        )}

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <Text variant="h3" style={{ color: theme.colors.textInverse }}>
              Your Journey
            </Text>
            <Button label="See all" variant="ghost" size="sm" onPress={() => router.push('/stars')} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
            {Array.from({ length: TOTAL_STARS }).map((_, index) => {
              const starId = index + 1;
              const unlocked = starId <= unlockedCount;
              return (
                <View
                  key={starId}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: theme.radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: unlocked ? theme.colors.brand : 'rgba(255,255,255,0.12)',
                  }}
                >
                  {unlocked ? (
                    <Ionicons name="star" size={20} color={theme.colors.textOnBrand} />
                  ) : (
                    <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.6)" />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <Card variant="raised" onPress={() => router.push('/learn/stories')}>
          <CardBadge label="Featured Story" tone="info" />
          <Text variant="title" style={{ marginTop: theme.spacing.xs }}>
            {featuredStory.title}
          </Text>
          <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
            {featuredStory.summary}
          </Text>
        </Card>
      </ScrollView>

      <RewardDialog
        visible={streakCelebration !== null}
        onRequestClose={() => setStreakCelebration(null)}
        title={`${streakCelebration} Day Streak!`}
        message="You've opened 14 Stars every day. Keep it going!"
        actionLabel="Keep Going!"
      />

      <StreakCalendarDialog visible={streakCalendarVisible} onRequestClose={() => setStreakCalendarVisible(false)} />
    </View>
  );
}
