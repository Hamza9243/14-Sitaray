import { Route, Routes } from 'react-router-dom';

import { TabsLayout } from '@/components/TabsLayout';
import { DuaLessonScreen } from '@/screens/DuaLessonScreen';
import { DuaScreen } from '@/screens/DuaScreen';
import { KindnessMissionsScreen } from '@/screens/games/KindnessMissionsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ImamAliActivityScreen } from '@/screens/imamAli/ImamAliActivityScreen';
import { ImamAliHubScreen } from '@/screens/imamAli/ImamAliHubScreen';
import { LearnScreen } from '@/screens/LearnScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { QuizScreen } from '@/screens/QuizScreen';
import { RewardsScreen } from '@/screens/RewardsScreen';
import { StarsCollectionScreen } from '@/screens/StarsCollectionScreen';
import { StoriesScreen } from '@/screens/StoriesScreen';
import { StoryReaderScreen } from '@/screens/StoryReaderScreen';

/**
 * Replaces expo-router's file-system routing (src/app/**) — that convention relies on
 * Metro's own bundler plugin to scan the directory and generate routes, which doesn't
 * exist outside Expo's toolchain. This is a 1:1 hand-written mirror of the old route
 * tree: the 5 tab screens nested under TabsLayout (floating tab bar + <Outlet/>), every
 * other screen a sibling top-level route (full-screen, no tab bar), exactly matching
 * expo-router's default "push over the tabs" behavior for non-tab routes.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<TabsLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/stars" element={<StarsCollectionScreen />} />
        <Route path="/learn" element={<LearnScreen />} />
        <Route path="/rewards" element={<RewardsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>

      <Route path="/games/kindness-missions" element={<KindnessMissionsScreen />} />
      <Route path="/imam-ali" element={<ImamAliHubScreen />} />
      <Route path="/imam-ali/:activityId" element={<ImamAliActivityScreen />} />
      <Route path="/learn/duas" element={<DuaScreen />} />
      <Route path="/learn/duas/:duaId" element={<DuaLessonScreen />} />
      <Route path="/learn/quiz" element={<QuizScreen />} />
      <Route path="/learn/stories" element={<StoriesScreen />} />
      <Route path="/learn/stories/:storyId" element={<StoryReaderScreen />} />
    </Routes>
  );
}
