import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useCmsGames, useDirStyle, useGoodDeeds, useReflections, useWisdom } from '@/cms/hooks';
import { DuaAudioPlayer } from '@/components/duaLesson/DuaAudioPlayer';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AppBar } from '@/components/ui/AppBar';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button } from '@/components/ui/Button';
import { Card, CardBadge } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

type Tab = 'deeds' | 'reflections' | 'wisdom' | 'games';

const TABS: { key: Tab; label: string }[] = [
  { key: 'deeds', label: 'Good Deeds' },
  { key: 'reflections', label: 'Reflections' },
  { key: 'wisdom', label: 'Wisdom' },
  { key: 'games', label: 'Games' },
];

/** Extra content published from the CMS: good deeds, reflections, words of wisdom and games. */
export function DiscoverScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('deeds');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />
      <AppBar title="Discover" onBack={() => router.back()} />

      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map((t) => (
            <TabPill key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        {tab === 'deeds' && <DeedsSection />}
        {tab === 'reflections' && <ReflectionsSection />}
        {tab === 'wisdom' && <WisdomSection />}
        {tab === 'games' && <GamesSection />}
      </ScrollView>
    </View>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.full,
        backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSunken,
      }}
    >
      <Text variant="button" style={{ fontSize: 14, color: active ? theme.colors.textOnBrand : theme.colors.textSecondary }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function EmptyState({ emoji, title }: { emoji: string; title: string }) {
  const { theme } = useTheme();
  return (
    <Card variant="raised" style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
      <Emoji size={48}>{emoji}</Emoji>
      <Text variant="h3" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
        New things are added all the time — check back soon!
      </Text>
    </Card>
  );
}

function MediaImage({ uri, label }: { uri?: string; label: string }) {
  const { theme } = useTheme();
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm }}
      contentFit="cover"
      accessibilityLabel={label}
    />
  );
}

function DeedsSection() {
  const { theme } = useTheme();
  const deeds = useGoodDeeds();
  const dir = useDirStyle();
  const completedDeedIds = useAppStore((s) => s.completedDeedIds);
  const toggleDeed = useAppStore((s) => s.toggleDeed);

  if (deeds.length === 0) return <EmptyState emoji="🌟" title="No good deeds yet" />;
  const done = deeds.filter((d) => completedDeedIds.includes(d.id)).length;

  return (
    <>
      <Text variant="bodySmall" color="textSecondary">
        {`${done} of ${deeds.length} done — tick a deed when you have done it.`}
      </Text>
      {deeds.map((deed) => {
        const completed = completedDeedIds.includes(deed.id);
        return (
          <Card key={deed.id} variant="raised" glowColor={completed ? theme.palette.star[500] : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {deed.iconUrl ? (
                  <Image source={{ uri: deed.iconUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                ) : (
                  <Emoji size={28}>{deed.emoji}</Emoji>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={dir(deed.title)}>
                  {deed.title}
                </Text>
                {deed.description ? (
                  <Text variant="bodySmall" color="textSecondary" style={dir(deed.description)}>
                    {deed.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
              <Text variant="caption" color="brandStrong">
                {`${deed.points} points`}
              </Text>
              <Button
                label={completed ? 'Done!' : 'I did it'}
                size="sm"
                variant={completed ? 'secondary' : 'primary'}
                onPress={() => toggleDeed(deed.id)}
                leftIcon={completed ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} /> : undefined}
              />
            </View>
          </Card>
        );
      })}
    </>
  );
}

function ReflectionsSection() {
  const { theme } = useTheme();
  const reflections = useReflections();
  const dir = useDirStyle();

  if (reflections.length === 0) return <EmptyState emoji="💭" title="No reflections yet" />;

  return (
    <>
      {reflections.map((r) => (
        <Card key={r.id} variant="raised">
          <MediaImage uri={r.imageUrl} label={r.question} />
          <CardBadge label="Think about it" tone="info" />
          <Text variant="title" style={[{ marginTop: theme.spacing.xs }, dir(r.question)]}>
            {r.question}
          </Text>
          {r.description ? (
            <Text variant="body" color="textSecondary" style={[{ marginTop: theme.spacing.xs }, dir(r.description)]}>
              {r.description}
            </Text>
          ) : null}
          {r.audioUrl ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <DuaAudioPlayer key={r.audioUrl} audioUrl={r.audioUrl} />
            </View>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function WisdomSection() {
  const { theme } = useTheme();
  const wisdom = useWisdom();
  const dir = useDirStyle();

  if (wisdom.length === 0) return <EmptyState emoji="📜" title="No words of wisdom yet" />;

  return (
    <>
      {wisdom.map((w) => (
        <Card key={w.id} variant="raised">
          <MediaImage uri={w.imageUrl} label={w.title} />
          <CardBadge label="Wisdom" tone="brand" />
          <Text variant="title" style={[{ marginTop: theme.spacing.xs }, dir(w.title)]}>
            {w.title}
          </Text>
          <Text variant="bodyLarge" style={[{ marginTop: theme.spacing.xs }, dir(w.text)]}>
            {w.text}
          </Text>
          {w.arabic ? (
            <ArabicText size={26} weight="semiBold" style={{ marginTop: theme.spacing.sm }}>
              {w.arabic}
            </ArabicText>
          ) : null}
          {w.translation ? (
            <Text variant="body" style={[{ marginTop: theme.spacing.xs, fontStyle: 'italic' }, dir(w.translation)]}>
              {w.translation}
            </Text>
          ) : null}
          {w.explanation ? (
            <Text variant="bodySmall" color="textSecondary" style={[{ marginTop: theme.spacing.xs }, dir(w.explanation)]}>
              {w.explanation}
            </Text>
          ) : null}
          {w.audioUrl ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <DuaAudioPlayer key={w.audioUrl} audioUrl={w.audioUrl} />
            </View>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function GamesSection(): ReactNode {
  const { theme } = useTheme();
  const router = useRouter();
  const games = useCmsGames();
  const dir = useDirStyle();
  const completedGameIds = useAppStore((s) => s.completedGameIds);

  if (games.length === 0) return <EmptyState emoji="🎮" title="No games yet" />;

  return (
    <>
      {games.map((game) => {
        const completed = completedGameIds.includes(`cms-game-${game.id}`);
        return (
          <Card key={game.id} variant="raised" onPress={() => router.push(`/games/cms/${game.id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.brandSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {game.thumbnailUrl ? (
                  <Image source={{ uri: game.thumbnailUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                ) : (
                  <Emoji size={28}>{game.emoji}</Emoji>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={dir(game.name)}>
                  {game.name}
                </Text>
                {game.description ? (
                  <Text variant="bodySmall" color="textSecondary" numberOfLines={2} style={dir(game.description)}>
                    {game.description}
                  </Text>
                ) : null}
                <Text variant="caption" color={completed ? 'success' : 'brandStrong'}>
                  {completed ? 'Completed' : `Play · +${game.rewardPoints} XP`}
                </Text>
              </View>
              {completed ? (
                <Ionicons name="checkmark-circle" size={26} color={theme.colors.success} />
              ) : (
                <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
              )}
            </View>
          </Card>
        );
      })}
    </>
  );
}
