import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';

export interface EmojiProps {
  children: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders a raw emoji glyph with the platform's default font — never our
 * custom Baloo2/Nunito fonts. Those loaded TTFs have no emoji glyphs and,
 * unlike the system font, don't reliably fall back to the OS color-emoji
 * font on Android, so emoji rendered through the themed `Text` component
 * can show up as blank boxes. Use this for any standalone emoji.
 */
export function Emoji({ children, size = 24, style }: EmojiProps) {
  return <RNText style={[{ fontSize: size, fontFamily: undefined }, style]}>{children}</RNText>;
}
