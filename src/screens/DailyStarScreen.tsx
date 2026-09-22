import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { useDailyStar, useDirStyle } from '@/cms/hooks';
import { DuaAudioPlayer } from '@/components/duaLesson/DuaAudioPlayer';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Card, CardBadge } from '@/components/ui/Card';
import { Emoji } from '@/components/ui/Emoji';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';

/** Today's Daily Star from the CMS: a short story, its lesson and a one-line takeaway. */
export function DailyStarScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dailyStar = useDailyStar();
  const dir = useDirStyle();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />
      <AppBar title="Daily Star" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        {!dailyStar ? (
          <Card variant="raised" style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
            <Emoji size={48}>🌙</Emoji>
            <Text variant="h3" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              No Daily Star today
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
              Check back tomorrow for a new story and lesson.
            </Text>
            <Button label="Back Home" onPress={() => router.replace('/')} fullWidth style={{ marginTop: theme.spacing.lg }} />
          </Card>
        ) : (
          <>
            {dailyStar.coverImageUrl ? (
              <Image
                source={{ uri: dailyStar.coverImageUrl }}
                style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: theme.radii.lg }}
                contentFit="cover"
                accessibilityLabel={dailyStar.title}
              />
            ) : null}

            <View style={{ gap: theme.spacing.xs }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                <CardBadge label="Today's Daily Star" tone="info" />
                {dailyStar.minutes ? <CardBadge label={`${dailyStar.minutes} min`} tone="neutral" /> : null}
              </View>
              <Text variant="h2" style={dir(dailyStar.title)}>
                {dailyStar.title}
              </Text>
            </View>

            {dailyStar.audioUrl ? (
              <Card variant="raised">
                <DuaAudioPlayer key={dailyStar.audioUrl} audioUrl={dailyStar.audioUrl} />
              </Card>
            ) : null}

            {dailyStar.shortStory ? (
              <Card variant="raised">
                <Text variant="bodyLarge" style={dir(dailyStar.shortStory)}>
                  {dailyStar.shortStory}
                </Text>
              </Card>
            ) : null}

            {dailyStar.lesson ? (
              <Card variant="flat" style={{ backgroundColor: theme.colors.brandSoft }}>
                <Text variant="label" color="brandStrong">
                  TODAY&apos;S LESSON
                </Text>
                <Text variant="body" style={[{ marginTop: theme.spacing.xs }, dir(dailyStar.lesson)]}>
                  {dailyStar.lesson}
                </Text>
              </Card>
            ) : null}

            {dailyStar.takeaway ? (
              <Card variant="flat" style={{ backgroundColor: theme.colors.successSurface }}>
                <Text variant="label" color="success">
                  REMEMBER
                </Text>
                <Text variant="title" style={[{ marginTop: theme.spacing.xs }, dir(dailyStar.takeaway)]}>
                  {dailyStar.takeaway}
                </Text>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
