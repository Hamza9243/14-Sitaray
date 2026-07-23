import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ArabicText } from '@/components/ui/ArabicText';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

import { ChoiceCard } from '../games/ChoiceCard';

export interface MissingWordChallengeProps {
  words: string[];
  blankIndex: number;
  options: string[];
  onComplete: () => void;
}

/** Fill-in-the-blank: the phrase with one word missing, tap the right word from 3 options. */
export function MissingWordChallenge({ words, blankIndex, options, onComplete }: MissingWordChallengeProps) {
  const { theme } = useTheme();
  const [filled, setFilled] = useState(false);
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const correctWord = words[blankIndex];

  function handleChoose(option: string) {
    if (filled) return;
    if (option === correctWord) {
      setFilled(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onComplete, 650);
    } else {
      setWrongOption(option);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => setWrongOption(null), 500);
    }
  }

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xl }}>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: theme.spacing.md }}>
        {words.map((word, index) =>
          index === blankIndex ? (
            <View
              key={index}
              style={{
                minWidth: 64,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: theme.radii.sm,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: theme.colors.brand,
                backgroundColor: filled ? theme.colors.successSurface : theme.colors.brandSoft,
                alignItems: 'center',
              }}
            >
              {filled ? (
                <ArabicText size={22} color="success">
                  {correctWord}
                </ArabicText>
              ) : (
                <Text variant="title" color="brandStrong">
                  ?
                </Text>
              )}
            </View>
          ) : (
            <ArabicText key={index} size={22}>
              {word}
            </ArabicText>
          )
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
        {options.map((option) => (
          <ChoiceCard
            key={option}
            label={option}
            labelScript="arabic"
            status={filled && option === correctWord ? 'correct' : wrongOption === option ? 'wrong' : 'idle'}
            disabled={filled}
            onPress={() => handleChoose(option)}
          />
        ))}
      </View>
    </View>
  );
}
