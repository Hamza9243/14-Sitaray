import type { MiniGameDefinition } from '@/types/games';

export const KINDNESS_MISSIONS_GAME_ID = 'kindness-missions';

/**
 * "Kindness Missions" — the mini-game that unlocks once Star 1 (Prophet
 * Muhammad, peace be upon him and his family) is unlocked. Ten short scenes
 * built entirely from emoji (no illustration assets needed), each teaching
 * one small act of kindness. Every mission awards 20 XP; finishing all ten
 * awards the Mercy Hero badge.
 */
export const KINDNESS_MISSIONS: MiniGameDefinition = {
  id: KINDNESS_MISSIONS_GAME_ID,
  title: 'Kindness Missions',
  starId: 1,
  totalXpReward: 200,
  badgeTitle: 'Mercy Hero Badge',
  badgeDescription: 'You completed all 10 Kindness Missions, just like the mercy the Prophet showed to everyone.',
  missions: [
    {
      id: 'hungry-child',
      kind: 'drag-single',
      characterEmoji: '🧒',
      prompt: 'A hungry child needs food!',
      items: [
        { id: 'apple', emoji: '🍎', correct: true },
        { id: 'stone', emoji: '🪨', correct: false },
        { id: 'toy', emoji: '🧸', correct: false },
      ],
      zoneEmoji: '🍽️',
      zoneLabel: 'Feed Him',
      successMessage: 'You shared food with someone hungry — that is real kindness!',
      xpReward: 20,
    },
    {
      id: 'old-man-crossing',
      kind: 'tap-target',
      characterEmoji: '👴',
      prompt: 'An old man wants to cross the road. Tap the crosswalk to help him!',
      items: [{ id: 'crosswalk', emoji: '🚸', correct: true }],
      successMessage: 'You helped him cross safely!',
      xpReward: 20,
    },
    {
      id: 'thirsty-cat',
      kind: 'drag-single',
      characterEmoji: '🐱',
      prompt: 'A thirsty cat needs a drink!',
      items: [
        { id: 'milk', emoji: '🥛', correct: false },
        { id: 'water', emoji: '💧', correct: true },
        { id: 'candy', emoji: '🍭', correct: false },
      ],
      zoneEmoji: '🥤',
      zoneLabel: 'Give Water',
      successMessage: 'The cat feels so much better now!',
      xpReward: 20,
    },
    {
      id: 'fallen-books',
      kind: 'drag-multi',
      characterEmoji: '😯',
      prompt: 'The books fell down! Help put them back on the shelf.',
      items: [
        { id: 'book-1', emoji: '📕', correct: true },
        { id: 'book-2', emoji: '📗', correct: true },
        { id: 'book-3', emoji: '📘', correct: true },
      ],
      zoneEmoji: '📚',
      zoneLabel: 'Bookshelf',
      successMessage: 'All tidy! Taking care of books is a kind habit.',
      xpReward: 20,
    },
    {
      id: 'dropped-toys',
      kind: 'drag-multi',
      characterEmoji: '🧸',
      prompt: 'A friend dropped their toys. Help put them in the basket!',
      items: [
        { id: 'toy-bear', emoji: '🧸', correct: true },
        { id: 'toy-car', emoji: '🚗', correct: true },
        { id: 'toy-ball', emoji: '⚽', correct: true },
      ],
      zoneEmoji: '🧺',
      zoneLabel: 'Toy Basket',
      successMessage: 'Great teamwork tidying up together!',
      xpReward: 20,
    },
    {
      id: 'sad-friend',
      kind: 'choice',
      characterEmoji: '😢',
      prompt: 'Someone is feeling sad. What should you do?',
      items: [
        { id: 'smile', emoji: '😊', correct: true },
        { id: 'shout', emoji: '😡', correct: false },
        { id: 'ignore', emoji: '🙈', correct: false },
      ],
      successMessage: 'A kind smile can make someone’s whole day better!',
      xpReward: 20,
    },
    {
      id: 'road-trash',
      kind: 'drag-multi',
      characterEmoji: '🧑',
      prompt: 'There is trash on the road. Let’s clean it up!',
      items: [
        { id: 'cup', emoji: '🥤', correct: true },
        { id: 'wrapper', emoji: '🧻', correct: true },
      ],
      zoneEmoji: '🗑️',
      zoneLabel: 'Dustbin',
      successMessage: 'A clean road makes everyone happy!',
      xpReward: 20,
    },
    {
      id: 'plant-tree',
      kind: 'sequence',
      characterEmoji: '🌳',
      prompt: 'Let’s plant a tree!',
      steps: [
        {
          prompt: 'First, plant the seed in the soil.',
          item: { id: 'seed', emoji: '🌱', correct: true },
          zoneEmoji: '🕳️',
          zoneLabel: 'Soil',
        },
        {
          prompt: 'Now, give it some water.',
          item: { id: 'water-can', emoji: '💧', correct: true },
          zoneEmoji: '🌱',
          zoneLabel: 'Water It',
        },
      ],
      successMessage: 'Look, your tree is growing! Planting trees helps everyone breathe.',
      xpReward: 20,
    },
    {
      id: 'share-food',
      kind: 'drag-single',
      characterEmoji: '🧒',
      prompt: 'One friend does not have food. Share yours with them!',
      items: [{ id: 'bread', emoji: '🍞', correct: true }],
      zoneEmoji: '🙂',
      zoneLabel: 'Share',
      successMessage: 'Sharing what you have is one of the kindest things you can do.',
      xpReward: 20,
    },
    {
      id: 'carry-groceries',
      kind: 'drag-multi',
      characterEmoji: '👨‍👩‍👧',
      prompt: 'This family needs help carrying groceries home!',
      items: [
        { id: 'bread-bag', emoji: '🥖', correct: true },
        { id: 'veggies', emoji: '🥕', correct: true },
        { id: 'juice', emoji: '🧃', correct: true },
      ],
      zoneEmoji: '🏠',
      zoneLabel: 'Home',
      successMessage: 'You helped a whole family — what a wonderful last mission!',
      xpReward: 20,
    },
  ],
};
