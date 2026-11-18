import type { AisleId, CategoryId, DietId, MoodId, SeasonId, StatusId } from './constants';

export interface RecipeStateDto {
  status: StatusId | null;
  rating: number | null;
  favorite: boolean;
  timesCooked: number;
  lastCookedAt: string | null;
  notes: string | null;
}

export interface FridgeMatch {
  have: number;
  total: number;
  missing: string[];
  expiringUsed: number;
}

export interface RecipeCard {
  id: number;
  slug: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  imageUrl: string | null;
  category: CategoryId;
  cuisine: string;
  moods: MoodId[];
  diets: DietId[];
  seasons: SeasonId[];
  prepMinutes: number;
  cookMinutes: number;
  difficulty: number;
  cost: number;
  lang: string;
  source: string;
  isVersion: boolean;
  state: RecipeStateDto | null;
  fridge?: FridgeMatch;
  newIngredients?: string[];
}

export interface RecipeIngredientDto {
  id: number;
  ingredientId: number;
  name: string;
  aisle: AisleId;
  isStaple: boolean;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  optional: boolean;
  inFridge: boolean;
}

export interface RecipeDetail extends RecipeCard {
  servings: number;
  tips: string | null;
  steps: string[];
  ingredients: RecipeIngredientDto[];
  /** Recette d'origine quand celle-ci est « ma version ». */
  original: { id: number; title: string } | null;
  /** « Ma version » quand celle-ci est une recette d'origine modifiée. */
  versionId: number | null;
  cookLog: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MetaDto {
  total: number;
  cuisines: { id: string; count: number }[];
  categories: { id: string; count: number }[];
  moods: { id: string; count: number }[];
  stats: { done: number; rated: number; toTry: number; fridge: number };
}

export interface FridgeItemDto {
  ingredientId: number;
  name: string;
  aisle: AisleId;
  addedAt: string;
  expiresAt: string | null;
}

export interface IngredientDto {
  id: number;
  name: string;
  aisle: AisleId;
  isStaple: boolean;
}

export interface DiscoverDto {
  weekly: { week: string; recipe: RecipeCard; reason: string } | null;
  history: { week: string; recipe: RecipeCard }[];
  newIngredients: RecipeCard[];
  cuisines: { cuisine: string; cooked: number; recipes: RecipeCard[] }[];
}

export interface PlanEntryDto {
  id: number;
  date: string;
  slot: 'midi' | 'soir';
  servings: number;
  recipe: RecipeCard;
}

export interface ShoppingItemDto {
  id: number;
  label: string;
  quantity: string | null;
  aisle: AisleId;
  checked: boolean;
  fromPlan: boolean;
}

export interface AuthStatusDto {
  required: boolean;
  authenticated: boolean;
}
