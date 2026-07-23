import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Dialog } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { getLast7DaysStatus, useAppStore } from '@/hooks/useAppStore';

const MILESTONES = [3, 7, 14, 30];

export interface StreakCalendarDialogProps {
  visible: boolean;
  onRequestClose: () => void;
}

export function StreakCalendarDialog({ visible, onRequestClose }: StreakCalendarDialogProps) {
  const { theme } = useTheme();
  const streakCount = useAppStore((s) => s.streakCount);
  const openedDates = useAppStore((s) => s.openedDates);
  const days = getLast7DaysStatus(openedDates);

  return (
    <Dialog
      visible={visible}
      onRequestClose={onRequestClose}
      title={`${streakCount} Day Streak`}
      message="Open 14 Stars every day to keep your streak alive."
      icon={<Ionicons name="flame" size={56} color={theme.palette.blossom[500]} />}
      actions={[{ label: 'Nice!', onPress: onRequestClose }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
        {days.map((day) => (
          <View key={day.date} style={{ alignItems: 'center', gap: 6 }}>
            <Text variant="caption" color="textSecondary">
              {day.label}
            </Text>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: day.opened ? theme.colors.brand : theme.colors.surfaceSunken,
                borderWidth: day.isToday ? 2 : 0,
                borderColor: theme.colors.brandStrong,
              }}
            >
              {day.opened && <Ionicons name="flame" size={16} color={theme.colors.textOnBrand} />}
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.xs }}>
        <Text variant="label" color="textSecondary">
          MILESTONES
        </Text>
        {MILESTONES.map((milestone) => {
          const reached = streakCount >= milestone;
          return (
            <View key={milestone} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Ionicons
                name={reached ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={reached ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text variant="bodySmall" color={reached ? 'textPrimary' : 'textSecondary'}>
                {`${milestone} Day Streak`}
              </Text>
            </View>
          );
        })}
      </View>
    </Dialog>
  );
}
