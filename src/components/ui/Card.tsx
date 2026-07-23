import { type PropsWithChildren, type ReactNode } from 'react';
import { type GestureResponderEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/useTheme';
import type { SpacingKey } from '@/design-system/tokens/spacing';

import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

export type CardVariant = 'raised' | 'flat' | 'outline';

export interface CardProps extends PropsWithChildren {
  variant?: CardVariant;
  padding?: SpacingKey;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  /** Tints the card's shadow — pass a brand color for a soft "glow" card. */
  glowColor?: string;
  accessibilityLabel?: string;
  testID?: string;
}

/** Base surface for all card-shaped content (stories, lessons, characters, stats). */
export function Card({
  children,
  variant = 'raised',
  padding = 'md',
  onPress,
  style,
  glowColor,
  accessibilityLabel,
  testID,
}: CardProps) {
  const { theme } = useTheme();

  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing[padding],
    },
    variant === 'raised' && theme.shadow('md', glowColor),
    variant === 'outline' && { borderWidth: 2, borderColor: theme.colors.border },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleTo={0.97}
        style={baseStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={baseStyle} accessibilityLabel={accessibilityLabel} testID={testID}>
      {children}
    </View>
  );
}

export interface CardBadgeProps {
  label: string;
  tone?: 'brand' | 'success' | 'info' | 'neutral' | 'locked';
  icon?: ReactNode;
}

/** Small pill for card corners — "New", "3 stars", "Locked", streak counts, etc. */
export function CardBadge({ label, tone = 'brand', icon }: CardBadgeProps) {
  const { theme } = useTheme();

  const toneColors: Record<NonNullable<CardBadgeProps['tone']>, { bg: string; fg: string }> = {
    brand: { bg: theme.colors.brandSoft, fg: theme.colors.brandStrong },
    success: { bg: theme.colors.successSurface, fg: theme.colors.success },
    info: { bg: theme.colors.infoSurface, fg: theme.colors.info },
    neutral: { bg: theme.colors.surfaceSunken, fg: theme.colors.textSecondary },
    locked: { bg: theme.colors.overlay, fg: theme.colors.textInverse },
  };

  const { bg, fg } = toneColors[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: theme.radii.full,
          paddingHorizontal: theme.spacing.sm,
          gap: theme.spacing.xxs,
        },
      ]}
    >
      {icon}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
