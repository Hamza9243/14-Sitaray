import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/design-system/useTheme';
import type { TypographyVariant } from '@/design-system/tokens/typography';
import type { AppColors } from '@/design-system/tokens/colors';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  /** A key from the active theme's color tokens (e.g. "textSecondary", "brand"). */
  color?: keyof AppColors;
}

/** Themed text primitive — always route body/heading copy through this instead of raw RN `Text`. */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  const { theme } = useTheme();
  const typeStyle = theme.typography[variant];

  return (
    <RNText
      style={[
        {
          fontFamily: typeStyle.fontFamily,
          fontSize: typeStyle.fontSize,
          lineHeight: typeStyle.lineHeight,
          letterSpacing: typeStyle.letterSpacing,
          color: theme.colors[color],
        },
        style,
      ]}
      {...rest}
    />
  );
}
