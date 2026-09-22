import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { useStars } from '@/cms/hooks';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { STAR_GAMES_BY_STAR, starGameId } from '@/data/games/starGames';
import { useTheme } from '@/design-system/useTheme';
import { getUnlockedStarIds, useAppStore } from '@/hooks/useAppStore';

import { GameHost } from './GameHost';

/** Hosts the playable game for Stars 3–14 at /games/star/:starId — one reward, exactly once per game. */
export function StarGameScreen() {
  const router = useRouter();
  const { starId } = useLocalSearchParams<{ starId: string }>();
  const stars = useStars();
  const xp = useAppStore((s) => s.xp);

  const game = STAR_GAMES_BY_STAR[Number(starId)];
  const star = stars.find((s) => s.id === Number(starId));

  if (!game || !star) {
    return <NotFound onBack={() => router.replace('/stars')} />;
  }
  if (!getUnlockedStarIds(xp).includes(star.id)) {
    return <NotFound onBack={() => router.replace('/stars')} message={`Unlock Star ${star.id} first to play this game.`} />;
  }

  return <GameHost game={game} gameId={starGameId(game.starId)} eyebrow={`STAR ${star.id} · ${star.lessonTitle.toUpperCase()}`} />;
}

function NotFound({ onBack, message = 'This game is not available.' }: { onBack: () => void; message?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md, backgroundColor: theme.colors.background }}>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      <Button label="Back to Stars" onPress={onBack} />
    </View>
  );
}
