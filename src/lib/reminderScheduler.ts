import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { REMINDER_ACTIVITY_LABELS } from '@/data/characters';
import type { Reminder } from '@/hooks/useAppStore';

const CHANNEL_ID = 'character-call-reminders';

/**
 * All scheduling goes through Android's real AlarmManager (via @capacitor/local-notifications,
 * which calls `alarmManager.setExactAndAllowWhileIdle` under the hood — see its
 * LocalNotificationManager.java) rather than a JS setTimeout, so reminders fire on time
 * whether the app is open, backgrounded, or fully closed. The plugin also ships its own
 * boot-completed receiver (LocalNotificationRestoreReceiver) that re-arms pending native
 * alarms after a device restart, with no extra native code needed here.
 *
 * Everything in this module is a safe no-op on web/dev preview (`Capacitor.isNativePlatform()`
 * is false there) — there is no reliable background-alarm equivalent in a browser tab, so
 * reminders simply won't fire outside the Android app shell, which is expected and fine for
 * local web testing of the rest of the feature.
 */

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Character Call Reminders',
      description: 'Fun incoming-call reminders from Ali and Sakina',
      importance: 5, // MAX — heads-up / pop-over-lockscreen-eligible, appropriate for a "call"
      visibility: 1,
    });
    channelReady = true;
  } catch {
    // Best-effort — scheduling still proceeds with the default channel if this fails.
  }
}

export interface PermissionResult {
  granted: boolean;
  /** True when notifications are allowed but exact alarms are not (Android 12+ "Alarms & reminders" toggle). */
  exactAlarmDenied: boolean;
}

/** Requests only what this feature needs: notification display + (Android) exact-alarm scheduling. */
export async function ensureReminderPermissions(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) return { granted: true, exactAlarmDenied: false };

  const current = await LocalNotifications.checkPermissions();
  const display =
    current.display === 'granted' ? current.display : (await LocalNotifications.requestPermissions()).display;
  if (display !== 'granted') return { granted: false, exactAlarmDenied: false };

  if (Capacitor.getPlatform() !== 'android') return { granted: true, exactAlarmDenied: false };

  try {
    const exact = await LocalNotifications.checkExactNotificationSetting();
    if (exact.exact_alarm === 'granted') return { granted: true, exactAlarmDenied: false };
    const changed = await LocalNotifications.changeExactNotificationSetting();
    return { granted: true, exactAlarmDenied: changed.exact_alarm !== 'granted' };
  } catch {
    // Older Android where this call isn't applicable — exact scheduling just works.
    return { granted: true, exactAlarmDenied: false };
  }
}

/** Schedules (or reschedules) one reminder's native alarm. Cancels any existing alarm with the same id first. */
export async function scheduleReminderCall(reminder: Reminder): Promise<void> {
  if (!Capacitor.isNativePlatform() || !reminder.enabled) return;

  const at = new Date(reminder.scheduledAt);
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return;

  await ensureChannel();

  await LocalNotifications.cancel({ notifications: [{ id: reminder.id }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: '📞 Incoming Call — 14 Stars',
        body: `${REMINDER_ACTIVITY_LABELS[reminder.type]} is calling!`,
        channelId: CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
        extra: { reminderId: reminder.id },
      },
    ],
  });
}

export async function cancelReminderCall(reminderId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: reminderId }] });
  } catch {
    // Nothing pending — fine.
  }
}

/**
 * Re-schedules every enabled, still-pending, future reminder. Called once on app launch so
 * reminders created/edited before an app update, or missed by the boot receiver for any
 * reason, are guaranteed to be re-armed the next time the app is opened.
 */
export async function resyncReminderCalls(reminders: Reminder[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const upcoming = reminders.filter((r) => r.enabled && r.status === 'pending' && new Date(r.scheduledAt).getTime() > Date.now());
  await Promise.all(upcoming.map((r) => scheduleReminderCall(r).catch(() => {})));
}
