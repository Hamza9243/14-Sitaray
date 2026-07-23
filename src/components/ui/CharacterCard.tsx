import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design-system/useTheme';

import { Card, CardBadge } from './Card';
import { Text } from './Text';

export interface CharacterCardProps {
  title: string;
  subtitle?: string;
  /** Illustration/portrait. When omitted, a gradient initial-avatar is shown instead. */
  image?: ImageSource | number;
  badgeLabel?: string;
  locked?: boolean;
  onPress?: () => void;
  width?: number;
}

/** A character/story tile — used for the 14 Ma'sumeen library, prophet stories, etc. */
export function CharacterCard({ title, subtitle, image, badgeLabel, locked, onPress, width = 156 }: CharacterCardProps) {
  const { theme } = useTheme();

  return (
    <Card
      variant="raised"
      padding="sm"
      onPress={onPress}
      style={{ width }}
      glowColor={theme.palette.night[600]}
      accessibilityLabel={title}
    >
      <View style={styles.portraitWrap}>
        {image ? (
          <Image source={image} style={styles.portrait} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={theme.gradients.nightSky}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.portrait, styles.portraitFallback]}
          >
            <Text variant="h2" style={{ color: theme.colors.textInverse }}>
              {title.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}

        {locked && (
          <View style={[StyleSheet.absoluteFill, styles.lockOverlay, { backgroundColor: theme.colors.overlay, borderRadius: theme.radii.md }]}>
            <Ionicons name="lock-closed" size={22} color={theme.colors.textInverse} />
          </View>
        )}

        {badgeLabel && !locked && (
          <View style={styles.badgeAnchor}>
            <CardBadge label={badgeLabel} tone="brand" />
          </View>
        )}
      </View>

      <Text variant="title" numberOfLines={1} style={{ marginTop: theme.spacing.xs }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  portraitWrap: {
    position: 'relative',
  },
  portrait: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  portraitFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeAnchor: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
