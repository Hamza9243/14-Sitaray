import { gradients } from '@/design-system/tokens/colors';
import type { StarDefinition } from '@/types/content';

const XP_PER_STAR = 100;

const cycle = [
  gradients.starBurst,
  gradients.skyClimb,
  gradients.berryPop,
  gradients.meadowFresh,
  gradients.dawn,
  gradients.nightSky,
] as const;

/**
 * The 14 Stars — fixed, never extended. Each pairs one of the 14 Ma'sumeen
 * with a single character lesson a child can carry into daily life. No
 * figurative portraits are used for these figures; each Star is represented
 * by an abstract gradient + initial mark (see CharacterCard's image-less
 * fallback), consistent with how these figures are respectfully depicted
 * in Islamic children's media.
 */
export const STARS: StarDefinition[] = [
  {
    id: 1,
    name: 'Prophet Muhammad',
    honorific: 'Peace be upon him and his family',
    lessonTitle: 'Kindness & Mercy',
    lessonSummary: 'Even to those who were unkind to him, he answered with patience and a gentle heart.',
    xpThreshold: XP_PER_STAR * 1,
    rewardLabel: 'Starter Badge',
    gradient: cycle[0],
  },
  {
    id: 2,
    name: 'Imam Ali',
    honorific: 'Peace be upon him',
    lessonTitle: 'Justice & Courage',
    lessonSummary: 'He stood for what was right, even when it was hard, and treated everyone fairly.',
    xpThreshold: XP_PER_STAR * 2,
    rewardLabel: 'Brave Heart Badge',
    gradient: cycle[1],
  },
  {
    id: 3,
    name: 'Sayyida Fatima',
    honorific: 'Peace be upon her',
    lessonTitle: 'Patience & Generosity',
    lessonSummary: 'She gave to others even when she had very little, and never lost her patience.',
    xpThreshold: XP_PER_STAR * 3,
    rewardLabel: 'Giving Heart Badge',
    gradient: cycle[2],
  },
  {
    id: 4,
    name: 'Imam Hasan',
    honorific: 'Peace be upon him',
    lessonTitle: 'Peace & Forgiveness',
    lessonSummary: 'He chose peace over conflict and forgave people who wronged him.',
    xpThreshold: XP_PER_STAR * 4,
    rewardLabel: 'Peacemaker Badge',
    gradient: cycle[3],
  },
  {
    id: 5,
    name: 'Imam Husain',
    honorific: 'Peace be upon him',
    lessonTitle: 'Truth & Sacrifice',
    lessonSummary: 'He stood for the truth no matter the cost, teaching us that standing up for what is right matters most.',
    xpThreshold: XP_PER_STAR * 5,
    rewardLabel: 'Truth Seeker Badge',
    gradient: cycle[4],
  },
  {
    id: 6,
    name: 'Imam Zain-ul-Abideen',
    honorific: 'Peace be upon him',
    lessonTitle: 'Gratitude & Worship',
    lessonSummary: 'He thanked Allah in every moment, teaching us to notice our blessings.',
    xpThreshold: XP_PER_STAR * 6,
    rewardLabel: 'Grateful Heart Badge',
    gradient: cycle[5],
  },
  {
    id: 7,
    name: 'Imam Muhammad al-Baqir',
    honorific: 'Peace be upon him',
    lessonTitle: 'Knowledge & Wisdom',
    lessonSummary: 'He loved learning and shared his knowledge generously with others.',
    xpThreshold: XP_PER_STAR * 7,
    rewardLabel: 'Wise Owl Badge',
    gradient: cycle[0],
  },
  {
    id: 8,
    name: 'Imam Ja’far al-Sadiq',
    honorific: 'Peace be upon him',
    lessonTitle: 'Curiosity & Learning',
    lessonSummary: 'He taught that asking questions is one of the best ways to learn.',
    xpThreshold: XP_PER_STAR * 8,
    rewardLabel: 'Curious Mind Badge',
    gradient: cycle[1],
  },
  {
    id: 9,
    name: 'Imam Musa al-Kadhim',
    honorific: 'Peace be upon him',
    lessonTitle: 'Patience & Calm',
    lessonSummary: 'He stayed calm and patient even during the hardest times.',
    xpThreshold: XP_PER_STAR * 9,
    rewardLabel: 'Calm Heart Badge',
    gradient: cycle[2],
  },
  {
    id: 10,
    name: 'Imam Ali al-Ridha',
    honorific: 'Peace be upon him',
    lessonTitle: 'Hospitality & Respect',
    lessonSummary: 'He welcomed everyone with warmth, no matter who they were.',
    xpThreshold: XP_PER_STAR * 10,
    rewardLabel: 'Welcoming Heart Badge',
    gradient: cycle[3],
  },
  {
    id: 11,
    name: 'Imam Muhammad al-Jawad',
    honorific: 'Peace be upon him',
    lessonTitle: 'Confidence & Faith',
    lessonSummary: 'Even from a young age, he showed that wisdom is not only for grown-ups.',
    xpThreshold: XP_PER_STAR * 11,
    rewardLabel: 'Bright Star Badge',
    gradient: cycle[4],
  },
  {
    id: 12,
    name: 'Imam Ali al-Hadi',
    honorific: 'Peace be upon him',
    lessonTitle: 'Steadfastness',
    lessonSummary: 'He stayed true to his values even in difficult circumstances.',
    xpThreshold: XP_PER_STAR * 12,
    rewardLabel: 'Steady Heart Badge',
    gradient: cycle[5],
  },
  {
    id: 13,
    name: 'Imam Hasan al-Askari',
    honorific: 'Peace be upon him',
    lessonTitle: 'Hope & Devotion',
    lessonSummary: 'He held onto hope and devotion, even while facing great hardship.',
    xpThreshold: XP_PER_STAR * 13,
    rewardLabel: 'Hopeful Heart Badge',
    gradient: cycle[0],
  },
  {
    id: 14,
    name: 'Imam Muhammad al-Mahdi',
    honorific: 'May Allah hasten his reappearance',
    lessonTitle: 'Hope for the Future',
    lessonSummary: 'He reminds us to keep hope alive and to work every day to become better.',
    xpThreshold: XP_PER_STAR * 14,
    rewardLabel: 'Journey Complete Badge',
    gradient: cycle[1],
  },
];

export const TOTAL_STARS = STARS.length;
export const MAX_XP = STARS[STARS.length - 1].xpThreshold;
