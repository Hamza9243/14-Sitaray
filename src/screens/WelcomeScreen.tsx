import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type CSSProperties, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { Text } from '@/components/ui/Text';
import {
  characterForGender,
  REMINDER_ACTIVITY_LABELS,
  REMINDER_ACTIVITY_TYPES,
  type ReminderActivityType,
} from '@/data/characters';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';
import { ensureReminderPermissions, scheduleReminderCall } from '@/lib/reminderScheduler';
import { formatClock, nextOccurrence } from '@/lib/time';

const MIN_AGE = 3;
const MAX_AGE = 14;

/**
 * First-run profile setup (there is no server/account — this is a local, on-device profile):
 * the child's name, age and gender (which picks the Ali/Sakina caller), plus the time of a daily
 * character call. Everything lands in the same store the Profile and Reminders screens use.
 */
export function WelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const addReminder = useAppStore((s) => s.addReminder);

  const [name, setName] = useState('');
  const [age, setAge] = useState(7);
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [callEnabled, setCallEnabled] = useState(true);
  const [callTime, setCallTime] = useState('17:00');
  const [activity, setActivity] = useState<ReminderActivityType>('learning');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const character = characterForGender(gender);
  const nameMissing = name.trim().length === 0;
  const genderMissing = gender === null;

  async function handleStart() {
    if (saving) return;
    if (nameMissing || genderMissing) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    completeOnboarding({ name, age, gender });

    if (callEnabled && callTime) {
      const created = addReminder({
        type: activity,
        title: REMINDER_ACTIVITY_LABELS[activity],
        scheduledAt: nextOccurrence(callTime).toISOString(),
        daily: true,
      });
      try {
        const result = await ensureReminderPermissions();
        if (result.granted) await scheduleReminderCall(created);
      } catch {
        // Calls can be re-enabled later from Profile → Character Call Reminders.
      }
    }
    router.replace('/');
  }

  function handleSkip() {
    completeOnboarding({ name: '', age: null, gender: null });
    router.replace('/');
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="night" density="medium" />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <Emoji size={56}>⭐</Emoji>
          <Text variant="display" style={{ color: theme.colors.textInverse, textAlign: 'center' }}>
            Welcome to 14 Stars
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.textInverse, textAlign: 'center' }}>
            Tell us about your little star.
          </Text>
        </View>

        <Card variant="raised">
          <Text variant="label" color="textSecondary">
            CHILD’S NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            maxLength={20}
            accessibilityLabel="Child's name"
            style={{
              marginTop: theme.spacing.xs,
              borderWidth: 2,
              borderColor: showErrors && nameMissing ? theme.colors.danger : theme.colors.border,
              borderRadius: theme.radii.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              fontFamily: theme.fontFamily.body,
              fontSize: 16,
              color: theme.colors.textPrimary,
            }}
          />
          {showErrors && nameMissing ? (
            <Text variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xxs }}>
              Please enter a name.
            </Text>
          ) : null}

          <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
            AGE
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.xs }}>
            <StepButton icon="remove" label="Younger" disabled={age <= MIN_AGE} onPress={() => setAge((a) => Math.max(MIN_AGE, a - 1))} />
            <View style={{ alignItems: 'center', minWidth: 72 }}>
              <Text variant="display">{age}</Text>
              <Text variant="caption" color="textSecondary">
                years old
              </Text>
            </View>
            <StepButton icon="add" label="Older" disabled={age >= MAX_AGE} onPress={() => setAge((a) => Math.min(MAX_AGE, a + 1))} />
          </View>

          <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }}>
            I AM A
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Pill label="Boy" emoji="👦" active={gender === 'boy'} onPress={() => setGender('boy')} />
            <Pill label="Girl" emoji="👧" active={gender === 'girl'} onPress={() => setGender('girl')} />
          </View>
          {showErrors && genderMissing ? (
            <Text variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xxs }}>
              Please choose Boy or Girl.
            </Text>
          ) : null}
        </Card>

        <Card variant="raised">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="title">Daily call time</Text>
              <Text variant="bodySmall" color="textSecondary">
                A friendly call to remind you to learn.
              </Text>
            </View>
            <AnimatedPressable
              onPress={() => setCallEnabled((v) => !v)}
              accessibilityRole="switch"
              accessibilityLabel="Daily call"
              accessibilityState={{ checked: callEnabled }}
            >
              <Ionicons name={callEnabled ? 'toggle' : 'toggle-outline'} size={44} color={callEnabled ? theme.colors.brand : theme.colors.textSecondary} />
            </AnimatedPressable>
          </View>

          {callEnabled ? (
            <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
              <input
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                aria-label="Call time"
                style={inputStyle(theme)}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {REMINDER_ACTIVITY_TYPES.map((type) => (
                  <View key={type} style={{ width: '48%' }}>
                    <Pill label={REMINDER_ACTIVITY_LABELS[type]} active={activity === type} onPress={() => setActivity(type)} small />
                  </View>
                ))}
              </View>
              <View style={{ backgroundColor: theme.colors.brandSoft, borderRadius: theme.radii.md, padding: theme.spacing.sm }}>
                <Text variant="bodySmall" color="brandStrong" style={{ textAlign: 'center' }}>
                  {callTime
                    ? `${character.name} will call ${name.trim() || 'you'} every day at ${formatClock(callTime)}.`
                    : 'Pick a time for the daily call.'}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Button label="Start My Journey" size="lg" onPress={handleStart} loading={saving} fullWidth />
        <AnimatedPressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip for now" style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
          <Text variant="button" style={{ color: theme.colors.textInverse }}>
            Skip for now
          </Text>
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

function Pill({
  label,
  emoji,
  active,
  onPress,
  small,
}: {
  label: string;
  emoji?: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        flex: small ? undefined : 1,
        paddingVertical: small ? theme.spacing.xs : theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSunken,
      }}
    >
      {emoji ? <Emoji size={20}>{emoji}</Emoji> : null}
      <Text variant={small ? 'bodySmall' : 'button'} style={{ color: active ? theme.colors.textOnBrand : theme.colors.textSecondary, textAlign: 'center' }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: theme.radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.brandSoft,
      }}
    >
      <Ionicons name={icon} size={26} color={disabled ? theme.colors.textSecondary : theme.colors.brandStrong} />
    </AnimatedPressable>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>['theme']): CSSProperties {
  return {
    border: `2px solid ${theme.colors.border}`,
    borderRadius: theme.radii.md,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    fontFamily: theme.fontFamily.body,
    fontSize: 18,
    color: theme.colors.textPrimary,
    background: theme.colors.surface,
    width: '100%',
    boxSizing: 'border-box',
  };
}
