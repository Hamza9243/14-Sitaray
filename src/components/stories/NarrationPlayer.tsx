import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

/** Plays a story's recorded narration (from the CMS) across all pages; starts by itself when it mounts. */
export function NarrationPlayer({ url }: { url: string }) {
  const { theme } = useTheme();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    player.play();
    return () => player.pause();
  }, [player]);

  const finished = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration && !status.playing);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) player.seekTo(0);
    player.play();
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.xs,
        padding: theme.spacing.xs,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.surfaceSunken,
      }}
    >
      <AnimatedPressable
        onPress={toggle}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause narration' : 'Play narration'}
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={theme.colors.textOnBrand} />
      </AnimatedPressable>
      <View style={{ flex: 1 }}>
        <ProgressBar progress={status.duration > 0 ? status.currentTime / status.duration : 0} height={6} />
      </View>
      <Text variant="caption" color="textSecondary" style={{ paddingRight: theme.spacing.xs }}>
        Narration
      </Text>
    </View>
  );
}
