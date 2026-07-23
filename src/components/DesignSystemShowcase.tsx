import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design-system/useTheme';

import {
  AppBar,
  Button,
  Card,
  CardBadge,
  CharacterCard,
  Dialog,
  FloatingBackground,
  ProgressBar,
  StarIcon,
  StarProgressRing,
  StarRating,
  Text,
} from '@/components/ui';

export function DesignSystemShowcase() {
  const { theme, preference, setPreference } = useTheme();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [rating, setRating] = useState(3);
  const [progress, setProgress] = useState(0.35);

  return (
    <View style={{ flex: 1 }}>
      <FloatingBackground variant="day" density="low" />

      <AppBar
        title="Design System"
        large
        actions={[
          {
            icon: preference === 'dark' ? 'sunny-outline' : 'moon-outline',
            onPress: () => setPreference(preference === 'dark' ? 'light' : 'dark'),
            accessibilityLabel: 'Toggle theme',
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}
      >
        <Section title="Buttons">
          <View style={{ gap: theme.spacing.sm }}>
            <Button label="Start Learning" variant="primary" onPress={() => {}} fullWidth />
            <Button label="Secondary Action" variant="secondary" onPress={() => {}} fullWidth />
            <Button label="Outline" variant="outline" onPress={() => {}} fullWidth />
            <Button label="Ghost" variant="ghost" onPress={() => {}} fullWidth />
            <Button label="Danger" variant="danger" onPress={() => {}} fullWidth />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
              <Button label="Small" size="sm" onPress={() => {}} />
              <Button label="Medium" size="md" onPress={() => {}} />
              <Button label="Large" size="lg" onPress={() => {}} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
              <Button iconOnly leftIcon={<Ionicons name="heart" size={20} color={theme.colors.textOnBrand} />} onPress={() => {}} accessibilityLabel="Favorite" />
              <Button label="Loading…" loading onPress={() => {}} />
              <Button label="Disabled" disabled onPress={() => {}} />
            </View>
          </View>
        </Section>

        <Section title="Cards">
          <Card variant="raised" style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="title">Raised Card</Text>
            <Text variant="bodySmall" color="textSecondary">
              The default surface for stories, lessons, and stats.
            </Text>
            <View style={{ marginTop: theme.spacing.sm, flexDirection: 'row', gap: theme.spacing.xs }}>
              <CardBadge label="New" tone="brand" />
              <CardBadge label="5 min" tone="neutral" />
            </View>
          </Card>
          <Card variant="outline">
            <Text variant="title">Outline Card</Text>
            <Text variant="bodySmall" color="textSecondary">
              Lower-emphasis container, e.g. settings rows.
            </Text>
          </Card>
        </Section>

        <Section title="Character Cards">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
            <CharacterCard title="Prophet" subtitle="Stories & Akhlaq" badgeLabel="12 stars" onPress={() => {}} />
            <CharacterCard title="Zahra" subtitle="Stories & Akhlaq" onPress={() => {}} />
            <CharacterCard title="Hasan" subtitle="Locked" locked onPress={() => {}} />
          </ScrollView>
        </Section>

        <Section title="Star Widgets">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl, flexWrap: 'wrap' }}>
            <StarProgressRing current={12} total={20} caption="this week" />
            <View style={{ gap: theme.spacing.sm }}>
              <StarRating value={rating} onChange={setRating} />
              <Text variant="bodySmall" color="textSecondary">
                Tap a star to rate ({rating}/5)
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.xxs }}>
                <StarIcon size={20} fill={1} />
                <StarIcon size={20} fill={0.5} />
                <StarIcon size={20} fill={0} />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Progress">
          <ProgressBar progress={progress} label="Salah lessons" showPercentage />
          <View style={{ height: theme.spacing.sm }} />
          <Button
            label="Advance progress"
            variant="secondary"
            onPress={() => setProgress((p) => (p >= 1 ? 0.1 : Math.min(1, p + 0.15)))}
          />
        </Section>

        <Section title="Dialog">
          <Button label="Show celebration dialog" onPress={() => setDialogVisible(true)} />
        </Section>

        <Section title="Floating Background — Night">
          <View style={{ height: 160, borderRadius: theme.radii.lg, overflow: 'hidden' }}>
            <FloatingBackground variant="night" density="high">
              <View style={styles.nightPreviewContent}>
                <Text variant="title" style={{ color: theme.colors.textInverse }}>
                  Star Map
                </Text>
              </View>
            </FloatingBackground>
          </View>
        </Section>
      </ScrollView>

      <Dialog
        visible={dialogVisible}
        onRequestClose={() => setDialogVisible(false)}
        icon={<StarIcon size={56} fill={1} />}
        title="3 Stars Earned!"
        message="Great job finishing today's lesson. Keep your streak going!"
        actions={[{ label: 'Awesome!', onPress: () => setDialogVisible(false) }]}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  nightPreviewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
