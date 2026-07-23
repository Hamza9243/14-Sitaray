import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface MeaningCardProps {
  emoji: string;
  explainer: string;
}

/** The "what does it mean" beat — a bright illustrated card with one kid-friendly sentence. */
export function MeaningCard({ emoji, explainer }: MeaningCardProps) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.md }}>
      <LinearGradient
        colors={theme.gradients.dawn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 160,
          height: 160,
          borderRadius: theme.radii.xl,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadow('lg'),
        }}
      >
        <Emoji size={80}>{emoji}</Emoji>
      </LinearGradient>

      <Text variant="h3" style={{ textAlign: 'center' }}>
        {explainer}
      </Text>
    </View>
  );
}
