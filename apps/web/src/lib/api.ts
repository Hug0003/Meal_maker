import type {
  AuthStatusDto,
  DiscoverDto,
  FridgeItemDto,
  IngredientDto,
  MetaDto,
  Paginated,
  PlanEntryDto,
  RecipeCard,
  RecipeDetail,
  RecipeInput,
  RecipeStateDto,
  RecipeStateInput,
  ShoppingItemDto,
} from '@meal/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Émis quand l'API réclame le mot de passe : l'app affiche alors l'écran de connexion. */
export const AUTH_EVENT = 'meal:auth-required';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !path.startsWith('/auth')) window.dispatchEvent(new Event(AUTH_EVENT));
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Une erreur est survenue');
  return data as T;
}

export type QueryParams = Record<string, string | number | boolean | string[] | undefined | null>;

export function toSearch(params: QueryParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
    } else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  authStatus: () => request<AuthStatusDto>('GET', '/auth/status'),
  login: (password: string) => request<{ ok: true }>('POST', '/auth/login', { password }),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),

  meta: () => request<MetaDto>('GET', '/meta'),
  recipes: (params: QueryParams) => request<Paginated<RecipeCard>>('GET', `/recipes${toSearch(params)}`),
  random: (params: QueryParams) => request<RecipeCard>('GET', `/recipes/random${toSearch(params)}`),
  recipe: (id: number) => request<RecipeDetail>('GET', `/recipes/${id}`),
  createRecipe: (input: RecipeInput) => request<RecipeDetail>('POST', '/recipes', input),
  updateRecipe: (id: number, input: RecipeInput) => request<RecipeDetail>('PUT', `/recipes/${id}`, input),
  deleteRecipe: (id: number) => request<{ restoredId: number | null }>('DELETE', `/recipes/${id}`),
  setState: (id: number, input: RecipeStateInput) =>
    request<RecipeStateDto>('PUT', `/recipes/${id}/state`, input),
  cooked: (id: number) => request<RecipeStateDto>('POST', `/recipes/${id}/cooked`),

  ingredients: (q: string) => request<IngredientDto[]>('GET', `/ingredients${toSearch({ q })}`),
  fridge: () => request<FridgeItemDto[]>('GET', '/fridge'),
  addFridge: (name: string, expiresAt?: string | null) =>
    request<FridgeItemDto[]>('POST', '/fridge', { name, expiresAt: expiresAt || null }),
  updateFridge: (ingredientId: number, expiresAt: string | null) =>
    request<FridgeItemDto[]>('PATCH', `/fridge/${ingredientId}`, { expiresAt }),
  removeFridge: (ingredientId: number) => request<FridgeItemDto[]>('DELETE', `/fridge/${ingredientId}`),
  clearFridge: () => request<FridgeItemDto[]>('DELETE', '/fridge'),

  discover: () => request<DiscoverDto>('GET', '/discover'),

  plan: (from: string, to: string) => request<PlanEntryDto[]>('GET', `/plan${toSearch({ from, to })}`),
  addPlan: (input: { date: string; slot: 'midi' | 'soir'; recipeId: number; servings?: number }) =>
    request<{ id: number }>('POST', '/plan', input),
  updatePlan: (id: number, input: { date?: string; slot?: 'midi' | 'soir'; servings?: number }) =>
    request<{ ok: true }>('PATCH', `/plan/${id}`, input),
  removePlan: (id: number) => request<{ ok: true }>('DELETE', `/plan/${id}`),

  shopping: () => request<ShoppingItemDto[]>('GET', '/shopping'),
  generateShopping: (from: string, to: string) =>
    request<ShoppingItemDto[]>('POST', '/shopping/generate', { from, to }),
  addShopping: (label: string, quantity?: string) =>
    request<ShoppingItemDto[]>('POST', '/shopping', { label, quantity }),
  checkShopping: (id: number, checked: boolean) =>
    request<ShoppingItemDto[]>('PATCH', `/shopping/${id}`, { checked }),
  removeShopping: (id: number) => request<ShoppingItemDto[]>('DELETE', `/shopping/${id}`),
  clearShopping: (onlyChecked: boolean) =>
    request<ShoppingItemDto[]>('DELETE', `/shopping${onlyChecked ? '?checked=1' : ''}`),
};
