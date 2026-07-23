import type { StyleProp, TextStyle } from 'react-native';

import { useTheme } from '@/design-system/useTheme';
import type { AppColors } from '@/design-system/tokens/colors';

import { Text } from './Text';

export interface ArabicTextProps {
  children: string;
  size?: number;
  weight?: 'regular' | 'semiBold' | 'bold';
  color?: keyof AppColors;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders Arabic script with the dedicated Noto Naskh Arabic font — never
 * Baloo2/Nunito (Latin-only, no Arabic glyphs, no reliable fallback for a
 * loaded custom font). Also sets right-to-left writing direction and a
 * taller line-height, since Naskh's diacritics and ligatures need more
 * vertical room than Latin text at the same font size.
 */
export function ArabicText({ children, size = 26, weight = 'regular', color = 'textPrimary', style, numberOfLines }: ArabicTextProps) {
  const { theme } = useTheme();
  const family =
    weight === 'bold' ? theme.fontFamily.arabicBold : weight === 'semiBold' ? theme.fontFamily.arabicSemiBold : theme.fontFamily.arabic;

  return (
    <Text
      color={color}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: family,
          fontSize: size,
          lineHeight: size * 1.8,
          writingDirection: 'rtl',
          textAlign: 'right',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
