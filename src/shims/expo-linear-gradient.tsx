import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface LinearGradientProps extends PropsWithChildren {
  colors: readonly string[];
  /** Normalized 0-1 coordinates, same convention as expo-linear-gradient. */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
}

/**
 * Drop-in replacement for expo-linear-gradient, aliased in vite.config.ts. Renders a
 * plain <div> with a CSS `linear-gradient()` background — React DOM auto-appends `px`
 * to the same unitless numeric style properties RN does (borderRadius, padding, etc.),
 * so a flattened RN style object works directly as a DOM style prop for every usage
 * in this app (all plain layout/sizing, no RN-only style features).
 */
export function LinearGradient({ colors, start = { x: 0, y: 0 }, end = { x: 1, y: 1 }, style, children }: LinearGradientProps) {
  const angleRad = Math.atan2(end.y - start.y, end.x - start.x);
  // CSS gradient angles are measured clockwise from north; RN's x/y vector is measured from east.
  const angleDeg = (angleRad * 180) / Math.PI + 90;

  const flatStyle = (StyleSheet.flatten(style) ?? {}) as React.CSSProperties;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `linear-gradient(${angleDeg}deg, ${colors.join(', ')})`,
        ...flatStyle,
      }}
    >
      {children}
    </div>
  );
}
