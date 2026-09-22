export interface GameItem {
  id: string;
  emoji: string;
  /** Whether dropping/choosing this item is the right answer. */
  correct: boolean;
}

export type MissionKind = 'drag-single' | 'drag-multi' | 'choice' | 'tap-target' | 'sequence';

export interface SequenceStep {
  prompt: string;
  /** The single item dragged/tapped to complete this step. */
  item: GameItem;
  zoneEmoji: string;
  zoneLabel: string;
}

export interface Mission {
  id: string;
  kind: MissionKind;
  prompt: string;
  characterEmoji: string;
  /** For drag-single / drag-multi / choice missions. */
  items?: GameItem[];
  zoneEmoji?: string;
  zoneLabel?: string;
  /** For `sequence` missions (e.g. plant the seed, then water it). */
  steps?: SequenceStep[];
  successMessage: string;
  xpReward: number;
}

export interface MiniGameDefinition {
  id: string;
  title: string;
  /** The Star this game unlocks after / belongs to. */
  starId: number;
  missions: Mission[];
  totalXpReward: number;
  badgeTitle: string;
  badgeDescription: string;
}

/**
 * Shared contract every standalone activity component must implement —
 * each activity in a multi-activity game hub (e.g. Imam Ali's 8 activities)
 * is its own bespoke component, not a data-driven renderer like `Mission`,
 * but they all plug into the same hub/shell via this interface.
 */
export interface ActivityProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

export interface ActivityDefinition {
  id: string;
  title: string;
  /** Optional Urdu title — bilingual content isn't wired into the UI yet, but the field exists so it can be added later without a data reshape. */
  titleUrdu?: string;
  description: string;
  /** A short symbolic glyph for the hub card — never a human figure for Masoomeen-related hubs. */
  icon: string;
  estimatedSeconds: number;
  /** XP awarded once, the first time this activity is completed. */
  xpReward: number;
}

export interface CertificateSaying {
  english: string;
  urdu?: string;
  attribution: string;
}

/** A full multi-activity game hub belonging to one Star (Ma'sumeen figure) — e.g. Imam Ali's 8 activities. */
export interface GameHubDefinition {
  id: string;
  starId: number;
  title: string;
  subtitle: string;
  activities: ActivityDefinition[];
  certificateSaying: CertificateSaying;
}

export interface StarGameChoiceRound {
  prompt: string;
  emoji?: string;
  options: { emoji: string; label: string }[];
  correctIndex: number;
  explanation: string;
}

export interface StarGameSortItem {
  emoji: string;
  label: string;
  /** Index into the game's `buckets` this item belongs in. */
  bucket: 0 | 1;
}

interface StarGameBase {
  starId: number;
  title: string;
  intro: string;
  icon: string;
  xpReward: number;
  badgeTitle: string;
  /** Kid-friendly closing line shown on the completion card. */
  closing: string;
}

/** Pick-the-best-answer scenarios, one per round. */
export interface StarChoiceGame extends StarGameBase {
  kind: 'choice';
  rounds: StarGameChoiceRound[];
}

/** Tap a card on the left, then its match on the right. */
export interface StarMatchGame extends StarGameBase {
  kind: 'match';
  pairs: { left: { emoji: string; label: string }; right: { emoji: string; label: string } }[];
}

/** Tap the steps in the correct order. `steps` are listed in the correct order and shuffled at runtime. */
export interface StarOrderGame extends StarGameBase {
  kind: 'order';
  prompt: string;
  steps: { emoji: string; label: string }[];
}

/** Sort each item into one of two buckets. */
export interface StarSortGame extends StarGameBase {
  kind: 'sort';
  prompt: string;
  buckets: [{ emoji: string; label: string }, { emoji: string; label: string }];
  items: StarGameSortItem[];
}

export type StarGameDefinition = StarChoiceGame | StarMatchGame | StarOrderGame | StarSortGame;
