import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

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
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, theme.motion.spring.bouncy);
      opacity.value = withTiming(1, theme.motion.timing.fast);
    } else {
      scale.value = withTiming(0.85, theme.motion.timing.fast);
      opacity.value = withTiming(0, theme.motion.timing.fast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

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
        <Animated.View
          style={[
            styles.card,
            contentStyle,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
            },
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
        </Animated.View>
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
