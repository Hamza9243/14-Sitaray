import { forwardRef, useRef } from 'react';
import { View } from 'react-native';

import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DropZoneProps {
  emoji: string;
  label: string;
  onBoundsChange: (bounds: ZoneBounds) => void;
}

/** Point-in-rect test against a zone's measured window bounds. */
export function isInsideZone(x: number, y: number, bounds: ZoneBounds | null) {
  if (!bounds) return false;
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

/** The target a child drags/drops items onto — measures its own screen bounds for hit-testing. */
export const DropZone = forwardRef<View, DropZoneProps>(function DropZone({ emoji, label, onBoundsChange }, ref) {
  const { theme } = useTheme();
  const viewRef = useRef<View>(null);

  return (
    <View
      ref={(node) => {
        viewRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      onLayout={() => {
        viewRef.current?.measureInWindow((x, y, width, height) => {
          onBoundsChange({ x, y, width, height });
        });
      }}
      style={{
        width: 120,
        height: 120,
        borderRadius: theme.radii.lg,
        borderWidth: 3,
        borderStyle: 'dashed',
        borderColor: theme.colors.brand,
        backgroundColor: theme.colors.brandSoft,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <Emoji size={40}>{emoji}</Emoji>
      <Text variant="caption" color="brandStrong">
        {label}
      </Text>
    </View>
  );
});
