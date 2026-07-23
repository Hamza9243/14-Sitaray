import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActivityShell } from '@/components/games/ActivityShell';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { IMAM_ALI_HUB } from '@/data/games/imamAli';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

const { activities } = IMAM_ALI_HUB;

/**
 * Hosts one Imam Ali activity inside the shared `ActivityShell`. Currently
 * every activity renders a placeholder body — the real mini-games (quiz,
 * scale, wheel, etc.) get built one at a time next, each simply replacing
 * this placeholder `children` for its own id.
 */
export function ImamAliActivityScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const completeActivity = useAppStore((s) => s.completeActivity);

  const [showCompletion, setShowCompletion] = useState(false);

  const activityIndex = activities.findIndex((a) => a.id === activityId);
  const activity = activities[activityIndex];

  if (!activity) {
    return null;
  }

  function handlePlaceholderComplete(score: number) {
    completeActivity(IMAM_ALI_HUB.id, activity.id, score);
    setShowCompletion(true);
  }

  return (
    <ActivityShell
      activity={activity}
      activityIndex={activityIndex + 1}
      totalActivities={activities.length}
      showCompletion={showCompletion}
      onExit={() => router.back()}
      onContinueAfterCompletion={() => router.back()}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text variant="h3" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
          This activity is being built next
        </Text>
        <Text variant="body" style={{ color: theme.palette.night[200], textAlign: 'center' }}>
          The real mini-game goes here. This placeholder lets us test the shell — intro, exit, and completion — right
          now.
        </Text>
        <Button label="Mark Complete (test)" onPress={() => handlePlaceholderComplete(100)} style={{ marginTop: theme.spacing.md }} />
      </View>
    </ActivityShell>
  );
}
