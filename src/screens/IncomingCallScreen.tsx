import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { Text } from '@/components/ui/Text';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { CHARACTERS, REMINDER_ACTIVITY_ROUTES } from '@/data/characters';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';
import { useCharacterAudio } from '@/lib/characterAudio';
import { cancelReminderCall } from '@/lib/reminderScheduler';

type CallStage = 'ringing' | 'connecting' | 'done';

/**
 * The fake incoming-call experience — a full-screen route (not a Dialog) so it reads as
 * its own moment, matches how a real notification tap or foreground trigger hands off into
 * the app, and survives back-navigation cleanly. Reachable at /incoming-call/:reminderId.
 */
export function IncomingCallScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const reminders = useAppStore((s) => s.reminders);
  const setReminderStatus = useAppStore((s) => s.setReminderStatus);
  const { play } = useCharacterAudio();

  const reminder = reminders.find((r) => r.id === Number(reminderId));
  const character = CHARACTERS[reminder?.character ?? 'ali'];

  const [stage, setStage] = useState<CallStage>('ringing');
  const [caption, setCaption] = useState<string | null>(null);
  const actedRef = useRef(false); // guards against double-tap / tapping Receive while already connecting

  useEffect(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Target no longer exists (reminder deleted, bad id, etc.) — fail gracefully, no crash.
  if (!reminderId || !reminder) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
        <Text variant="title" color="textSecondary" style={{ textAlign: 'center' }}>
          This call has already ended.
        </Text>
        <AnimatedPressable onPress={() => router.replace('/')} style={{ marginTop: theme.spacing.lg }}>
          <Text variant="button" color="brand">
            Back to Home
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  function handleDecline() {
    if (actedRef.current) return;
    actedRef.current = true;
    setReminderStatus(reminder!.id, 'dismissed');
    cancelReminderCall(reminder!.id).catch(() => {});
    router.replace('/');
  }

  async function handleReceive() {
    if (actedRef.current) return;
    actedRef.current = true;
    setStage('connecting');
    setCaption(character.dialogueByType[reminder!.type]);

    // Audio failure (missing file, playback error, timeout) must never block navigation —
    // useCharacterAudio's play() always resolves, never rejects.
    await play(character.audio[reminder!.type]);

    setStage('done');
    setReminderStatus(reminder!.id, 'completed');
    router.replace(REMINDER_ACTIVITY_ROUTES[reminder!.type]);
  }

  return (
    <LinearGradient colors={theme.gradients.nightSky} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.lg }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xl }}>
          <Text variant="label" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 2 }}>
            {stage === 'ringing' ? 'INCOMING CALL' : 'CONNECTED'}
          </Text>
          <Text variant="display" style={{ color: theme.colors.textInverse }}>
            {character.name}
          </Text>
          <Text variant="body" style={{ color: 'rgba(255,255,255,0.7)' }}>
            14 Stars
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: theme.spacing.lg, flex: 1, justifyContent: 'center' }}>
          <CharacterAvatar character={character} size={150} ringing={stage === 'ringing'} />

          {caption ? (
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.textInverse, textAlign: 'center', maxWidth: 320 }}
            >
              {caption}
            </Text>
          ) : null}
        </View>

        {stage === 'ringing' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: theme.spacing.lg }}>
            <CallButton
              label="Decline"
              icon="close"
              backgroundColor={theme.colors.danger}
              onPress={handleDecline}
            />
            <CallButton
              label="Receive"
              icon="call"
              backgroundColor={theme.colors.success}
              onPress={handleReceive}
            />
          </View>
        ) : (
          <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {stage === 'connecting' ? 'Say hi back!' : 'See you soon!'}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

function CallButton({
  label,
  icon,
  backgroundColor,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
      <AnimatedPressable
        onPress={onPress}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: 76,
          height: 76,
          borderRadius: theme.radii.full,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadow('lg'),
        }}
      >
        <Ionicons name={icon} size={32} color="#FFFFFF" />
      </AnimatedPressable>
      <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {label}
      </Text>
    </View>
  );
}
