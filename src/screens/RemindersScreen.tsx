import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type CSSProperties, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card, CardBadge } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { CHARACTERS, characterForGender, REMINDER_ACTIVITY_LABELS, REMINDER_ACTIVITY_TYPES, type ReminderActivityType } from '@/data/characters';
import { useTheme } from '@/design-system/useTheme';
import { type Reminder, useAppStore } from '@/hooks/useAppStore';
import { cancelReminderCall, ensureReminderPermissions, scheduleReminderCall } from '@/lib/reminderScheduler';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function RemindersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const reminders = useAppStore((s) => s.reminders);
  const childGender = useAppStore((s) => s.childGender);
  const addReminder = useAppStore((s) => s.addReminder);
  const updateReminder = useAppStore((s) => s.updateReminder);
  const deleteReminder = useAppStore((s) => s.deleteReminder);

  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const character = characterForGender(childGender);
  const sorted = [...reminders].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  async function handleToggle(reminder: Reminder) {
    const enabled = !reminder.enabled;
    updateReminder(reminder.id, { enabled });
    if (enabled) {
      const result = await ensureReminderPermissions();
      if (!result.granted) {
        setPermissionNotice('Notifications are turned off for 14 Stars — enable them in your phone settings so calls can arrive on time.');
        return;
      }
      await scheduleReminderCall({ ...reminder, enabled: true }).catch(() => {});
    } else {
      await cancelReminderCall(reminder.id).catch(() => {});
    }
  }

  function handleDelete(reminder: Reminder) {
    cancelReminderCall(reminder.id).catch(() => {});
    deleteReminder(reminder.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Call Reminders" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        <Card variant="raised">
          <Text variant="bodySmall" color="textSecondary">
            {childGender
              ? `Your child will receive a call from ${character.name}.`
              : `No profile set yet — calls will default to ${character.name}. Set your child's profile in the Profile tab to make sure the right character calls.`}
          </Text>
        </Card>

        {permissionNotice ? (
          <Card variant="outline">
            <Text variant="bodySmall" color="danger">
              {permissionNotice}
            </Text>
          </Card>
        ) : null}

        {sorted.length === 0 ? (
          <Card variant="raised" style={{ alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xl }}>
            <Ionicons name="call-outline" size={32} color={theme.colors.textSecondary} />
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
              No reminders yet. Create one so {character.name} can give your child a fun call!
            </Text>
          </Card>
        ) : (
          sorted.map((reminder) => (
            <Card key={reminder.id} variant="raised">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                    <CardBadge label={REMINDER_ACTIVITY_LABELS[reminder.type]} tone="brand" />
                    {reminder.status !== 'pending' && (
                      <CardBadge label={reminder.status === 'completed' ? 'Completed' : 'Dismissed'} tone={reminder.status === 'completed' ? 'success' : 'neutral'} />
                    )}
                  </View>
                  <Text variant="title">{reminder.title}</Text>
                  <Text variant="bodySmall" color="textSecondary">
                    {formatWhen(reminder.scheduledAt)} · Call from {CHARACTERS[reminder.character].name}
                  </Text>
                </View>

                <AnimatedPressable
                  onPress={() => handleToggle(reminder)}
                  accessibilityRole="button"
                  accessibilityLabel={reminder.enabled ? 'Disable reminder' : 'Enable reminder'}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={reminder.enabled ? 'toggle' : 'toggle-outline'}
                    size={36}
                    color={reminder.enabled ? theme.colors.brand : theme.colors.textSecondary}
                  />
                </AnimatedPressable>
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <Button label="Edit" variant="outline" size="sm" onPress={() => setEditing(reminder)} style={{ flex: 1 }} />
                <Button label="Delete" variant="ghost" size="sm" onPress={() => handleDelete(reminder)} style={{ flex: 1 }} />
              </View>
            </Card>
          ))
        )}

        <Button label="New Reminder" leftIcon={<Ionicons name="add" size={20} color={theme.colors.textOnBrand} />} onPress={() => setEditing('new')} fullWidth />
      </ScrollView>

      <ReminderEditorDialog
        target={editing}
        character={character}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (editing === 'new') {
            const created = addReminder(input);
            if (created.enabled) {
              const result = await ensureReminderPermissions();
              if (!result.granted) {
                setPermissionNotice('Notifications are turned off for 14 Stars — enable them in your phone settings so calls can arrive on time.');
              } else {
                await scheduleReminderCall(created).catch(() => {});
                setPermissionNotice(null);
              }
            }
          } else if (editing) {
            updateReminder(editing.id, input);
            const updated = { ...editing, ...input };
            if (updated.enabled) {
              await scheduleReminderCall(updated).catch(() => {});
            } else {
              await cancelReminderCall(updated.id).catch(() => {});
            }
          }
          setEditing(null);
        }}
      />
    </View>
  );
}

function toLocalDateTimeParts(iso?: string): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function ReminderEditorDialog({
  target,
  character,
  onClose,
  onSave,
}: {
  target: Reminder | 'new' | null;
  character: ReturnType<typeof characterForGender>;
  onClose: () => void;
  onSave: (input: { type: ReminderActivityType; title: string; scheduledAt: string; enabled: boolean }) => void;
}) {
  const { theme } = useTheme();
  const visible = target !== null;
  const existing = target && target !== 'new' ? target : null;

  const [type, setType] = useState<ReminderActivityType>(existing?.type ?? 'dua');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [{ date, time }, setDateTime] = useState(toLocalDateTimeParts(existing?.scheduledAt));
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [pastTimeWarning, setPastTimeWarning] = useState(false);

  // Re-seed fields whenever a different reminder is opened for editing.
  const [lastTargetKey, setLastTargetKey] = useState(target);
  if (target !== lastTargetKey) {
    setLastTargetKey(target);
    const next = target && target !== 'new' ? target : null;
    setType(next?.type ?? 'dua');
    setTitle(next?.title ?? '');
    setDateTime(toLocalDateTimeParts(next?.scheduledAt));
    setEnabled(next?.enabled ?? true);
    setPastTimeWarning(false);
  }

  function handleSave() {
    if (!date || !time) return;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    if (enabled && new Date(scheduledAt).getTime() <= Date.now()) {
      setPastTimeWarning(true);
      return;
    }
    setPastTimeWarning(false);
    onSave({
      type,
      title: title.trim() || REMINDER_ACTIVITY_LABELS[type],
      scheduledAt,
      enabled,
    });
  }

  return (
    <Dialog
      visible={visible}
      onRequestClose={onClose}
      title={existing ? 'Edit Reminder' : 'New Call Reminder'}
      actions={[
        { label: 'Save', onPress: handleSave },
        { label: 'Cancel', variant: 'ghost', onPress: onClose },
      ]}
    >
      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="label" color="textSecondary">
            ACTIVITY
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {REMINDER_ACTIVITY_TYPES.map((activityType) => (
              <ActivityPill key={activityType} label={REMINDER_ACTIVITY_LABELS[activityType]} active={type === activityType} onPress={() => setType(activityType)} />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="label" color="textSecondary">
            TITLE
          </Text>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={REMINDER_ACTIVITY_LABELS[type]}
            maxLength={40}
            style={inputStyle(theme)}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text variant="label" color="textSecondary">
              DATE
            </Text>
            <input type="date" value={date} onChange={(e) => setDateTime((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle(theme)} />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text variant="label" color="textSecondary">
              TIME
            </Text>
            <input type="time" value={time} onChange={(e) => setDateTime((prev) => ({ ...prev, time: e.target.value }))} style={inputStyle(theme)} />
          </View>
        </View>

        {pastTimeWarning ? (
          <Text variant="bodySmall" color="danger">
            That time has already passed — pick a time later than now.
          </Text>
        ) : null}

        <AnimatedPressable
          onPress={() => setEnabled((e) => !e)}
          scaleTo={0.98}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.xs }}
        >
          <Text variant="body">Reminder enabled</Text>
          <Ionicons name={enabled ? 'toggle' : 'toggle-outline'} size={36} color={enabled ? theme.colors.brand : theme.colors.textSecondary} />
        </AnimatedPressable>

        <View style={{ backgroundColor: theme.colors.brandSoft, borderRadius: theme.radii.md, padding: theme.spacing.sm }}>
          <Text variant="bodySmall" color="brandStrong">
            {`Your child will receive a call from ${character.name}.`}
          </Text>
        </View>
      </View>
    </Dialog>
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
    fontSize: 16,
    color: theme.colors.textPrimary,
    background: theme.colors.surface,
    width: '100%',
    boxSizing: 'border-box',
  };
}

function ActivityPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.95}
      style={{
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radii.full,
        backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSunken,
      }}
    >
      <Text variant="bodySmall" style={{ color: active ? theme.colors.textOnBrand : theme.colors.textSecondary }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
