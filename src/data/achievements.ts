import type { Achievement } from '@/types/content';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-star', title: 'First Star Unlocked', description: 'You unlocked your very first Star.', icon: 'star', kind: 'star', threshold: 1 },
  { id: 'first-dua', title: 'First Dua Completed', description: 'You learned your first dua by heart.', icon: 'hand-left', kind: 'dua', threshold: 1 },
  { id: 'dua-collector', title: 'Dua Collector', description: 'You completed 4 duas.', icon: 'book', kind: 'dua', threshold: 4 },
  { id: 'first-quiz', title: 'Quiz Whiz', description: 'You answered your first quiz question correctly.', icon: 'help-circle', kind: 'quiz', threshold: 1 },
  { id: 'quiz-master', title: 'Quiz Master', description: 'You answered 8 quiz questions correctly.', icon: 'trophy', kind: 'quiz', threshold: 8 },
  { id: 'first-story', title: 'Storyteller', description: 'You finished your first story.', icon: 'reader', kind: 'story', threshold: 1 },
  { id: 'story-lover', title: 'Story Lover', description: 'You finished 3 stories.', icon: 'library', kind: 'story', threshold: 3 },
  { id: 'streak-3', title: '3 Day Streak', description: 'You opened 14 Stars 3 days in a row.', icon: 'flame', kind: 'streak', threshold: 3 },
  { id: 'streak-7', title: '7 Day Streak', description: 'You opened 14 Stars 7 days in a row.', icon: 'flame', kind: 'streak', threshold: 7 },
  { id: 'streak-14', title: '14 Day Streak', description: 'You opened 14 Stars 14 days in a row.', icon: 'flame', kind: 'streak', threshold: 14 },
  { id: 'halfway', title: 'Halfway There', description: 'You unlocked 7 of the 14 Stars.', icon: 'sparkles', kind: 'star', threshold: 7 },
  { id: 'mercy-hero', title: 'Mercy Hero Badge', description: 'You completed all 10 Kindness Missions.', icon: 'heart', kind: 'game', threshold: 1 },
  { id: 'journey-complete', title: 'Journey Complete', description: 'You unlocked all 14 Stars!', icon: 'ribbon', kind: 'journey', threshold: 14 },
];
