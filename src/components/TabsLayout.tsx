import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/useTheme';
import { Ionicons } from '@/shims/vector-icons';

type IconName = string;

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/stars', label: '14 Stars', icon: 'star' },
  { path: '/learn', label: 'Learn', icon: 'book' },
  { path: '/rewards', label: 'Rewards', icon: 'trophy' },
  { path: '/profile', label: 'Profile', icon: 'person' },
];

/**
 * Replaces expo-router's `<Tabs>` (which auto-generates a native tab bar from
 * `Tabs.Screen` configs) with a hand-built floating bar + `<Outlet/>` — same visual
 * spec as the old (tabs)/_layout.tsx screenOptions.
 */
export function TabsLayout() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <View style={{ flex: 1 }}>
      <Outlet />

      <View
        style={{
          position: 'absolute',
          left: theme.spacing.md,
          right: theme.spacing.md,
          bottom: theme.spacing.md,
          height: 68,
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.surface,
          flexDirection: 'row',
          paddingTop: theme.spacing.xs,
          ...theme.shadow('lg'),
        }}
      >
        {TABS.map((tab) => {
          const focused = location.pathname === tab.path;
          const color: ColorValue = focused ? theme.colors.brandStrong : theme.colors.textSecondary;

          return (
            <AnimatedPressable
              key={tab.path}
              onPress={() => navigate(tab.path)}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={24} color={color as string} />
              <Text
                style={{
                  fontFamily: theme.fontFamily.bodyBold,
                  fontSize: 11,
                  color: color as string,
                }}
              >
                {tab.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
