import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationBurst } from '@/animations/CelebrationBurst';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Emoji } from '@/components/ui/Emoji';
import { GeometricPatternBackground } from '@/components/ui/GeometricPatternBackground';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { ActivityDefinition } from '@/types/games';

export interface ActivityShellProps {
  activity: ActivityDefinition;
  activityIndex: number;
  totalActivities: number;
  /** True once the activity inside has called its onComplete — shows the completion celebration. */
  showCompletion: boolean;
  onExit: () => void;
  onContinueAfterCompletion: () => void;
  children: ReactNode;
}

/**
 * The shared shell every Imam Ali activity mounts inside: an intro card
 * (icon, title, description, Start button), the activity's own content as
 * `children` once started, and a completion celebration overlay. No named
 * guide characters — matches the app's existing plain icon+prompt style
 * (see MissionScene in the Kindness Missions game).
 */
export function ActivityShell({
  activity,
  activityIndex,
  totalActivities,
  showCompletion,
  onExit,
  onContinueAfterCompletion,
  children,
}: ActivityShellProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.night[900] }}>
      <GeometricPatternBackground color={theme.palette.star[400]} opacity={0.06} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.xs,
        }}
      >
        <AnimatedPressable
          onPress={onExit}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Exit activity"
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radii.full,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={18} color={theme.palette.neutral[100]} />
        </AnimatedPressable>
        <Text variant="label" style={{ color: theme.palette.night[200] }}>
          {`ACTIVITY ${activityIndex} OF ${totalActivities}`}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {!started ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: theme.radii.full,
              backgroundColor: 'rgba(255, 197, 38, 0.12)',
              borderWidth: 2,
              borderColor: theme.palette.star[400],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Emoji size={56}>{activity.icon}</Emoji>
          </View>

          <Text variant="h2" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
            {activity.title}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.palette.night[200], textAlign: 'center' }}>
            {activity.description}
          </Text>

          <Button label="Start" size="lg" onPress={() => setStarted(true)} style={{ marginTop: theme.spacing.md }} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}

      {showCompletion && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 11, 36, 0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <CelebrationBurst burstKey={`${activity.id}-complete`} />
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.successSurface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
            }}
          >
            <Ionicons name="checkmark" size={48} color={theme.colors.success} />
          </View>
          <Text variant="h2" style={{ color: theme.palette.neutral[50], textAlign: 'center' }}>
            Activity Complete!
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.palette.night[200], textAlign: 'center', marginTop: theme.spacing.xs }}>
            {activity.title}
          </Text>
          <Button label="Continue" size="lg" onPress={onContinueAfterCompletion} style={{ marginTop: theme.spacing.xl }} />
        </View>
      )}
    </View>
  );
}
