/**
 * Type system: Baloo 2 (rounded, bouncy) for display/headings gives the app
 * its playful "storybook" voice; Nunito (rounded sans) carries body copy so
 * long text stays easy to read for early readers. Both load via
 * @expo-google-fonts and are wired up in `fonts.ts`.
 *
 * Arabic script text (dua text, never the UI chrome) must NEVER use the
 * Baloo2/Nunito family above — those are Latin-only Google Fonts with no
 * Arabic glyphs, and unlike a system font, a loaded custom TTF doesn't
 * reliably fall back to another font for missing glyphs (the same class of
 * bug this project already hit with emoji — see `components/ui/Emoji.tsx`).
 * Use `fontFamily.arabic*` + the dedicated `ArabicText` component instead.
 */

export const fontFamily = {
  display: 'Baloo2_700Bold',
  displayExtraBold: 'Baloo2_800ExtraBold',
  displaySemiBold: 'Baloo2_600SemiBold',
  displayMedium: 'Baloo2_500Medium',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_500Medium',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
  arabic: 'NotoNaskhArabic_400Regular',
  arabicSemiBold: 'NotoNaskhArabic_600SemiBold',
  arabicBold: 'NotoNaskhArabic_700Bold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'button'
  | 'label';

interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const typography: Record<TypographyVariant, TypeStyle> = {
  display: { fontFamily: fontFamily.displayExtraBold, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  h1: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  h3: { fontFamily: fontFamily.displaySemiBold, fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  title: { fontFamily: fontFamily.displaySemiBold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  bodyLarge: { fontFamily: fontFamily.bodyMedium, fontSize: 18, lineHeight: 26, letterSpacing: 0.1 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23, letterSpacing: 0.1 },
  bodySmall: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  caption: { fontFamily: fontFamily.bodySemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontFamily: fontFamily.bodyExtraBold, fontSize: 16, lineHeight: 20, letterSpacing: 0.2 },
  label: { fontFamily: fontFamily.bodyBold, fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
};
