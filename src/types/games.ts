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
