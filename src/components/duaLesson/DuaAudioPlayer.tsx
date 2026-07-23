import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface DuaAudioPlayerProps {
  /** Real reciter MP3 URL. `null` shows a "coming soon" state instead of any playback controls. */
  audioUrl: string | null;
  reciterName?: string | null;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Plays a dua's real reciter recording — no AI text-to-speech is used here, since
 * generic TTS mispronounces Arabic. Remote URLs are downloaded before playback
 * (`downloadFirst`) so replays are instant and don't re-fetch over the network.
 */
export function DuaAudioPlayer({ audioUrl, reciterName }: DuaAudioPlayerProps) {
  const { theme } = useTheme();
  const isRemote = !!audioUrl && /^https?:\/\//.test(audioUrl);
  const player = useAudioPlayer(audioUrl ?? null, { downloadFirst: isRemote });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);

  if (!audioUrl) {
    return (
      <View
        style={{
          alignItems: 'center',
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radii.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Ionicons name="mic-off-outline" size={28} color={theme.colors.textSecondary} />
        <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
          Recitation audio coming soon
        </Text>
      </View>
    );
  }

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const finished = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration && !status.playing);

  function togglePlay() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) player.seekTo(0);
    player.play();
  }

  function replay() {
    player.seekTo(0);
    player.play();
  }

  return (
    <View style={{ width: '100%', alignItems: 'center', gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <AnimatedPressable
          onPress={replay}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Replay from the start"
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.surfaceRaised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={togglePlay}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            ...theme.shadow('md', theme.palette.star[600]),
          }}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={theme.colors.textOnBrand} />
        </AnimatedPressable>

        <View style={{ width: 44 }} />
      </View>

      <View style={{ width: '100%', paddingHorizontal: theme.spacing.md }}>
        <ProgressBar progress={progress} height={6} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text variant="caption" color="textSecondary">
            {formatTime(status.currentTime)}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatTime(status.duration)}
          </Text>
        </View>
      </View>

      {reciterName ? (
        <Text variant="caption" color="textSecondary">
          {`Recited by ${reciterName}`}
        </Text>
      ) : null}
    </View>
  );
}
