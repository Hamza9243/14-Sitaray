import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ACHIEVEMENTS } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { getEarnedAchievementIds, useAppStore } from '@/hooks/useAppStore';

export function RewardsScreen() {
  const { theme } = useTheme();
  const xp = useAppStore((s) => s.xp);
  const streakCount = useAppStore((s) => s.streakCount);
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const completedQuizIds = useAppStore((s) => s.completedQuizIds);
  const completedStoryIds = useAppStore((s) => s.completedStoryIds);
  const completedGameIds = useAppStore((s) => s.completedGameIds);

  const earnedIds = getEarnedAchievementIds({
    xp,
    streakCount,
    completedDuaIds,
    completedQuizIds,
    completedStoryIds,
    completedGameIds,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Rewards" large />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 140 }}>
        <Text variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.md }}>
          {`${earnedIds.length} of ${ACHIEVEMENTS.length} achievements earned`}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'space-between' }}>
          {ACHIEVEMENTS.map((achievement) => {
            const earned = earnedIds.includes(achievement.id);
            return (
              <Card
                key={achievement.id}
                variant={earned ? 'raised' : 'outline'}
                style={{ width: '47%', opacity: earned ? 1 : 0.55 }}
                glowColor={earned ? theme.palette.star[600] : undefined}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: theme.radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: earned ? theme.colors.brandSoft : theme.colors.surfaceSunken,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  <Ionicons
                    name={(earned ? achievement.icon : `${achievement.icon}-outline`) as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={earned ? theme.colors.brandStrong : theme.colors.textSecondary}
                  />
                </View>
                <Text variant="label">{achievement.title}</Text>
                <Text variant="caption" color="textSecondary">
                  {achievement.description}
                </Text>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
