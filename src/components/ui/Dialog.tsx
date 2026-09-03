import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design-system/useTheme';

import { Button, type ButtonProps } from './Button';
import { Text } from './Text';

export interface DialogAction extends Pick<ButtonProps, 'variant'> {
  label: string;
  onPress: () => void;
}

export interface DialogProps {
  visible: boolean;
  onRequestClose: () => void;
  title?: string;
  message?: string;
  /** e.g. a StarIcon or Lottie celebration graphic shown above the title. */
  icon?: ReactNode;
  actions?: DialogAction[];
  children?: ReactNode;
  dismissOnBackdropPress?: boolean;
}

/** Centered modal dialog — confirmations, celebrations (star/badge earned), simple prompts. */
export function Dialog({
  visible,
  onRequestClose,
  title,
  message,
  icon,
  actions = [],
  children,
  dismissOnBackdropPress = true,
}: DialogProps) {
  const { theme } = useTheme();
  // Entrance animation is plain CSS (transition), not Reanimated: this dialog is the one
  // Animated.View in the app that mounts late (only once `visible` flips true) AND renders
  // through a portal — that exact combination reliably breaks react-native-reanimated's web
  // JS-fallback (_updatePropsJS never receives a usable DOM ref for it), which silently
  // freezes the card at its initial scale/opacity — invisible forever — and, before a
  // defensive patch was added to reanimated itself, crash-looped the whole WebView JS engine
  // instead. A plain useState + CSS transition sidesteps Reanimated for this one animation
  // entirely, so it can't hit that bug. (This app only ever runs as react-native-web — inside
  // the browser or inside Capacitor's WebView — so there's no native Animated API to keep in
  // sync with; CSS transitions are the native mechanism here.)
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;

  // react-native-web's <Modal> renders through a portal too, but its portal host
  // doesn't mount reliably inside the Capacitor Android WebView — the backdrop's
  // own screen (whatever gradient/background was already there) stays visible with
  // no dialog content on top, and the app reads as stuck. Portaling straight to
  // document.body with React's own createPortal is the same "render outside the
  // normal tree, on top of everything" behavior Modal is meant to give, implemented
  // with a plain, universally-supported web API instead of RNW's Modal shim.
  return createPortal(
    <Pressable
      style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      onPress={dismissOnBackdropPress ? onRequestClose : undefined}
      accessibilityLabel="Dismiss dialog"
    >
      <Pressable onPress={() => {}} style={styles.contentWrap}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              opacity: entered ? 1 : 0,
              transform: [{ scale: entered ? 1 : 0.85 }],
              // `transition` is a raw CSS property RNW passes through to the DOM node as-is —
              // not part of RN's ViewStyle types, but this app only ever renders on web.
              transition: 'opacity 180ms ease-out, transform 180ms ease-out',
            } as object,
            theme.shadow('xl'),
          ]}
        >
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}

          {title ? (
            <Text variant="h3" style={{ textAlign: 'center', marginBottom: message || children ? theme.spacing.xs : 0 }}>
              {title}
            </Text>
          ) : null}

          {message ? (
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
              {message}
            </Text>
          ) : null}

          {children}

          {actions.length > 0 ? (
            <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.lg }]}>
              {actions.map((action) => (
                <Button key={action.label} label={action.label} variant={action.variant ?? 'primary'} onPress={action.onPress} fullWidth />
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Pressable>,
    document.body
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    alignItems: 'stretch',
  },
  iconSlot: {
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'column',
  },
});
