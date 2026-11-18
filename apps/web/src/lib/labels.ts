import { CATEGORIES, DIETS, MOODS, SEASONS } from '@meal/shared';

const byId = <T extends { id: string }>(list: readonly T[]) => new Map(list.map((x) => [x.id as string, x]));

export const moodById = byId(MOODS);
export const categoryById = byId(CATEGORIES);
export const dietById = byId(DIETS);
export const seasonById = byId(SEASONS);

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export const DIFFICULTY = ['', 'Facile', 'Moyen', 'Chef'];
export const COST = ['', '€', '€€', '€€€'];
