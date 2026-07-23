import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { AppBar } from '@/components/ui/AppBar';
import { CharacterCard } from '@/components/ui/CharacterCard';
import { Dialog } from '@/components/ui/Dialog';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { IMAM_ALI_HUB } from '@/data/games/imamAli';
import { KINDNESS_MISSIONS, KINDNESS_MISSIONS_GAME_ID } from '@/data/games/kindnessMissions';
import { STARS, TOTAL_STARS } from '@/data/stars';
import { useTheme } from '@/design-system/useTheme';
import { getCompletedActivityIds, getUnlockedStarIds, useAppStore } from '@/hooks/useAppStore';
import type { StarDefinition } from '@/types/content';

export function StarsCollectionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const xp = useAppStore((s) => s.xp);
  const completedGameIds = useAppStore((s) => s.completedGameIds);
  const activityCompletions = useAppStore((s) => s.activityCompletions);
  const journeyCelebrationShown = useAppStore((s) => s.journeyCelebrationShown);
  const markJourneyCelebrationShown = useAppStore((s) => s.markJourneyCelebrationShown);
  const [selectedStar, setSelectedStar] = useState<StarDefinition | null>(null);

  const unlockedIds = getUnlockedStarIds(xp);
  const unlockedCount = unlockedIds.length;
  const journeyComplete = unlockedCount === TOTAL_STARS;
  const selectedUnlocked = selectedStar ? unlockedIds.includes(selectedStar.id) : false;
  const showCompletionCelebration = journeyComplete && !journeyCelebrationShown;

  const availableGame = selectedStar && selectedUnlocked && selectedStar.id === KINDNESS_MISSIONS.starId ? KINDNESS_MISSIONS : null;
  const gameCompleted = availableGame ? completedGameIds.includes(KINDNESS_MISSIONS_GAME_ID) : false;

  const availableHub = selectedStar && selectedUnlocked && selectedStar.id === IMAM_ALI_HUB.starId ? IMAM_ALI_HUB : null;
  const hubCompletedCount = availableHub ? getCompletedActivityIds(activityCompletions, availableHub.id).length : 0;

  useEffect(() => {
    if (showCompletionCelebration) {
      setSelectedStar(null);
    }
  }, [showCompletionCelebration]);

  return (
    <View style={{ flex: 1 }}>
      <FloatingBackground variant="night" density="medium" />

      <AppBar title="14 Stars" large titleColor={theme.colors.textInverse} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 140, gap: theme.spacing.md }}>
        <View
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="title">{`${unlockedCount} out of ${TOTAL_STARS} Stars unlocked`}</Text>
            <Emoji size={18}>⭐</Emoji>
          </View>
          <View style={{ marginTop: theme.spacing.sm }}>
            <ProgressBar progress={unlockedCount / TOTAL_STARS} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'space-between' }}>
          {STARS.map((star) => {
            const unlocked = unlockedIds.includes(star.id);
            return (
              <CharacterCard
                key={star.id}
                title={star.name}
                subtitle={star.lessonTitle}
                badgeLabel={unlocked ? `Star ${star.id}` : undefined}
                locked={!unlocked}
                onPress={() => setSelectedStar(star)}
              />
            );
          })}
        </View>
      </ScrollView>

      <Dialog
        visible={selectedStar !== null}
        onRequestClose={() => setSelectedStar(null)}
        title={selectedStar ? `Star ${selectedStar.id} · ${selectedStar.name}` : undefined}
        actions={
          availableGame
            ? [
                {
                  label: gameCompleted ? `Play ${availableGame.title} Again` : `Play ${availableGame.title}`,
                  onPress: () => {
                    setSelectedStar(null);
                    router.push('/games/kindness-missions');
                  },
                },
                { label: 'Close', onPress: () => setSelectedStar(null), variant: 'secondary' },
              ]
            : availableHub
              ? [
                  {
                    label: hubCompletedCount > 0 ? `Continue ${availableHub.title}` : `Start ${availableHub.title}`,
                    onPress: () => {
                      setSelectedStar(null);
                      router.push('/imam-ali');
                    },
                  },
                  { label: 'Close', onPress: () => setSelectedStar(null), variant: 'secondary' },
                ]
              : [{ label: 'Close', onPress: () => setSelectedStar(null), variant: 'secondary' }]
        }
      >
        {selectedStar && (
          <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
            <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              {selectedStar.honorific}
            </Text>
            <Text variant="label" color="brandStrong" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              {selectedStar.lessonTitle.toUpperCase()}
            </Text>
            <Text variant="body" style={{ textAlign: 'center' }}>
              {selectedStar.lessonSummary}
            </Text>
            <View
              style={{
                marginTop: theme.spacing.sm,
                backgroundColor: selectedUnlocked ? theme.colors.successSurface : theme.colors.surfaceSunken,
                borderRadius: theme.radii.md,
                padding: theme.spacing.sm,
              }}
            >
              <Text variant="bodySmall" color={selectedUnlocked ? 'success' : 'textSecondary'} style={{ textAlign: 'center' }}>
                {selectedUnlocked ? `Unlocked · ${selectedStar.rewardLabel}` : `Locked · ${selectedStar.unlockRequirement}`}
              </Text>
            </View>

            {availableGame && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: theme.spacing.xs }}>
                <Emoji size={14}>🎮</Emoji>
                <Text variant="caption" color="brandStrong" style={{ textAlign: 'center' }}>
                  {gameCompleted ? `${availableGame.title} completed!` : `${availableGame.title} available!`}
                </Text>
              </View>
            )}

            {availableHub && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: theme.spacing.xs }}>
                <Emoji size={14}>🎮</Emoji>
                <Text variant="caption" color="brandStrong" style={{ textAlign: 'center' }}>
                  {`${hubCompletedCount} of ${availableHub.activities.length} activities complete`}
                </Text>
              </View>
            )}
          </View>
        )}
      </Dialog>

      <RewardDialog
        visible={showCompletionCelebration}
        onRequestClose={markJourneyCelebrationShown}
        title="Journey Complete!"
        message="You unlocked all 14 Stars and finished the full 14 Stars journey. MashaAllah!"
        actionLabel="Amazing!"
      />
    </View>
  );
}
