import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/design-system/useTheme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: ColorValue }) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={24} color={color as string} />;
}

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brandStrong,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          left: theme.spacing.md,
          right: theme.spacing.md,
          bottom: theme.spacing.md,
          height: 68,
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          paddingTop: theme.spacing.xs,
          ...theme.shadow('lg'),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stars"
        options={{
          title: '14 Stars',
          tabBarIcon: ({ focused, color }) => <TabIcon name="star" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused, color }) => <TabIcon name="book" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ focused, color }) => <TabIcon name="trophy" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
