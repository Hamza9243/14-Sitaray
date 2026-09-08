import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { resyncReminderCalls } from '@/lib/reminderScheduler';
import { useAppStore } from '@/hooks/useAppStore';

/**
 * Bridges native notification events to in-app navigation — mounted once near the app
 * root (inside the Router, alongside <AppRoutes/>). Business logic only, no UI: this is
 * what turns "a reminder's alarm fired" into "show the IncomingCallScreen".
 *
 * - App closed/backgrounded: Android delivers the real OS notification (scheduled via
 *   AlarmManager — see reminderScheduler.ts); tapping it fires `localNotificationActionPerformed`.
 * - App already open in the foreground: the OS still creates the notification, but nothing
 *   forces the user to pull down the shade — `localNotificationReceived` fires immediately
 *   so the call screen appears right away instead of silently waiting in the tray.
 */
export function ReminderNotificationBridge() {
  const navigate = useNavigate();
  const reminders = useAppStore((s) => s.reminders);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !Capacitor.isNativePlatform()) return;
    resyncReminderCalls(reminders).catch(() => {});
    // Only re-run when hydration completes — reminders themselves are re-synced individually
    // on create/edit (RemindersScreen), not on every store change here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    function openCallScreen(reminderId: unknown) {
      const id = Number(reminderId);
      if (Number.isFinite(id)) navigate(`/incoming-call/${id}`);
    }

    const receivedHandle = LocalNotifications.addListener('localNotificationReceived', (notification) => {
      openCallScreen(notification.extra?.reminderId);
    });
    const tappedHandle = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      openCallScreen(action.notification.extra?.reminderId);
    });

    return () => {
      receivedHandle.then((h) => h.remove()).catch(() => {});
      tappedHandle.then((h) => h.remove()).catch(() => {});
    };
  }, [navigate]);

  return null;
}
