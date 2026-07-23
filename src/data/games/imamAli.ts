import type { GameHubDefinition } from '@/types/games';

export const IMAM_ALI_HUB_ID = 'imam-ali-hub';

/**
 * Imam Ali (a.s.) game hub — 8 standalone activities. Per the project's
 * religious-content rule, none of these represent him as a human figure;
 * each activity's icon is a symbolic object (door, scale, wheel, night sky,
 * gate, scroll, giving hands, food) consistent with how the activities
 * themselves are designed to represent him — through light, calligraphy,
 * and symbolic objects only.
 *
 * Activities are unlocked sequentially (activity N unlocks once N-1 is
 * complete); completing all 8 awards the certificate. There is no star/XP
 * reward system inside this hub — only completion checkmarks, matching the
 * "certificate is the only reward" requirement.
 */
export const IMAM_ALI_HUB: GameHubDefinition = {
  id: IMAM_ALI_HUB_ID,
  starId: 2,
  title: 'Imam Ali (a.s.)',
  subtitle: 'Asadullah · The Lion of Allah',
  activities: [
    {
      id: 'bab-ul-ilm-quiz',
      title: 'Bab-ul-Ilm Quiz',
      description: 'Answer 5 questions to open the doors to the City of Knowledge.',
      icon: '🚪',
      estimatedSeconds: 60,
    },
    {
      id: 'adl-ka-taraazu',
      title: 'Adl ka Taraazu',
      description: 'Help the scale of justice balance perfectly by choosing what is fair.',
      icon: '⚖️',
      estimatedSeconds: 60,
    },
    {
      id: 'alqaab-wheel',
      title: 'Alqaab Wheel',
      description: 'Spin the wheel of his titles and learn what each one means.',
      icon: '🎡',
      estimatedSeconds: 45,
    },
    {
      id: 'laylatul-mabit',
      title: 'Laylatul Mabit',
      description: 'Count the stars on the night he slept in the Prophet’s place.',
      icon: '🌙',
      estimatedSeconds: 45,
    },
    {
      id: 'khyber-ka-darwaza',
      title: 'Khyber ka Darwaza',
      description: 'Time your strength just right to lift the great gate.',
      icon: '🛡️',
      estimatedSeconds: 30,
    },
    {
      id: 'hikmat-puzzle',
      title: 'Hikmat Puzzle',
      description: 'Put his wise words back in order, one saying at a time.',
      icon: '📜',
      estimatedSeconds: 60,
    },
    {
      id: 'sadaqah-sorter',
      title: 'Sadaqah Sorter',
      description: 'Sort gifts between yourself and those who need them more.',
      icon: '🤲',
      estimatedSeconds: 60,
    },
    {
      id: 'yateem-ka-khana',
      title: 'Yateem ka Khana',
      description: 'Match the food cards to help feed orphans in secret, at night.',
      icon: '🍲',
      estimatedSeconds: 60,
    },
  ],
  certificateSaying: {
    english: 'Knowledge is better than wealth — knowledge protects you, but you must protect wealth.',
    urdu: 'علم دولت سے بہتر ہے — علم تمہاری حفاظت کرتا ہے، جبکہ دولت کی حفاظت تمہیں کرنی پڑتی ہے۔',
    attribution: 'Imam Ali (a.s.), Nahj al-Balagha',
  },
};
