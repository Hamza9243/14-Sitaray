import Svg, { ClipPath, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/design-system/useTheme';

export interface StarIconProps {
  size?: number;
  /** 0-1 fill amount for partial stars (ratings, progress). 1 = fully filled. */
  fill?: number;
  outlineColor?: string;
  emptyColor?: string;
  gradientId?: string;
}

/**
 * The brand star mark — a soft five-point star with rounded joints, drawn
 * once here so every star widget in the app (rating rows, progress rings,
 * reward bursts) shares the exact same shape.
 */
export function StarIcon({ size = 28, fill = 1, outlineColor, emptyColor, gradientId = 'starFill' }: StarIconProps) {
  const { theme } = useTheme();
  const stroke = outlineColor ?? theme.palette.star[700];
  const empty = emptyColor ?? theme.colors.surfaceSunken;
  const clampedFill = Math.max(0, Math.min(1, fill));
  const uid = `${gradientId}-${size}-${Math.round(clampedFill * 100)}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={theme.palette.star[300]} />
          <Stop offset="55%" stopColor={theme.palette.star[500]} />
          <Stop offset="100%" stopColor={theme.palette.star[700]} />
        </LinearGradient>
        <ClipPath id={`${uid}-clip`}>
          <Rect x={0} y={0} width={clampedFill * 100} height={100} />
        </ClipPath>
      </Defs>

      <Path d={STAR_PATH} fill={empty} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
      {clampedFill > 0 && (
        <Path d={STAR_PATH} fill={`url(#${uid})`} stroke={stroke} strokeWidth={3} strokeLinejoin="round" clipPath={`url(#${uid}-clip)`} />
      )}
    </Svg>
  );
}

// Five-point star, rounded joints, centered in a 100x100 box.
const STAR_PATH =
  'M50 4 L61.5 36.5 L96 38 L69 59.5 L78.5 93 L50 73.5 L21.5 93 L31 59.5 L4 38 L38.5 36.5 Z';
