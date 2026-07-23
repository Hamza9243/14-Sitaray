import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppBar } from '@/components/ui/AppBar';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { DUAS } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

export function DuaScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const favoriteDuaIds = useAppStore((s) => s.favoriteDuaIds);
  const toggleFavoriteDua = useAppStore((s) => s.toggleFavoriteDua);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Duas" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        <ProgressBar progress={completedDuaIds.length / DUAS.length} label="Duas learned" showPercentage />

        {DUAS.map((dua) => {
          const completed = completedDuaIds.includes(dua.id);
          const favorite = favoriteDuaIds.includes(dua.id);

          return (
            <Card key={dua.id} variant="raised">
              <AnimatedPressable
                onPress={() => router.push(`/learn/duas/${dua.id}`)}
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={dua.title}
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: theme.radii.full,
                    backgroundColor: theme.colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Emoji size={28}>{dua.meaningEmoji}</Emoji>
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="title">{dua.title}</Text>
                  <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
                    {dua.meaningExplainer}
                  </Text>
                </View>

                {completed ? (
                  <Ionicons name="checkmark-circle" size={26} color={theme.colors.success} />
                ) : (
                  <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
                )}
              </AnimatedPressable>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.sm }}>
                <Button
                  iconOnly
                  size="sm"
                  variant="ghost"
                  onPress={() => toggleFavoriteDua(dua.id)}
                  accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  leftIcon={<Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={theme.palette.blossom[500]} />}
                />
                <Text variant="caption" color={completed ? 'success' : 'brandStrong'}>
                  {completed ? 'Learned' : `Learn it · +${dua.xpReward} XP`}
                </Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
