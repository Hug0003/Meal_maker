import { z } from 'zod';
import { CATEGORY_IDS, DIET_IDS, MOOD_IDS, SEASON_IDS, SORT_IDS, STATUS_IDS } from './constants';

/** Paramètre de requête « a,b,c » (ou répété) → tableau. */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => {
    if (v === undefined || v === '') return undefined;
    if (Array.isArray(v)) return v.flatMap((x) => String(x).split(',')).filter(Boolean);
    return String(v).split(',').filter(Boolean);
  }, z.array(item).optional());

const bool = z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean()).optional();

export const recipeQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: csv(z.enum(CATEGORY_IDS)),
  cuisine: csv(z.string().max(40)),
  mood: csv(z.enum(MOOD_IDS)),
  diet: csv(z.enum(DIET_IDS)),
  season: z.enum(SEASON_IDS).optional(),
  maxTime: z.coerce.number().int().min(1).max(1000).optional(),
  difficulty: z.coerce.number().int().min(1).max(3).optional(),
  status: z.enum([...STATUS_IDS, 'favorite', 'rated', 'none', 'mine']).optional(),
  fridge: bool,
  maxMissing: z.coerce.number().int().min(0).max(10).optional(),
  lang: z.enum(['fr', 'en']).optional(),
  exclude: z.coerce.number().int().optional(),
  sort: z.enum(SORT_IDS).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});
export type RecipeQuery = z.infer<typeof recipeQuerySchema>;

export const ingredientInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(100000).nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  note: z.string().trim().max(120).nullable().optional(),
  optional: z.boolean().optional(),
});
export type IngredientInput = z.infer<typeof ingredientInputSchema>;

export const recipeInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  emoji: z.string().trim().min(1).max(16).default('🍽️'),
  color: z.string().trim().max(20).default('mango'),
  imageUrl: z.string().url().max(500).nullable().optional(),
  category: z.enum(CATEGORY_IDS),
  cuisine: z.string().trim().min(1).max(40),
  moods: z.array(z.enum(MOOD_IDS)).max(7).default([]),
  diets: z.array(z.enum(DIET_IDS)).max(4).default([]),
  seasons: z.array(z.enum(SEASON_IDS)).max(4).default([]),
  prepMinutes: z.number().int().min(0).max(2000),
  cookMinutes: z.number().int().min(0).max(2000),
  servings: z.number().int().min(1).max(50),
  difficulty: z.number().int().min(1).max(3),
  cost: z.number().int().min(1).max(3),
  tips: z.string().trim().max(1000).nullable().optional(),
  ingredients: z.array(ingredientInputSchema).min(1).max(60),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(40),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const recipeStateInputSchema = z.object({
  status: z.enum(STATUS_IDS).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  favorite: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type RecipeStateInput = z.infer<typeof recipeStateInputSchema>;

export const fridgeInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expiresAt: z.string().date().nullable().optional(),
});

export const fridgeUpdateSchema = z.object({
  expiresAt: z.string().date().nullable(),
});

export const planInputSchema = z.object({
  date: z.string().date(),
  slot: z.enum(['midi', 'soir']),
  recipeId: z.number().int().positive(),
  servings: z.number().int().min(1).max(50).optional(),
});

export const planUpdateSchema = z.object({
  date: z.string().date().optional(),
  slot: z.enum(['midi', 'soir']).optional(),
  servings: z.number().int().min(1).max(50).optional(),
});

export const shoppingInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(40).nullable().optional(),
});

export const shoppingUpdateSchema = z.object({
  checked: z.boolean(),
});

export const shoppingGenerateSchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const loginSchema = z.object({ password: z.string().min(1).max(200) });
