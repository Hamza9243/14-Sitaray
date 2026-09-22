import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { TabsLayout } from '@/components/TabsLayout';
import { useAppStore } from '@/hooks/useAppStore';
import { DailyStarScreen } from '@/screens/DailyStarScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { DuaLessonScreen } from '@/screens/DuaLessonScreen';
import { DuaScreen } from '@/screens/DuaScreen';
import { FavoriteDuasScreen } from '@/screens/FavoriteDuasScreen';
import { CmsGameScreen } from '@/screens/games/CmsGameScreen';
import { KindnessMissionsScreen } from '@/screens/games/KindnessMissionsScreen';
import { StarGameScreen } from '@/screens/games/StarGameScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ImamAliActivityScreen } from '@/screens/imamAli/ImamAliActivityScreen';
import { ImamAliHubScreen } from '@/screens/imamAli/ImamAliHubScreen';
import { IncomingCallScreen } from '@/screens/IncomingCallScreen';
import { LearnScreen } from '@/screens/LearnScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { QuizScreen } from '@/screens/QuizScreen';
import { RemindersScreen } from '@/screens/RemindersScreen';
import { RewardsScreen } from '@/screens/RewardsScreen';
import { StarsCollectionScreen } from '@/screens/StarsCollectionScreen';
import { StoriesScreen } from '@/screens/StoriesScreen';
import { StoryReaderScreen } from '@/screens/StoryReaderScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';

/** First launch goes to /welcome; after that /welcome bounces home. A ringing call is never blocked. */
function OnboardingGate() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const { pathname } = useLocation();

  if (!hasHydrated) return null;
  if (!hasOnboarded && pathname !== '/welcome' && !pathname.startsWith('/incoming-call')) {
    return <Navigate to="/welcome" replace />;
  }
  if (hasOnboarded && pathname === '/welcome') return <Navigate to="/" replace />;
  return <Outlet />;
}

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
      <Route element={<OnboardingGate />}>
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route element={<TabsLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/stars" element={<StarsCollectionScreen />} />
        <Route path="/learn" element={<LearnScreen />} />
        <Route path="/rewards" element={<RewardsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>

      <Route path="/games/kindness-missions" element={<KindnessMissionsScreen />} />
      <Route path="/games/star/:starId" element={<StarGameScreen />} />
      <Route path="/games/cms/:gameId" element={<CmsGameScreen />} />
      <Route path="/daily-star" element={<DailyStarScreen />} />
      <Route path="/discover" element={<DiscoverScreen />} />
      <Route path="/imam-ali" element={<ImamAliHubScreen />} />
      <Route path="/imam-ali/:activityId" element={<ImamAliActivityScreen />} />
      <Route path="/learn/duas" element={<DuaScreen />} />
      <Route path="/learn/duas/favorites" element={<FavoriteDuasScreen />} />
      <Route path="/learn/duas/:duaId" element={<DuaLessonScreen />} />
      <Route path="/learn/quiz" element={<QuizScreen />} />
      <Route path="/learn/stories" element={<StoriesScreen />} />
      <Route path="/learn/stories/:storyId" element={<StoryReaderScreen />} />
      <Route path="/reminders" element={<RemindersScreen />} />
      <Route path="/incoming-call/:reminderId" element={<IncomingCallScreen />} />
      </Route>
    </Routes>
  );
}
