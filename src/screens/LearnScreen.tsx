import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppBar } from '@/components/ui/AppBar';
import { Card, CardBadge } from '@/components/ui/Card';
import { FloatingBackground } from '@/components/ui/FloatingBackground';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { DUAS, QUIZ_QUESTIONS, STORIES } from '@/data';
import { useTheme } from '@/design-system/useTheme';
import { useAppStore } from '@/hooks/useAppStore';

export function LearnScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const completedDuaIds = useAppStore((s) => s.completedDuaIds);
  const completedQuizIds = useAppStore((s) => s.completedQuizIds);
  const completedStoryIds = useAppStore((s) => s.completedStoryIds);

  const sections = [
    {
      key: 'duas',
      title: 'Duas',
      description: 'Learn short duas for everyday moments.',
      icon: 'hand-left' as const,
      tone: 'brand' as const,
      progress: completedDuaIds.length / DUAS.length,
      progressLabel: `${completedDuaIds.length} / ${DUAS.length} learned`,
      route: '/learn/duas' as const,
    },
    {
      key: 'quiz',
      title: 'Quiz Time',
      description: 'Test what you know with fun questions.',
      icon: 'help-circle' as const,
      tone: 'info' as const,
      progress: completedQuizIds.length / QUIZ_QUESTIONS.length,
      progressLabel: `${completedQuizIds.length} / ${QUIZ_QUESTIONS.length} answered`,
      route: '/learn/quiz' as const,
    },
    {
      key: 'stories',
      title: 'Stories',
      description: 'Beautiful stories about the 14 Stars.',
      icon: 'book' as const,
      tone: 'success' as const,
      progress: completedStoryIds.length / STORIES.length,
      progressLabel: `${completedStoryIds.length} / ${STORIES.length} finished`,
      route: '/learn/stories' as const,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FloatingBackground variant="day" density="low" />
      <AppBar title="Learn" large />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 140 }}>
        {sections.map((section) => (
          <Card key={section.key} variant="raised" onPress={() => router.push(section.route)}>
            <CardBadge label={section.title} tone={section.tone} />
            <Text variant="title" style={{ marginTop: theme.spacing.xs }}>
              {section.description}
            </Text>
            <View style={{ marginTop: theme.spacing.sm }}>
              <ProgressBar progress={section.progress} label={section.progressLabel} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
