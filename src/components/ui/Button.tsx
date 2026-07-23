import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { ActivityIndicator, type GestureResponderEvent, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/useTheme';

import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label?: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Renders as a circular icon-only button (pass a single icon as `leftIcon`). */
  iconOnly?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const sizeMetrics: Record<ButtonSize, { height: number; paddingH: number; gap: number; font: 'button' | 'bodySmall' | 'bodyLarge' }> = {
  sm: { height: 40, paddingH: 14, gap: 6, font: 'bodySmall' },
  md: { height: 52, paddingH: 20, gap: 8, font: 'button' },
  lg: { height: 62, paddingH: 28, gap: 10, font: 'bodyLarge' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const metrics = sizeMetrics[size];
  const isDisabled = disabled || loading;

  const shape = iconOnly
    ? { width: metrics.height, height: metrics.height, borderRadius: theme.radii.full, paddingHorizontal: 0 }
    : { height: metrics.height, borderRadius: theme.radii.md, paddingHorizontal: metrics.paddingH };

  const content = (
    <View style={[styles.contentRow, { gap: metrics.gap }]}>
      {loading ? (
        <ActivityIndicator color={textColorFor(variant, theme)} />
      ) : (
        <>
          {leftIcon}
          {!iconOnly && label ? (
            <Text
              variant="button"
              style={{ color: textColorFor(variant, theme), fontSize: metrics.font === 'bodySmall' ? 14 : metrics.font === 'bodyLarge' ? 18 : 16 }}
            >
              {label}
            </Text>
          ) : null}
          {rightIcon}
        </>
      )}
    </View>
  );

  const outerStyle = [
    styles.base,
    shape,
    fullWidth && !iconOnly && styles.fullWidth,
    variantStyle(variant, theme),
    !iconOnly && theme.shadow(variant === 'ghost' || variant === 'outline' ? 'none' : 'md', glowTintFor(variant, theme)),
    style,
  ];

  if (variant === 'primary' && !isDisabled) {
    return (
      <AnimatedPressable
        disabled={isDisabled}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled }}
        testID={testID}
        style={[styles.base, shape, fullWidth && !iconOnly && styles.fullWidth, theme.shadow('md', theme.palette.star[600]), style]}
      >
        <LinearGradient
          colors={theme.gradients.starBurst}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: shape.borderRadius }]}
        />
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      style={outerStyle}
    >
      {content}
    </AnimatedPressable>
  );
}

function variantStyle(variant: ButtonVariant, theme: ReturnType<typeof useTheme>['theme']) {
  switch (variant) {
    case 'secondary':
      return { backgroundColor: theme.colors.brandSoft };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.colors.border };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'danger':
      return { backgroundColor: theme.colors.danger };
    case 'primary':
      // Only reached when disabled (the enabled path renders its own gradient fill).
      return { backgroundColor: theme.colors.brand };
    default:
      return {};
  }
}

function textColorFor(variant: ButtonVariant, theme: ReturnType<typeof useTheme>['theme']) {
  switch (variant) {
    case 'primary':
      return theme.colors.textOnBrand;
    case 'secondary':
      return theme.colors.brandStrong;
    case 'outline':
    case 'ghost':
      return theme.colors.textPrimary;
    case 'danger':
      return theme.colors.textInverse;
    default:
      return theme.colors.textPrimary;
  }
}

function glowTintFor(variant: ButtonVariant, theme: ReturnType<typeof useTheme>['theme']) {
  if (variant === 'danger') return theme.colors.danger;
  return undefined;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
});
