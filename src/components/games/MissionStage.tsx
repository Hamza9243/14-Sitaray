import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import type { Mission } from '@/types/games';

import { ChoiceCard, type ChoiceStatus } from './ChoiceCard';
import { DraggableEmoji, type DraggableEmojiHandle } from './DraggableEmoji';
import { DropZone, isInsideZone, type ZoneBounds } from './DropZone';

export interface MissionStageProps {
  mission: Mission;
  onComplete: () => void;
}

/**
 * Renders whichever interaction a mission needs (drag-single, drag-multi,
 * choice, tap-target, sequence) from the shared primitives. This is the one
 * place that knows how to turn a `Mission` config into gameplay.
 */
export function MissionStage({ mission, onComplete }: MissionStageProps) {
  if (mission.kind === 'sequence') {
    return <SequenceStage mission={mission} onComplete={onComplete} />;
  }
  if (mission.kind === 'choice' || mission.kind === 'tap-target') {
    return <ChoiceStage mission={mission} onComplete={onComplete} />;
  }
  return <DragStage mission={mission} onComplete={onComplete} />;
}

function DragStage({ mission, onComplete }: MissionStageProps) {
  const { theme } = useTheme();
  const items = mission.items ?? [];
  const itemRefs = useRef<Record<string, DraggableEmojiHandle | null>>({});
  const zoneBounds = useRef<ZoneBounds | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const requiredCount = mission.kind === 'drag-multi' ? items.filter((item) => item.correct).length : 1;

  function handleDrop(itemId: string, correct: boolean, x: number, y: number) {
    const ref = itemRefs.current[itemId];
    if (isInsideZone(x, y, zoneBounds.current)) {
      if (correct) {
        ref?.resolveDrop();
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResolvedIds((prev) => {
          const next = [...prev, itemId];
          if (next.length >= requiredCount) {
            setTimeout(onComplete, 500);
          }
          return next;
        });
        setRemovedIds((prev) => [...prev, itemId]);
        return;
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    ref?.rejectDrop();
  }

  return (
    <>
      <DropZone emoji={mission.zoneEmoji ?? '🎯'} label={mission.zoneLabel ?? 'Drop Here'} onBoundsChange={(b) => (zoneBounds.current = b)} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.xl, flexWrap: 'wrap', justifyContent: 'center' }}>
        {items
          .filter((item) => !removedIds.includes(item.id))
          .map((item) => (
            <DraggableEmoji
              key={item.id}
              ref={(node) => {
                itemRefs.current[item.id] = node;
              }}
              emoji={item.emoji}
              onDrop={(x, y) => handleDrop(item.id, item.correct, x, y)}
            />
          ))}
      </View>
    </>
  );
}

function ChoiceStage({ mission, onComplete }: MissionStageProps) {
  const { theme } = useTheme();
  const items = mission.items ?? [];
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({});
  const [locked, setLocked] = useState(false);

  function handleChoose(itemId: string, correct: boolean) {
    if (locked) return;
    if (correct) {
      setLocked(true);
      setStatuses((prev) => ({ ...prev, [itemId]: 'correct' }));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onComplete, 500);
    } else {
      setStatuses((prev) => ({ ...prev, [itemId]: 'wrong' }));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => setStatuses((prev) => ({ ...prev, [itemId]: 'idle' })), 500);
    }
  }

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.lg, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map((item) => (
        <ChoiceCard
          key={item.id}
          emoji={item.emoji}
          status={statuses[item.id] ?? 'idle'}
          disabled={locked}
          onPress={() => handleChoose(item.id, item.correct)}
        />
      ))}
    </View>
  );
}

function SequenceStage({ mission, onComplete }: MissionStageProps) {
  const { theme } = useTheme();
  const steps = useMemo(() => mission.steps ?? [], [mission.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const itemRef = useRef<DraggableEmojiHandle | null>(null);
  const zoneBounds = useRef<ZoneBounds | null>(null);
  const [removed, setRemoved] = useState(false);

  const step = steps[stepIndex];
  if (!step) return null;

  function handleDrop(x: number, y: number) {
    if (isInsideZone(x, y, zoneBounds.current)) {
      itemRef.current?.resolveDrop();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRemoved(true);
      setTimeout(() => {
        if (stepIndex + 1 >= steps.length) {
          onComplete();
        } else {
          setStepIndex((i) => i + 1);
          setRemoved(false);
        }
      }, 500);
      return;
    }
    itemRef.current?.rejectDrop();
  }

  return (
    <>
      <Text variant="bodyLarge" color="textSecondary" style={{ textAlign: 'center', marginBottom: 12 }}>
        {step.prompt}
      </Text>
      <DropZone emoji={step.zoneEmoji} label={step.zoneLabel} onBoundsChange={(b) => (zoneBounds.current = b)} />
      {!removed && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <DraggableEmoji ref={itemRef} emoji={step.item.emoji} onDrop={handleDrop} />
        </View>
      )}
    </>
  );
}
