import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { SyncedTextHighlight } from '@/components/duaLesson/SyncedTextHighlight';
import { Emoji } from '@/components/ui/Emoji';
import { useTheme } from '@/design-system/useTheme';
import type { StoryPage } from '@/types/content';

export interface StoryPageViewProps {
  page: StoryPage;
  pageIndex: number;
  totalPages: number;
  /** 'listen' auto-plays narration; 'readMyself' waits for the child to tap play. */
  mode: 'listen' | 'readMyself';
  /** expo-speech rate — 1 normal. */
  rate: number;
  onNarrationDone: () => void;
}

/** One storybook page: a symbolic illustration (never a figurative depiction of the Ma'sumeen) plus narrated, word-synced text. */
export function StoryPageView({ page, pageIndex, totalPages, mode, rate, onNarrationDone }: StoryPageViewProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl, padding: theme.spacing.lg }}>
      <LinearGradient
        colors={page.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 180,
          height: 180,
          borderRadius: theme.radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadow('lg'),
        }}
      >
        <Emoji size={88}>{page.emoji}</Emoji>
      </LinearGradient>

      <SyncedTextHighlight text={page.text} script="latin" autoPlay={mode === 'listen'} rate={rate} onDone={onNarrationDone} />

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: totalPages }).map((_, index) => (
          <View
            key={index}
            style={{
              width: index === pageIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === pageIndex ? theme.colors.brand : theme.colors.surfaceSunken,
            }}
          />
        ))}
      </View>
    </View>
  );
}
