import { gradients } from '@/design-system/tokens/colors';

export type CharacterId = 'ali' | 'sakina';

/** Matches the reminder types this feature supports — extend here to add new call contexts. */
export type ReminderActivityType = 'story' | 'dua' | 'game' | 'learning';

export const REMINDER_ACTIVITY_TYPES: ReminderActivityType[] = ['story', 'dua', 'game', 'learning'];

export const REMINDER_ACTIVITY_LABELS: Record<ReminderActivityType, string> = {
  story: 'Story Time',
  dua: 'Dua Time',
  game: 'Game Challenge',
  learning: 'Learning Time',
};

/** Where each reminder type deep-links to — reuses the app's existing route tree (router.tsx). */
export const REMINDER_ACTIVITY_ROUTES: Record<ReminderActivityType, string> = {
  story: '/learn/stories',
  dua: '/learn/duas',
  game: '/games/kindness-missions',
  learning: '/learn',
};

export interface CharacterAudioSet {
  welcome: string;
  story: string;
  dua: string;
  game: string;
  learning: string;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  gender: 'boy' | 'girl';
  emoji: string;
  gradient: readonly [string, string, string] | readonly [string, string];
  /**
   * On-screen caption + the line the pre-recorded audio should say, per reminder type.
   * Kept as plain, easily-editable data — no grammar templating — since "raha/rahi hoon"
   * gendered phrasing doesn't reduce to a simple find/replace.
   */
  dialogueByType: Record<ReminderActivityType, string>;
  /**
   * Local audio file paths, served from `public/audio/characters/<id>/` (see that folder's
   * README for exact filenames expected). These are plain runtime strings, not bundler
   * imports — a missing file just fails to load at playback time (handled gracefully by
   * CharacterAudioManager) instead of breaking the production build.
   */
  audio: CharacterAudioSet;
}

const ALI_AUDIO_BASE = '/audio/characters/ali';
const SAKINA_AUDIO_BASE = '/audio/characters/sakina';

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  ali: {
    id: 'ali',
    name: 'Ali',
    gender: 'boy',
    emoji: '👦',
    gradient: gradients.skyClimb,
    dialogueByType: {
      story: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar raha hoon. Chalo, aaj ki story sunte hain!',
      dua: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar raha hoon. Chalo, aaj ki dua parhte hain!',
      game: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar raha hoon. Chalo, aaj ka challenge complete karte hain!',
      learning: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar raha hoon. Chalo, aaj kuch naya seekhte hain!',
    },
    audio: {
      welcome: `${ALI_AUDIO_BASE}/welcome.mp3`,
      story: `${ALI_AUDIO_BASE}/story.mp3`,
      dua: `${ALI_AUDIO_BASE}/dua.mp3`,
      game: `${ALI_AUDIO_BASE}/game.mp3`,
      learning: `${ALI_AUDIO_BASE}/learning.mp3`,
    },
  },
  sakina: {
    id: 'sakina',
    name: 'Sakina',
    gender: 'girl',
    emoji: '👧',
    gradient: gradients.berryPop,
    dialogueByType: {
      story: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar rahi hoon. Chalo, aaj ki story sunte hain!',
      dua: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar rahi hoon. Chalo, aaj ki dua parhte hain!',
      game: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar rahi hoon. Chalo, aaj ka challenge complete karte hain!',
      learning: 'Assalam-o-Alaikum! Main aap ka kab se intezar kar rahi hoon. Chalo, aaj kuch naya seekhte hain!',
    },
    audio: {
      welcome: `${SAKINA_AUDIO_BASE}/welcome.mp3`,
      story: `${SAKINA_AUDIO_BASE}/story.mp3`,
      dua: `${SAKINA_AUDIO_BASE}/dua.mp3`,
      game: `${SAKINA_AUDIO_BASE}/game.mp3`,
      learning: `${SAKINA_AUDIO_BASE}/learning.mp3`,
    },
  },
};

/** Boy profile -> Ali, girl profile -> Sakina. No manual caller selection anywhere in the parent UI. */
export function characterForGender(gender: 'boy' | 'girl' | null): CharacterDefinition {
  return CHARACTERS[gender === 'girl' ? 'sakina' : 'ali'];
}
