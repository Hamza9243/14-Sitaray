import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design-system/useTheme';

import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

export interface AppBarAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface AppBarProps {
  title?: string;
  onBack?: () => void;
  actions?: AppBarAction[];
  /** "solid" sits on its own surface; "transparent" is meant to float over a FloatingBackground/hero image. */
  variant?: 'solid' | 'transparent';
  /** Larger, left-aligned title (home/library screens) instead of a small centered one (detail screens). */
  large?: boolean;
  trailing?: ReactNode;
  /** Override the title color — use theme.colors.textInverse when floating over a dark/night background. */
  titleColor?: string;
}

/** Top navigation bar — safe-area aware, used at the top of every screen. */
export function AppBar({ title, onBack, actions = [], variant = 'solid', large = false, trailing, titleColor }: AppBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const resolvedTitleColor = titleColor ?? theme.colors.textPrimary;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
          backgroundColor: variant === 'solid' ? theme.colors.background : 'transparent',
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack && (
            <AnimatedPressable
              onPress={onBack}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.full },
                theme.shadow('sm'),
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
            </AnimatedPressable>
          )}
        </View>

        {!large && title ? (
          <Text variant="title" numberOfLines={1} style={[styles.centerTitle, { color: resolvedTitleColor }]}>
            {title}
          </Text>
        ) : (
          <View style={styles.flexSpacer} />
        )}

        <View style={[styles.side, styles.sideEnd]}>
          {actions.map((action) => (
            <AnimatedPressable
              key={action.icon}
              onPress={action.onPress}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.full, marginLeft: theme.spacing.xs },
                theme.shadow('sm'),
              ]}
            >
              <Ionicons name={action.icon} size={20} color={theme.colors.textPrimary} />
            </AnimatedPressable>
          ))}
          {trailing}
        </View>
      </View>

      {large && title ? (
        <Text variant="h1" style={{ marginTop: theme.spacing.sm, color: resolvedTitleColor }}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  flexSpacer: {
    flex: 1,
  },
  centerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
