export const MOODS = [
  { id: 'gourmand', label: 'Gourmand', emoji: '🍫', color: 'tomato' },
  { id: 'healthy', label: 'Healthy', emoji: '🥗', color: 'mint' },
  { id: 'rapide', label: 'Rapide', emoji: '⚡', color: 'mango' },
  { id: 'reconfort', label: 'Réconfort', emoji: '🫕', color: 'peach' },
  { id: 'leger', label: 'Léger', emoji: '🍃', color: 'lime' },
  { id: 'exotique', label: 'Exotique', emoji: '🌶️', color: 'berry' },
  { id: 'festif', label: 'Festif', emoji: '🎉', color: 'grape' },
] as const;
export type MoodId = (typeof MOODS)[number]['id'];
export const MOOD_IDS = MOODS.map((m) => m.id) as [MoodId, ...MoodId[]];

export const CATEGORIES = [
  { id: 'petit-dej', label: 'Petit-déj', emoji: '🥐' },
  { id: 'entree', label: 'Entrée', emoji: '🥗' },
  { id: 'soupe', label: 'Soupe', emoji: '🍲' },
  { id: 'plat', label: 'Plat', emoji: '🍽️' },
  { id: 'accompagnement', label: 'Accompagnement', emoji: '🥔' },
  { id: 'apero', label: 'Apéro', emoji: '🫒' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'boisson', label: 'Boisson', emoji: '🥤' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const DIETS = [
  { id: 'vegetarien', label: 'Végétarien', emoji: '🥕' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'sans-gluten', label: 'Sans gluten', emoji: '🌾' },
  { id: 'sans-lactose', label: 'Sans lactose', emoji: '🥛' },
] as const;
export type DietId = (typeof DIETS)[number]['id'];
export const DIET_IDS = DIETS.map((d) => d.id) as [DietId, ...DietId[]];

export const SEASONS = [
  { id: 'printemps', label: 'Printemps', emoji: '🌷' },
  { id: 'ete', label: 'Été', emoji: '☀️' },
  { id: 'automne', label: 'Automne', emoji: '🍂' },
  { id: 'hiver', label: 'Hiver', emoji: '❄️' },
] as const;
export type SeasonId = (typeof SEASONS)[number]['id'];
export const SEASON_IDS = SEASONS.map((s) => s.id) as [SeasonId, ...SeasonId[]];

export const STATUSES = [
  { id: 'done', label: "Je l'ai fait", emoji: '✅' },
  { id: 'to_try', label: 'À tester', emoji: '📌' },
  { id: 'not_for_me', label: 'Pas pour moi', emoji: '🙅' },
] as const;
export type StatusId = (typeof STATUSES)[number]['id'];
export const STATUS_IDS = STATUSES.map((s) => s.id) as [StatusId, ...StatusId[]];

export const AISLES = [
  { id: 'fruits-legumes', label: 'Fruits & légumes', emoji: '🥦' },
  { id: 'viandes-poissons', label: 'Viandes & poissons', emoji: '🍗' },
  { id: 'cremerie', label: 'Crèmerie & œufs', emoji: '🧀' },
  { id: 'feculents', label: 'Pâtes, riz & céréales', emoji: '🍝' },
  { id: 'epicerie', label: 'Épicerie', emoji: '🥫' },
  { id: 'epices', label: 'Épices & condiments', emoji: '🧂' },
  { id: 'boulangerie', label: 'Boulangerie', emoji: '🥖' },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊' },
  { id: 'boissons', label: 'Boissons', emoji: '🧃' },
  { id: 'autre', label: 'Autre', emoji: '🛒' },
] as const;
export type AisleId = (typeof AISLES)[number]['id'];
export const AISLE_IDS = AISLES.map((a) => a.id) as [AisleId, ...AisleId[]];

export const CARD_COLORS = ['tomato', 'mango', 'mint', 'berry', 'sky', 'grape', 'peach', 'lime'] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export const SORTS = [
  { id: 'relevance', label: 'Pertinence' },
  { id: 'quick', label: 'Les plus rapides' },
  { id: 'rating', label: 'Mieux notés' },
  { id: 'recent', label: 'Cuisinés récemment' },
  { id: 'new', label: 'Nouveautés' },
  { id: 'alpha', label: 'A → Z' },
] as const;
export type SortId = (typeof SORTS)[number]['id'];
export const SORT_IDS = SORTS.map((s) => s.id) as [SortId, ...SortId[]];
