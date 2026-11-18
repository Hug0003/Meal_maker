import type { CategoryId, DietId, MoodId, SeasonId } from '@meal/shared';

/**
 * Format compact des recettes du seed.
 * Ingrédients : « quantité unité|nom|note » — ex. « 200 g|lardons|fumés », « 2|oignon », « |sel », « ?|persil » (optionnel).
 * Les régimes (végétarien, vegan, sans gluten, sans lactose) sont déduits des ingrédients ; `diet` force la liste.
 */
export interface SeedRecipe {
  t: string;
  d: string;
  e: string;
  c: CategoryId;
  k: string;
  m: MoodId[];
  s?: SeasonId[];
  p: number;
  cook: number;
  n: number;
  lvl?: 1 | 2 | 3;
  cost?: 1 | 2 | 3;
  col?: string;
  diet?: DietId[];
  i: string[];
  st: string[];
  tip?: string;
}
