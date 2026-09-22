import type { ComponentType } from 'react';

import type { ActivityProps } from '@/types/games';

import { AdlKaTaraazuActivity } from './AdlKaTaraazuActivity';
import { AlqaabWheelActivity } from './AlqaabWheelActivity';
import { BabUlIlmQuizActivity } from './BabUlIlmQuizActivity';
import { HikmatPuzzleActivity } from './HikmatPuzzleActivity';
import { KhyberKaDarwazaActivity } from './KhyberKaDarwazaActivity';
import { LaylatulMabitActivity } from './LaylatulMabitActivity';
import { SadaqahSorterActivity } from './SadaqahSorterActivity';
import { YateemKaKhanaActivity } from './YateemKaKhanaActivity';

export const IMAM_ALI_ACTIVITY_COMPONENTS: Record<string, ComponentType<ActivityProps>> = {
  'bab-ul-ilm-quiz': BabUlIlmQuizActivity,
  'adl-ka-taraazu': AdlKaTaraazuActivity,
  'alqaab-wheel': AlqaabWheelActivity,
  'laylatul-mabit': LaylatulMabitActivity,
  'khyber-ka-darwaza': KhyberKaDarwazaActivity,
  'hikmat-puzzle': HikmatPuzzleActivity,
  'sadaqah-sorter': SadaqahSorterActivity,
  'yateem-ka-khana': YateemKaKhanaActivity,
};
