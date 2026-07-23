import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { RewardDialog } from '@/components/RewardDialog';
import { ActivityCard, type ActivityCardState } from '@/components/games/ActivityCard';
import { AppBar } from '@/components/ui/AppBar';
import { GeometricPatternBackground } from '@/components/ui/GeometricPatternBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { IMAM_ALI_HUB } from '@/data/games/imamAli';
import { useTheme } from '@/design-system/useTheme';
import { getCompletedActivityIds, useAppStore } from '@/hooks/useAppStore';

const { activities } = IMAM_ALI_HUB;

export function ImamAliHubScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const activityCompletions = useAppStore((s) => s.activityCompletions);
  const certificates = useAppStore((s) => s.certificates);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const completedIds = getCompletedActivityIds(activityCompletions, IMAM_ALI_HUB.id);
  const completedCount = completedIds.length;
  const allComplete = completedCount === activities.length;
  const certificateEarned = Boolean(certificates[IMAM_ALI_HUB.id]);

  function stateFor(index: number): ActivityCardState {
    const activity = activities[index];
    if (completedIds.includes(activity.id)) return 'completed';
    if (index === 0) return 'unlocked';
    const previous = activities[index - 1];
    return completedIds.includes(previous.id) ? 'unlocked' : 'locked';
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.night[900] }}>
      <GeometricPatternBackground color={theme.palette.star[400]} opacity={0.05} />

      <AppBar title={IMAM_ALI_HUB.title} large titleColor={theme.palette.neutral[50]} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 140, gap: theme.spacing.lg }}>
        <View>
          <Text variant="bodyLarge" style={{ color: theme.palette.night[200], marginBottom: theme.spacing.sm }}>
            {IMAM_ALI_HUB.subtitle}
          </Text>
          <ProgressBar
            progress={completedCount / activities.length}
            label={`${completedCount} of ${activities.length} activities complete`}
            color={theme.palette.star[400]}
            trackColor="rgba(255,255,255,0.1)"
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'space-between' }}>
          {activities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              index={index + 1}
              state={stateFor(index)}
              onPress={() => router.push(`/imam-ali/${activity.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      <RewardDialog
        visible={allComplete && !certificateEarned && !noticeDismissed}
        onRequestClose={() => setNoticeDismissed(true)}
        title="All 8 Activities Complete!"
        message="MashaAllah! You finished Imam Ali's journey. Your certificate is being prepared."
        actionLabel="Continue"
      />
    </View>
  );
}
