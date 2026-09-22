import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { StarGameStage } from '@/components/games/StarGameStage';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { getNewlyUnlockedStars, useAppStore } from '@/hooks/useAppStore';
import type { StarDefinition } from '@/types/content';
import type { StarGameDefinition } from '@/types/games';

interface Outcome {
  xpGained: number;
  alreadyDone: boolean;
  stars: StarDefinition[];
}

export interface GameHostProps {
  game: StarGameDefinition;
  /** Key in completedGameIds — XP is awarded once per key. */
  gameId: string;
  eyebrow?: string;
}

/** Start card -> playable stage -> one reward (exactly once per game), shared by the Star games and CMS games. */
export function GameHost({ game, gameId, eyebrow }: GameHostProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const completedGameIds = useAppStore((s) => s.completedGameIds);
  const completeStarGame = useAppStore((s) => s.completeStarGame);

  const [started, setStarted] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const rewardedRef = useRef(false);

  const alreadyCompleted = completedGameIds.includes(gameId);

  function handleComplete() {
    if (rewardedRef.current) return;
    rewardedRef.current = true;
    const previousXp = useAppStore.getState().xp;
    const { xpGained, alreadyDone } = completeStarGame(gameId, game.xpReward);
    const newXp = useAppStore.getState().xp;
    setOutcome({ xpGained, alreadyDone, stars: getNewlyUnlockedStars(previousXp, newXp) });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />
      <AppBar title={game.title} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 140, gap: theme.spacing.md }}>
        {!started ? (
          <Card variant="raised" style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Emoji size={64}>{game.icon}</Emoji>
            {eyebrow ? (
              <Text variant="label" color="brandStrong">
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
              {game.intro}
            </Text>
            <Text variant="caption" color="textSecondary">
              {alreadyCompleted ? 'Completed — replay any time for practice.' : `Finish to earn +${game.xpReward} XP`}
            </Text>
            <Button label="Start" size="lg" onPress={() => setStarted(true)} style={{ marginTop: theme.spacing.sm }} />
          </Card>
        ) : (
          <StarGameStage game={game} onComplete={handleComplete} />
        )}
      </ScrollView>

      <RewardDialog
        visible={outcome !== null}
        onRequestClose={() => router.back()}
        title={outcome?.alreadyDone ? 'Great Practice!' : game.badgeTitle}
        message={outcome?.alreadyDone ? `You already earned this one — ${game.closing}` : game.closing}
        xpGained={outcome && !outcome.alreadyDone ? outcome.xpGained : undefined}
        newlyUnlockedStars={outcome?.stars}
        badge={outcome && !outcome.alreadyDone ? { emoji: game.icon, title: game.badgeTitle } : undefined}
        actionLabel="Continue"
      />
    </View>
  );
}
