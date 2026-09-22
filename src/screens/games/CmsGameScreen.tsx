import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { useCmsGame } from '@/cms/hooks';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

import { GameHost } from './GameHost';

/** Plays a game made in the CMS at /games/cms/:gameId, with its XP capped and awarded once. */
export function CmsGameScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const game = useCmsGame(gameId);

  if (!game) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md, backgroundColor: theme.colors.background }}>
        <Text variant="h3" style={{ textAlign: 'center' }}>
          This game is not available.
        </Text>
        <Button label="Back to Discover" onPress={() => router.replace('/discover')} />
      </View>
    );
  }

  return <GameHost game={game.definition} gameId={`cms-game-${game.id}`} />;
}
