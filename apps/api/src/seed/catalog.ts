import type { CategoryId } from '@meal/shared';
import { parseIngredientLine } from '@meal/shared';
import { deriveDiets } from '../lib/diets';
import { slugify } from '../lib/recipes';
import { asie } from './data/asie';
import { france } from './data/france';
import { mediterranee } from './data/mediterranee';
import { monde } from './data/monde';
import { sucre } from './data/sucre';
import { vert } from './data/vert';
import type { SeedRecipe } from './types';
import type { CatalogRecipe } from './upsert';

export const SEED_RECIPES: SeedRecipe[] = [...france, ...mediterranee, ...asie, ...monde, ...vert, ...sucre];

const DEFAULT_COLOR: Record<CategoryId, string> = {
  plat: 'tomato',
  dessert: 'berry',
  soupe: 'peach',
  entree: 'mint',
  'petit-dej': 'mango',
  apero: 'lime',
  accompagnement: 'sky',
  boisson: 'grape',
};

export function toCatalogRecipe(r: SeedRecipe): CatalogRecipe {
  const ingredients = r.i.map(parseIngredientLine);
  return {
    slug: slugify(r.t),
    title: r.t,
    description: r.d,
    emoji: r.e,
    color: r.col ?? DEFAULT_COLOR[r.c],
    category: r.c,
    cuisine: r.k,
    moods: r.m,
    diets: r.diet ?? deriveDiets(ingredients.map((i) => i.name)),
    seasons: r.s ?? [],
    prepMinutes: r.p,
    cookMinutes: r.cook,
    servings: r.n,
    difficulty: r.lvl ?? 1,
    cost: r.cost ?? 1,
    tips: r.tip ?? null,
    steps: r.st,
    source: 'seed',
    lang: 'fr',
    ingredients,
  };
}
