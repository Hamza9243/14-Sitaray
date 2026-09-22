import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ActivityShell } from '@/components/games/ActivityShell';
import { IMAM_ALI_ACTIVITY_COMPONENTS } from '@/components/games/imamAli';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { IMAM_ALI_HUB } from '@/data/games/imamAli';
import { useTheme } from '@/design-system/useTheme';
import { getCompletedActivityIds, useAppStore } from '@/hooks/useAppStore';

const { activities } = IMAM_ALI_HUB;

/**
 * Hosts one Imam Ali activity inside the shared `ActivityShell`. Completion, XP (once per activity)
 * and the hub certificate (once all 8 are done) are all handled by the store's `completeActivity`.
 */
export function ImamAliActivityScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const completeActivity = useAppStore((s) => s.completeActivity);
  const activityCompletions = useAppStore((s) => s.activityCompletions);

  const [result, setResult] = useState<{ xpGained: number; certificateEarned: boolean } | null>(null);
  const completedRef = useRef(false);

  const activityIndex = activities.findIndex((a) => a.id === activityId);
  const activity = activities[activityIndex];
  const ActivityComponent = activity ? IMAM_ALI_ACTIVITY_COMPONENTS[activity.id] : undefined;

  const completedIds = getCompletedActivityIds(activityCompletions, IMAM_ALI_HUB.id);
  const unlocked = activityIndex === 0 || (activityIndex > 0 && completedIds.includes(activities[activityIndex - 1].id));

  if (!activity || !ActivityComponent || (!unlocked && !result)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
          backgroundColor: theme.palette.night[900],
        }}
      >
        <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
          {activity ? 'Finish the earlier activities to unlock this one.' : 'This activity is not available.'}
        </Text>
        <Button label="Back" onPress={() => router.replace('/imam-ali')} />
      </View>
    );
  }

  function handleComplete(score: number) {
    if (completedRef.current) return;
    completedRef.current = true;
    const { xpGained, certificateEarned } = completeActivity(IMAM_ALI_HUB.id, activity.id, Math.round(score));
    setResult({ xpGained, certificateEarned });
  }

  return (
    <ActivityShell
      activity={activity}
      activityIndex={activityIndex + 1}
      totalActivities={activities.length}
      showCompletion={result !== null}
      completionXp={result?.xpGained}
      certificateEarned={result?.certificateEarned}
      onExit={() => router.back()}
      onContinueAfterCompletion={() => router.back()}
    >
      <ActivityComponent onComplete={handleComplete} onExit={() => router.back()} />
    </ActivityShell>
  );
}
