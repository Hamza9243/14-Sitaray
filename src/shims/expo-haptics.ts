import { Capacitor } from '@capacitor/core';
import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Drop-in replacement for expo-haptics, aliased in vite.config.ts. Every call site in
 * this app already guards with `Platform.OS !== 'web'` before calling these — which,
 * under react-native-web, is always true (Platform.OS === 'web' everywhere, including
 * inside the Capacitor WebView shell) so those guards currently suppress every call.
 * These functions no-op safely on plain web regardless, and fire real haptics only
 * when actually running inside the native Capacitor shell.
 */
export enum ImpactFeedbackStyle {
  Light = 'Light',
  Medium = 'Medium',
  Heavy = 'Heavy',
}

export enum NotificationFeedbackType {
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

const IMPACT_MAP: Record<ImpactFeedbackStyle, ImpactStyle> = {
  [ImpactFeedbackStyle.Light]: ImpactStyle.Light,
  [ImpactFeedbackStyle.Medium]: ImpactStyle.Medium,
  [ImpactFeedbackStyle.Heavy]: ImpactStyle.Heavy,
};

const NOTIFICATION_MAP: Record<NotificationFeedbackType, NotificationType> = {
  [NotificationFeedbackType.Success]: NotificationType.Success,
  [NotificationFeedbackType.Warning]: NotificationType.Warning,
  [NotificationFeedbackType.Error]: NotificationType.Error,
};

export async function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Light): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapHaptics.impact({ style: IMPACT_MAP[style] });
  } catch {
    // Best-effort — never let haptics failures break the interaction they're attached to.
  }
}

export async function notificationAsync(type: NotificationFeedbackType = NotificationFeedbackType.Success): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapHaptics.notification({ type: NOTIFICATION_MAP[type] });
  } catch {
    // Best-effort.
  }
}

export async function selectionAsync(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapHaptics.selectionStart();
  } catch {
    // Best-effort.
  }
}
