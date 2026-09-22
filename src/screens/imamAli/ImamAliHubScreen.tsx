import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ActivityCard, type ActivityCardState } from '@/components/games/ActivityCard';
import { AppBar } from '@/components/ui/AppBar';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ArabicText } from '@/components/ui/ArabicText';
import { Dialog } from '@/components/ui/Dialog';
import { Emoji } from '@/components/ui/Emoji';
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
  const [certificateOpen, setCertificateOpen] = useState(false);

  const completedIds = getCompletedActivityIds(activityCompletions, IMAM_ALI_HUB.id);
  const completedCount = completedIds.length;
  const certificate = certificates[IMAM_ALI_HUB.id];

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

        {certificate && (
          <AnimatedPressable
            onPress={() => setCertificateOpen(true)}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="View your certificate"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
              borderRadius: theme.radii.lg,
              borderWidth: 2,
              borderColor: theme.palette.star[400],
              backgroundColor: 'rgba(255, 197, 38, 0.12)',
            }}
          >
            <Emoji size={32}>🎓</Emoji>
            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ color: theme.palette.neutral[50] }}>
                Your Certificate
              </Text>
              <Text variant="bodySmall" style={{ color: theme.palette.night[200] }}>
                All 8 activities complete — tap to view
              </Text>
            </View>
          </AnimatedPressable>
        )}

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

      <Dialog
        visible={certificateOpen && Boolean(certificate)}
        onRequestClose={() => setCertificateOpen(false)}
        title="Certificate of Completion"
        actions={[{ label: 'Close', onPress: () => setCertificateOpen(false) }]}
      >
        {certificate && (
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Emoji size={44}>🎓</Emoji>
            <Text variant="caption" color="textSecondary">
              This certifies that
            </Text>
            <Text variant="h2" style={{ textAlign: 'center' }}>
              {certificate.childName}
            </Text>
            <Text variant="body" style={{ textAlign: 'center' }}>
              completed all 8 activities of the {IMAM_ALI_HUB.title} journey.
            </Text>
            <Text variant="bodySmall" color="brandStrong" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              {IMAM_ALI_HUB.certificateSaying.english}
            </Text>
            {IMAM_ALI_HUB.certificateSaying.urdu ? (
              <ArabicText size={18} color="textSecondary">
                {IMAM_ALI_HUB.certificateSaying.urdu}
              </ArabicText>
            ) : null}
            <Text variant="caption" color="textSecondary">
              {IMAM_ALI_HUB.certificateSaying.attribution}
            </Text>
            <Text variant="caption" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
              {new Date(certificate.earnedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </Dialog>
    </View>
  );
}
