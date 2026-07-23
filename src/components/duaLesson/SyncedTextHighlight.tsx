import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ArabicText } from '@/components/ui/ArabicText';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

interface WordRange {
  word: string;
  start: number;
  end: number;
}

/** expo-speech only re-exports the callback type, not the event shape it's called with — mirrored locally. */
interface BoundaryEvent {
  charIndex: number;
  charLength: number;
}

function splitWithRanges(text: string): WordRange[] {
  const ranges: WordRange[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(text))) {
    ranges.push({ word: match[0], start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

export interface SyncedTextHighlightProps {
  text: string;
  /** 'arabic' renders with the Noto Naskh Arabic font, RTL layout, and an Arabic TTS voice. */
  script?: 'arabic' | 'latin';
  /** Starts playing automatically as soon as this becomes true (e.g. once this step is shown). */
  autoPlay?: boolean;
  /** expo-speech playback rate — 1 is normal, <1 slower, >1 faster. */
  rate?: number;
  onDone?: () => void;
}

/**
 * Plays the text through on-device TTS and highlights each word as it's
 * spoken, using expo-speech's real `onBoundary` char-offset events (not
 * simulated timing). Note: there's no recorded Arabic recitation audio in
 * this app — this is an on-device Arabic TTS voice reading the dua text,
 * not authentic Qira'at.
 */
export function SyncedTextHighlight({ text, script = 'arabic', autoPlay, rate = 1, onDone }: SyncedTextHighlightProps) {
  const { theme } = useTheme();
  const words = useMemo(() => splitWithRanges(text), [text]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const hasAutoPlayed = useRef(false);

  function play() {
    Speech.stop();
    setSpeaking(true);
    setActiveIndex(-1);
    Speech.speak(text, {
      language: script === 'arabic' ? 'ar-SA' : 'en-US',
      rate,
      onBoundary: (event: BoundaryEvent) => {
        const { charIndex } = event;
        if (typeof charIndex !== 'number') return;
        const index = words.findIndex((w) => charIndex >= w.start && charIndex < w.end);
        if (index >= 0) setActiveIndex(index);
      },
      onDone: () => {
        setSpeaking(false);
        setActiveIndex(-1);
        onDone?.();
      },
      onStopped: () => {
        setSpeaking(false);
      },
    });
  }

  useEffect(() => {
    if (autoPlay && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: script === 'arabic' ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {words.map((w, index) => (
          <HighlightWord key={`${w.word}-${index}`} word={w.word} script={script} active={index === activeIndex} />
        ))}
      </View>

      <AnimatedPressable
        onPress={play}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={speaking ? 'Replay' : 'Play'}
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
        <Ionicons name={speaking ? 'volume-high' : 'play'} size={28} color={theme.colors.textOnBrand} />
      </AnimatedPressable>
    </View>
  );
}

function HighlightWord({ word, script, active }: { word: string; script: 'arabic' | 'latin'; active: boolean }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.12 : 1, theme.motion.spring.bouncy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: theme.radii.sm,
          backgroundColor: active ? theme.colors.brand : 'transparent',
        },
      ]}
    >
      {script === 'arabic' ? (
        <ArabicText size={30} weight="semiBold" color={active ? 'textOnBrand' : 'textPrimary'}>
          {word}
        </ArabicText>
      ) : (
        <Text variant="h3" style={{ color: active ? theme.colors.textOnBrand : theme.colors.textPrimary }}>
          {word}
        </Text>
      )}
    </Animated.View>
  );
}
