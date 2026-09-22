import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDirStyle, useDuas } from '@/cms/hooks';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

/** The child's saved duas — reads the same `favoriteDuaIds` the heart toggle on the Duas list writes. */
export function FavoriteDuasScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const favoriteDuaIds = useAppStore((s) => s.favoriteDuaIds);
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const toggleFavoriteDua = useAppStore((s) => s.toggleFavoriteDua);

  const duas = useDuas();
  const dir = useDirStyle();

  const favorites = duas.filter((dua) => favoriteDuaIds.includes(dua.id));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar title="Favourite Duas" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        {favorites.length === 0 ? (
          <Card variant="raised" style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
            <Emoji size={48}>🤍</Emoji>
            <Text variant="h3" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              No favourite duas yet
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              Tap the heart on any dua to save it here so you can find it quickly.
            </Text>
            <Button label="Browse Duas" onPress={() => router.replace('/learn/duas')} fullWidth style={{ marginTop: theme.spacing.lg }} />
          </Card>
        ) : (
          favorites.map((dua) => {
            const completed = completedDuaIds.includes(dua.id);
            return (
              <Card key={dua.id} variant="raised">
                <AnimatedPressable
                  onPress={() => router.push(`/learn/duas/${dua.id}`)}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${dua.title}`}
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
                    <Text variant="title" style={dir(dua.title)}>{dua.title}</Text>
                    <Text variant="bodySmall" color="textSecondary" numberOfLines={1} style={dir(dua.meaningExplainer)}>
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
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    onPress={() => toggleFavoriteDua(dua.id)}
                    accessibilityLabel={`Remove ${dua.title} from favourites`}
                    leftIcon={<Ionicons name="heart-dislike-outline" size={18} color={theme.palette.blossom[500]} />}
                  />
                  <Text variant="caption" color={completed ? 'success' : 'brandStrong'}>
                    {completed ? 'Learned' : `Learn it · +${dua.xpReward} XP`}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
