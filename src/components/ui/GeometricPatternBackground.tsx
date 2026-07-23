import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

export interface GeometricPatternBackgroundProps {
  color?: string;
  opacity?: number;
  tileSize?: number;
}

/**
 * A subtle, tileable Islamic geometric motif (an eight-pointed khatam star,
 * drawn as two overlapping squares) rendered as a low-opacity SVG pattern.
 * Meant to sit behind content as pure texture — never opaque enough to
 * compete with foreground text or cards.
 */
export function GeometricPatternBackground({ color = '#F5C453', opacity = 0.07, tileSize = 72 }: GeometricPatternBackgroundProps) {
  const patternId = 'khatam-star-pattern';
  const half = tileSize / 2;
  const squareSize = tileSize * 0.42;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={{ opacity }}>
        <Defs>
          <Pattern id={patternId} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
            <Rect
              x={half - squareSize / 2}
              y={half - squareSize / 2}
              width={squareSize}
              height={squareSize}
              stroke={color}
              strokeWidth={1.4}
              fill="none"
            />
            <Rect
              x={half - squareSize / 2}
              y={half - squareSize / 2}
              width={squareSize}
              height={squareSize}
              stroke={color}
              strokeWidth={1.4}
              fill="none"
              rotation={45}
              originX={half}
              originY={half}
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
