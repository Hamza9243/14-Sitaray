import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { CelebrationBurst } from '@/animations/CelebrationBurst';
import { MissionStage } from '@/components/games/MissionStage';
import { MissionScene } from '@/components/games/MissionScene';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { StarIcon } from '@/components/ui/StarIcon';
import { Text } from '@/components/ui/Text';
import { KINDNESS_MISSIONS, KINDNESS_MISSIONS_GAME_ID } from '@/data/games/kindnessMissions';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

const { missions, badgeTitle, badgeDescription } = KINDNESS_MISSIONS;

const missionKey = (missionId: string) => `${KINDNESS_MISSIONS_GAME_ID}:${missionId}`;

export function KindnessMissionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const completeMission = useAppStore((s) => s.completeMission);
  const completeGame = useAppStore((s) => s.completeGame);

  // Resume at the first mission not yet completed; a fully-completed game replays from the start (no XP).
  const [missionIndex, setMissionIndex] = useState(() => {
    const done = useAppStore.getState().completedMissionIds;
    const firstOpen = missions.findIndex((m) => !done.includes(missionKey(m.id)));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [xpEarnedNow, setXpEarnedNow] = useState(0);
  const [celebratingMission, setCelebratingMission] = useState<{ xp: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const handledMissionRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const mission = missions[missionIndex];

  function handleMissionComplete() {
    // Guards against a double-fired completion (double tap / duplicate drop events) for the same mission.
    if (handledMissionRef.current === mission.id) return;
    handledMissionRef.current = mission.id;

    const { xpGained } = completeMission(KINDNESS_MISSIONS_GAME_ID, mission.id, mission.xpReward);
    setXpEarnedNow((total) => total + xpGained);
    setCelebratingMission({ xp: xpGained });

    timerRef.current = setTimeout(() => {
      setCelebratingMission(null);
      if (missionIndex + 1 >= missions.length) {
        const doneIds = useAppStore.getState().completedMissionIds;
        if (missions.every((m) => doneIds.includes(missionKey(m.id)))) {
          completeGame(KINDNESS_MISSIONS_GAME_ID);
        }
        setFinished(true);
      } else {
        setMissionIndex((i) => i + 1);
      }
    }, 1100);
  }

  if (finished) {
    return <GameCompleteScreen xpEarned={xpEarnedNow} onDone={() => router.back()} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <MissionScene
        missionNumber={missionIndex + 1}
        totalMissions={missions.length}
        starsEarned={xpEarnedNow}
        characterEmoji={mission.characterEmoji}
        prompt={mission.prompt}
        onExit={() => router.back()}
      >
        <MissionStage key={mission.id} mission={mission} onComplete={handleMissionComplete} />

        {celebratingMission !== null && (
          <View style={{ position: 'absolute', top: '35%', alignItems: 'center' }} pointerEvents="none">
            <CelebrationBurst burstKey={mission.id} />
            <StarIcon size={56} fill={1} />
            <Text variant="h3" color="brandStrong" style={{ marginTop: theme.spacing.xs }}>
              {celebratingMission.xp > 0 ? `+${celebratingMission.xp}!` : 'Well done!'}
            </Text>
          </View>
        )}
      </MissionScene>
    </View>
  );
}

function GameCompleteScreen({ xpEarned, onDone }: { xpEarned: number; onDone: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
      <FloatingBackground variant="night" density="high" />

      <View style={{ position: 'relative', alignItems: 'center' }}>
        <CelebrationBurst burstKey="game-complete" />
        <StarIcon size={80} fill={1} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.md }}>
        <Emoji size={32}>🎉</Emoji>
        <Text variant="display" style={{ color: theme.colors.textInverse, textAlign: 'center' }}>
          Congratulations!
        </Text>
      </View>
      <Text variant="bodyLarge" style={{ color: theme.colors.textInverse, textAlign: 'center', marginTop: theme.spacing.xs }}>
        You completed all Kindness Missions.
      </Text>

      <Card variant="raised" style={{ marginTop: theme.spacing.xl, alignItems: 'center', width: '100%' }}>
        <Emoji size={48}>🏅</Emoji>
        <Text variant="h3" style={{ marginTop: theme.spacing.xs }}>
          {badgeTitle}
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
          {badgeDescription}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.brandSoft,
            borderRadius: theme.radii.full,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <StarIcon size={18} fill={1} />
          <Text variant="title" color="brandStrong">
            {xpEarned > 0 ? `+${xpEarned} XP` : 'Already earned — great replay!'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.md }}>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            Prophet Muhammad (SAWW) Card unlocked
          </Text>
          <Emoji size={14}>✨</Emoji>
        </View>

        <Button label="Continue" onPress={onDone} fullWidth style={{ marginTop: theme.spacing.lg }} />
      </Card>
    </View>
  );
}
