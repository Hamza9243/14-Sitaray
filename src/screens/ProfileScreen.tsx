import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Text } from '@/components/ui/Text';
import { ACHIEVEMENTS } from '@/data';
import { TOTAL_STARS } from '@/data/stars';
import { useTheme } from '@/design-system/useTheme';
import { getEarnedAchievementIds, getUnlockedStarIds, useAppStore } from '@/hooks/useAppStore';

function StatTile({ label, value }: { label: string; value: string | number }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: '31%', alignItems: 'center', gap: 2 }}>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const { theme } = useTheme();
  const childName = useAppStore((s) => s.childName);
  const setChildName = useAppStore((s) => s.setChildName);
  const xp = useAppStore((s) => s.xp);
  const streakCount = useAppStore((s) => s.streakCount);
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const completedQuizIds = useAppStore((s) => s.completedQuizIds);
  const completedStoryIds = useAppStore((s) => s.completedStoryIds);
  const completedGameIds = useAppStore((s) => s.completedGameIds);

  const [editVisible, setEditVisible] = useState(false);
  const [draftName, setDraftName] = useState(childName);

  const unlockedCount = getUnlockedStarIds(xp).length;
  const earnedAchievements = getEarnedAchievementIds({
    xp,
    streakCount,
    completedDuaIds,
    completedQuizIds,
    completedStoryIds,
    completedGameIds,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Profile" large />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        <Card variant="raised" style={{ alignItems: 'center' }}>
          <LinearGradient
            colors={theme.gradients.starBurst}
            style={{ width: 84, height: 84, borderRadius: theme.radii.full, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="display" style={{ color: theme.colors.textOnBrand }}>
              {childName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
            <Text variant="h2">{childName}</Text>
            <Button
              iconOnly
              size="sm"
              variant="ghost"
              accessibilityLabel="Edit name"
              onPress={() => {
                setDraftName(childName);
                setEditVisible(true);
              }}
              leftIcon={<Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />}
            />
          </View>
          <Text variant="bodySmall" color="textSecondary">
            {`${unlockedCount} of ${TOTAL_STARS} Stars collected`}
          </Text>
        </Card>

        <Card variant="raised">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <StatTile label="Total XP" value={xp} />
            <StatTile label="Day Streak" value={streakCount} />
            <StatTile label="Stars" value={`${unlockedCount}/${TOTAL_STARS}`} />
            <StatTile label="Duas Learned" value={completedDuaIds.length} />
            <StatTile label="Quiz Correct" value={completedQuizIds.length} />
            <StatTile label="Stories Read" value={completedStoryIds.length} />
          </View>
        </Card>

        <Card variant="raised">
          <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
            Achievement Room
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.sm }}>
            {`${earnedAchievements.length} of ${ACHIEVEMENTS.length} badges earned`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ACHIEVEMENTS.filter((a) => earnedAchievements.includes(a.id)).map((achievement) => (
              <View
                key={achievement.id}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={achievement.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.brandStrong} />
              </View>
            ))}
            {earnedAchievements.length === 0 && (
              <Text variant="bodySmall" color="textSecondary">
                Complete activities to start earning badges!
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>

      <Dialog
        visible={editVisible}
        onRequestClose={() => setEditVisible(false)}
        title="Edit Your Name"
        actions={[
          { label: 'Save', onPress: () => { setChildName(draftName.trim() || childName); setEditVisible(false); } },
          { label: 'Cancel', variant: 'ghost', onPress: () => setEditVisible(false) },
        ]}
      >
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Your name"
          maxLength={20}
          style={{
            marginTop: theme.spacing.sm,
            borderWidth: 2,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            fontFamily: theme.fontFamily.body,
            fontSize: 16,
            color: theme.colors.textPrimary,
          }}
        />
      </Dialog>
    </View>
  );
}
