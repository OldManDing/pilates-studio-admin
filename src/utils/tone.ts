import type { AccentTone } from '@/types';

const TONES: AccentTone[] = ['mint', 'violet', 'orange', 'pink'];

export const getToneFromName = (name: string): AccentTone => {
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TONES[charSum % TONES.length];
};
