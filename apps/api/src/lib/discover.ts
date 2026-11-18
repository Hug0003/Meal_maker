import type { DiscoverDto, RecipeCard } from '@meal/shared';
import { hashString, isoWeek } from '@meal/shared';
import { Prisma } from '@prisma/client';
import { cached, redis, secondsUntilNextMonday } from './cache';
import { prisma } from './db';
import { cardsByIds } from './recipes';

/** Ingrédients déjà cuisinés : ceux des recettes marquées « faites » ou cuisinées au moins une fois. */
const KNOWN_INGREDIENTS = Prisma.sql`
  SELECT DISTINCT ri."ingredientId" FROM "RecipeIngredient" ri
  JOIN "RecipeState" ks ON ks."recipeId" = ri."recipeId"
  WHERE ks.status = 'done' OR ks."timesCooked" > 0`;

const CANDIDATE = Prisma.sql`
  NOT EXISTS (SELECT 1 FROM "Recipe" v WHERE v."parentId" = r.id)
  AND s.status IS DISTINCT FROM 'not_for_me'
  AND s.status IS DISTINCT FROM 'done'
  AND coalesce(s."timesCooked", 0) = 0`;

/**
 * Recettes classées par part d'ingrédients jamais cuisinés, puis par rareté de ces ingrédients
 * dans le catalogue (pour que la découverte reste intéressante même sans historique).
 */
export async function newIngredientRecipes(limit = 12): Promise<RecipeCard[]> {
  const seed = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<{ id: number; fresh: string[] }[]>`
    WITH known AS (${KNOWN_INGREDIENTS}),
    usage AS (SELECT "ingredientId", count(*)::float AS n FROM "RecipeIngredient" GROUP BY "ingredientId"),
    scored AS (
      SELECT ri."recipeId",
        count(*) FILTER (WHERE k."ingredientId" IS NULL)::float / greatest(count(*), 1) AS fresh_ratio,
        avg(1.0 / u.n) FILTER (WHERE k."ingredientId" IS NULL) AS rarity,
        coalesce(array_agg(i.name ORDER BY u.n) FILTER (WHERE k."ingredientId" IS NULL), '{}') AS fresh
      FROM "RecipeIngredient" ri
      JOIN "Ingredient" i ON i.id = ri."ingredientId" AND NOT i."isStaple" AND NOT ri.optional
      JOIN usage u ON u."ingredientId" = ri."ingredientId"
      LEFT JOIN known k ON k."ingredientId" = ri."ingredientId"
      GROUP BY ri."recipeId"
    )
    SELECT r.id, sc.fresh
    FROM "Recipe" r
    JOIN scored sc ON sc."recipeId" = r.id
    LEFT JOIN "RecipeState" s ON s."recipeId" = r.id
    WHERE ${CANDIDATE} AND cardinality(sc.fresh) > 0
    ORDER BY (sc.fresh_ratio * 0.6 + coalesce(sc.rarity, 0) * 2) DESC, md5(r.id::text || ${seed})
    LIMIT ${limit * 3}`;
  // Un peu de variété : on évite d'afficher plusieurs recettes de la même cuisine à la suite.
  const cards = await cardsByIds(rows.map((r) => r.id));
  const fresh = new Map(rows.map((r) => [r.id, r.fresh.slice(0, 4)]));
  const picked: RecipeCard[] = [];
  const perCuisine = new Map<string, number>();
  for (const c of cards) {
    const n = perCuisine.get(c.cuisine) ?? 0;
    if (n >= 2) continue;
    perCuisine.set(c.cuisine, n + 1);
    picked.push({ ...c, newIngredients: fresh.get(c.id) });
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Cuisines du monde les moins explorées, avec quelques recettes pour chacune. */
export async function unexploredCuisines(): Promise<DiscoverDto['cuisines']> {
  const rows = await prisma.$queryRaw<{ cuisine: string; cooked: number; ids: number[] }[]>`
    SELECT r.cuisine,
      count(*) FILTER (WHERE s.status = 'done' OR s."timesCooked" > 0)::int AS cooked,
      (array_agg(r.id ORDER BY md5(r.id::text || current_date::text))
        FILTER (WHERE s.status IS DISTINCT FROM 'not_for_me'))[1:4] AS ids
    FROM "Recipe" r
    LEFT JOIN "RecipeState" s ON s."recipeId" = r.id
    WHERE NOT EXISTS (SELECT 1 FROM "Recipe" v WHERE v."parentId" = r.id)
    GROUP BY r.cuisine
    HAVING count(*) >= 3
    ORDER BY cooked ASC, md5(r.cuisine || current_date::text)
    LIMIT 4`;
  return Promise.all(
    rows.map(async (row) => ({
      cuisine: row.cuisine,
      cooked: row.cooked,
      recipes: await cardsByIds(row.ids ?? []),
    })),
  );
}

/**
 * Plat de la semaine : choisi une fois par semaine ISO parmi les recettes jamais faites,
 * dans une des cuisines les moins cuisinées. Le choix est enregistré (historique) et mis en cache.
 */
export async function weeklyPick(now = new Date()): Promise<DiscoverDto['weekly']> {
  const week = isoWeek(now);
  const existing = await prisma.weeklyPick.findUnique({ where: { week } });
  let pick = existing;
  if (!pick) {
    const candidates = await prisma.$queryRaw<{ id: number; cuisine: string }[]>`
      WITH cooked AS (
        SELECT r.cuisine, count(*) FILTER (WHERE s.status = 'done' OR s."timesCooked" > 0) AS n
        FROM "Recipe" r LEFT JOIN "RecipeState" s ON s."recipeId" = r.id GROUP BY r.cuisine
      ),
      rare AS (SELECT cuisine FROM cooked ORDER BY n ASC, md5(cuisine || ${week}) LIMIT 5)
      SELECT r.id, r.cuisine FROM "Recipe" r
      LEFT JOIN "RecipeState" s ON s."recipeId" = r.id
      WHERE ${CANDIDATE}
        AND r.cuisine IN (SELECT cuisine FROM rare)
        AND r.category IN ('plat', 'soupe', 'entree')
        AND r.id NOT IN (SELECT "recipeId" FROM "WeeklyPick")
      ORDER BY r.id`;
    if (!candidates.length) return null;
    const chosen = candidates[hashString(week) % candidates.length];
    const reason = `Une escapade ${chosen.cuisine === 'française' ? 'en terroir français' : `côté cuisine ${chosen.cuisine}`}, une cuisine que tu explores encore peu.`;
    pick = await prisma.weeklyPick.upsert({
      where: { week },
      update: {},
      create: { week, recipeId: chosen.id, reason },
    });
    redis.del(`weekly:${week}`).catch(() => undefined);
  }
  const [recipe] = await cardsByIds([pick.recipeId]);
  return recipe ? { week, recipe, reason: pick.reason } : null;
}

export async function discover(): Promise<DiscoverDto> {
  const week = isoWeek();
  // La sélection hebdomadaire ne change pas avant lundi : on la garde en cache jusque-là.
  const weekly = await cached(`weekly:${week}`, null, secondsUntilNextMonday(), () => weeklyPick());
  const [history, newIngredients, cuisines] = await Promise.all([
    prisma.weeklyPick
      .findMany({ where: { week: { not: week } }, orderBy: { week: 'desc' }, take: 8 })
      .then(async (picks) => {
        const cards = await cardsByIds(picks.map((p) => p.recipeId));
        return picks.flatMap((p) => {
          const recipe = cards.find((c) => c.id === p.recipeId);
          return recipe ? [{ week: p.week, recipe }] : [];
        });
      }),
    newIngredientRecipes(),
    unexploredCuisines(),
  ]);
  return { weekly, history, newIngredients, cuisines };
}
