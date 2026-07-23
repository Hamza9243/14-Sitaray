import { Platform } from 'react-native';

export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface ShadowSpec {
  offsetY: number;
  blur: number;
  opacity: number;
  elevation: number;
}

const specs: Record<Exclude<ShadowLevel, 'none'>, ShadowSpec> = {
  sm: { offsetY: 2, blur: 6, opacity: 0.1, elevation: 2 },
  md: { offsetY: 4, blur: 12, opacity: 0.14, elevation: 5 },
  lg: { offsetY: 8, blur: 20, opacity: 0.16, elevation: 9 },
  xl: { offsetY: 14, blur: 32, opacity: 0.2, elevation: 14 },
};

/**
 * Cross-platform elevation. RN-Web doesn't reliably translate shadow* props
 * to CSS, so web gets an explicit boxShadow string; native gets shadow* +
 * elevation. Pass a tint (e.g. a brand color) to get a soft "glow" shadow
 * instead of the default neutral one — used on primary buttons/reward cards.
 */
export function createShadow(level: ShadowLevel, tint = '#1A1420'): Record<string, unknown> {
  if (level === 'none') {
    return Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : { shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 };
  }

  const spec = specs[level];

  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${spec.offsetY}px ${spec.blur}px ${hexToRgba(tint, spec.opacity)}`,
    };
  }

  return {
    shadowColor: tint,
    shadowOffset: { width: 0, height: spec.offsetY },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.blur / 2,
    elevation: spec.elevation,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const shadows = {
  sm: createShadow('sm'),
  md: createShadow('md'),
  lg: createShadow('lg'),
  xl: createShadow('xl'),
  none: createShadow('none'),
} as const;
