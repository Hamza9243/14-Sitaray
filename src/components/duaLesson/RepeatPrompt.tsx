import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

export interface RepeatPromptProps {
  phrase: string;
  /** Small pronunciation-aid subtitle shown under the Arabic phrase. */
  transliteration?: string;
  onDone: () => void;
}

/**
 * The "repeat after me" beat. No speech recognition here (nothing in the
 * project can grade pronunciation) — this is a pacing/practice prompt: show
 * the phrase, pulse a mic icon, let the child say it aloud, then tap to
 * continue once they have.
 */
export function RepeatPrompt({ phrase, transliteration, onDone }: RepeatPromptProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.15, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <Text variant="label" color="brandStrong">
        YOUR TURN
      </Text>

      <Animated.View
        style={[
          animatedStyle,
          {
            width: 88,
            height: 88,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Ionicons name="mic" size={40} color={theme.colors.brandStrong} />
      </Animated.View>

      <ArabicText size={30} weight="semiBold" style={{ textAlign: 'center' }}>
        {phrase}
      </ArabicText>
      {transliteration ? (
        <Text variant="bodySmall" color="textSecondary" style={{ fontStyle: 'italic', textAlign: 'center' }}>
          {transliteration}
        </Text>
      ) : null}
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        Say it out loud!
      </Text>

      <Button label="I said it!" size="lg" onPress={onDone} />
    </View>
  );
}
