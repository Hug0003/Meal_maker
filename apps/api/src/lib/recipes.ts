import type {
  FridgeMatch,
  Paginated,
  RecipeCard,
  RecipeDetail,
  RecipeInput,
  RecipeQuery,
  RecipeStateDto,
} from '@meal/shared';
import { normalizeName } from '@meal/shared';
import { Prisma, type Recipe, type RecipeState } from '@prisma/client';
import { prisma } from './db';
import { findOrCreateIngredient } from './ingredients';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function slugify(s: string): string {
  return (
    normalizeName(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'recette'
  );
}

export function toStateDto(s: RecipeState | null | undefined): RecipeStateDto | null {
  if (!s) return null;
  return {
    status: (s.status as RecipeStateDto['status']) ?? null,
    rating: s.rating,
    favorite: s.favorite,
    timesCooked: s.timesCooked,
    lastCookedAt: s.lastCookedAt?.toISOString() ?? null,
    notes: s.notes,
  };
}

export function toCard(r: Recipe & { state?: RecipeState | null }): RecipeCard {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    emoji: r.emoji,
    color: r.color,
    imageUrl: r.imageUrl,
    category: r.category as RecipeCard['category'],
    cuisine: r.cuisine,
    moods: r.moods as RecipeCard['moods'],
    diets: r.diets as RecipeCard['diets'],
    seasons: r.seasons as RecipeCard['seasons'],
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    difficulty: r.difficulty,
    cost: r.cost,
    lang: r.lang,
    source: r.source,
    isVersion: r.parentId != null,
    state: toStateDto(r.state),
  };
}

/** Charge des cartes dans l'ordre des identifiants donnés. */
export async function cardsByIds(ids: number[]): Promise<RecipeCard[]> {
  if (!ids.length) return [];
  const rows = await prisma.recipe.findMany({ where: { id: { in: ids } }, include: { state: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toCard(r)] : [];
  });
}

const like = (s: string) => `%${normalizeName(s).replace(/[%_\\]/g, (c) => '\\' + c)}%`;

/** Conditions SQL communes au catalogue et au tirage aléatoire. */
function buildConditions(q: Partial<RecipeQuery>): Prisma.Sql[] {
  const c: Prisma.Sql[] = [
    // Une recette d'origine modifiée est remplacée par « ma version ».
    Prisma.sql`NOT EXISTS (SELECT 1 FROM "Recipe" v WHERE v."parentId" = r.id)`,
  ];
  if (q.q) {
    const pattern = like(q.q);
    c.push(Prisma.sql`(
      unaccent(lower(r.title)) LIKE ${pattern}
      OR unaccent(lower(r.cuisine)) LIKE ${pattern}
      OR unaccent(lower(r.description)) LIKE ${pattern}
      OR word_similarity(unaccent(lower(${q.q})), unaccent(lower(r.title))) > 0.45
      OR EXISTS (
        SELECT 1 FROM "RecipeIngredient" qi JOIN "Ingredient" qn ON qn.id = qi."ingredientId"
        WHERE qi."recipeId" = r.id AND qn."normalizedName" LIKE ${pattern}
      )
    )`);
  }
  if (q.category?.length) c.push(Prisma.sql`r.category IN (${Prisma.join(q.category)})`);
  if (q.cuisine?.length) c.push(Prisma.sql`r.cuisine IN (${Prisma.join(q.cuisine)})`);
  if (q.mood?.length) c.push(Prisma.sql`r.moods && ARRAY[${Prisma.join(q.mood)}]::text[]`);
  if (q.diet?.length) c.push(Prisma.sql`r.diets @> ARRAY[${Prisma.join(q.diet)}]::text[]`);
  if (q.season) c.push(Prisma.sql`(cardinality(r.seasons) = 0 OR ${q.season} = ANY(r.seasons))`);
  if (q.maxTime) c.push(Prisma.sql`(r."prepMinutes" + r."cookMinutes") <= ${q.maxTime}`);
  if (q.difficulty) c.push(Prisma.sql`r.difficulty <= ${q.difficulty}`);
  if (q.lang) c.push(Prisma.sql`r.lang = ${q.lang}`);
  if (q.exclude) c.push(Prisma.sql`r.id <> ${q.exclude}`);
  switch (q.status) {
    case 'done':
      c.push(Prisma.sql`(s.status = 'done' OR s."timesCooked" > 0)`);
      break;
    case 'to_try':
    case 'not_for_me':
      c.push(Prisma.sql`s.status = ${q.status}`);
      break;
    case 'favorite':
      c.push(Prisma.sql`s.favorite = true`);
      break;
    case 'rated':
      c.push(Prisma.sql`s.rating IS NOT NULL`);
      break;
    case 'none':
      c.push(Prisma.sql`(s.status IS NULL AND coalesce(s."timesCooked", 0) = 0)`);
      break;
    case 'mine':
      c.push(Prisma.sql`(r.source = 'perso')`);
      break;
  }
  // « Pas pour moi » disparaît du catalogue, sauf si on le demande explicitement.
  if (q.status !== 'not_for_me') c.push(Prisma.sql`s.status IS DISTINCT FROM 'not_for_me'`);
  return c;
}

const FRIDGE_CTE = Prisma.sql`
  fridge_match AS (
    SELECT ri."recipeId",
      count(*) FILTER (WHERE NOT i."isStaple" AND NOT ri.optional AND i.aisle <> 'epices')::int AS total,
      count(f."ingredientId") FILTER (WHERE NOT i."isStaple" AND NOT ri.optional AND i.aisle <> 'epices')::int AS have,
      count(f."ingredientId") FILTER (WHERE f."expiresAt" <= current_date + 3)::int AS expiring,
      coalesce(array_agg(i.name ORDER BY ri.position)
        FILTER (WHERE f."ingredientId" IS NULL AND NOT i."isStaple" AND NOT ri.optional AND i.aisle <> 'epices'), '{}') AS missing
    FROM "RecipeIngredient" ri
    JOIN "Ingredient" i ON i.id = ri."ingredientId"
    LEFT JOIN "FridgeItem" f ON f."ingredientId" = ri."ingredientId"
    GROUP BY ri."recipeId"
  )`;

interface Row {
  id: number;
  total: number | null;
  have: number | null;
  expiring: number | null;
  missing: string[] | null;
  full_count: bigint;
}

function orderBy(q: Partial<RecipeQuery>): Prisma.Sql {
  const daySeed = new Date().toISOString().slice(0, 10);
  const moodScore = q.mood?.length
    ? Prisma.sql`cardinality(ARRAY(SELECT unnest(r.moods) INTERSECT SELECT unnest(ARRAY[${Prisma.join(q.mood)}]::text[]))) DESC,`
    : Prisma.empty;
  const fridgeScore = q.fridge
    ? Prisma.sql`(fm.total - fm.have) ASC, fm.expiring DESC, fm.have DESC,`
    : Prisma.empty;
  const searchScore = q.q
    ? Prisma.sql`(unaccent(lower(r.title)) LIKE ${like(q.q)}) DESC, word_similarity(unaccent(lower(${q.q})), unaccent(lower(r.title))) DESC,`
    : Prisma.empty;
  switch (q.sort) {
    case 'quick':
      return Prisma.sql`ORDER BY ${fridgeScore} (r."prepMinutes" + r."cookMinutes") ASC, r.id`;
    case 'rating':
      return Prisma.sql`ORDER BY s.rating DESC NULLS LAST, s."timesCooked" DESC NULLS LAST, r.title`;
    case 'recent':
      return Prisma.sql`ORDER BY s."lastCookedAt" DESC NULLS LAST, s."updatedAt" DESC NULLS LAST, r.title`;
    case 'new':
      return Prisma.sql`ORDER BY r."createdAt" DESC, r.id DESC`;
    case 'alpha':
      return Prisma.sql`ORDER BY r.title ASC`;
    default:
      // Pertinence : recherche, frigo, mood, puis un mélange qui change chaque jour (et met le français en avant).
      return Prisma.sql`ORDER BY ${searchScore} ${fridgeScore} ${moodScore} (r.lang = 'fr') DESC, md5(r.id::text || ${daySeed})`;
  }
}

function fridgeOf(row: Row): FridgeMatch | undefined {
  if (row.total == null) return undefined;
  return {
    have: row.have ?? 0,
    total: row.total,
    missing: row.missing ?? [],
    expiringUsed: row.expiring ?? 0,
  };
}

export async function searchRecipes(q: RecipeQuery): Promise<Paginated<RecipeCard>> {
  const conditions = buildConditions(q);
  const maxMissing = q.maxMissing ?? 2;
  if (q.fridge) {
    conditions.push(Prisma.sql`fm.have > 0 AND (fm.total - fm.have) <= ${maxMissing}`);
  }
  const offset = (q.page - 1) * q.pageSize;
  const rows = await prisma.$queryRaw<Row[]>`
    WITH ${FRIDGE_CTE}
    SELECT r.id,
      ${q.fridge ? Prisma.sql`fm.total, fm.have, fm.expiring, fm.missing` : Prisma.sql`NULL::int AS total, NULL::int AS have, NULL::int AS expiring, NULL::text[] AS missing`},
      count(*) OVER() AS full_count
    FROM "Recipe" r
    LEFT JOIN "RecipeState" s ON s."recipeId" = r.id
    ${q.fridge ? Prisma.sql`JOIN fridge_match fm ON fm."recipeId" = r.id` : Prisma.empty}
    WHERE ${Prisma.join(conditions, ' AND ')}
    ${orderBy(q)}
    LIMIT ${q.pageSize} OFFSET ${offset}`;

  const cards = await cardsByIds(rows.map((r) => r.id));
  const fridgeById = new Map(rows.map((r) => [r.id, fridgeOf(r)]));
  return {
    items: cards.map((c) => ({ ...c, fridge: fridgeById.get(c.id) })),
    total: rows.length ? Number(rows[0].full_count) : 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/** Tire une recette au hasard parmi les filtres actifs, en évitant ce qui a été cuisiné ces 14 derniers jours. */
export async function randomRecipe(q: Partial<RecipeQuery>): Promise<RecipeCard | null> {
  const base = buildConditions(q);
  if (q.fridge) base.push(Prisma.sql`fm.have > 0 AND (fm.total - fm.have) <= ${q.maxMissing ?? 2}`);
  const attempts = [
    [...base, Prisma.sql`(s."lastCookedAt" IS NULL OR s."lastCookedAt" < now() - interval '14 days')`],
    base,
  ];
  for (const conditions of attempts) {
    const rows = await prisma.$queryRaw<Row[]>`
      WITH ${FRIDGE_CTE}
      SELECT r.id,
        ${q.fridge ? Prisma.sql`fm.total, fm.have, fm.expiring, fm.missing` : Prisma.sql`NULL::int AS total, NULL::int AS have, NULL::int AS expiring, NULL::text[] AS missing`},
        0::bigint AS full_count
      FROM "Recipe" r
      LEFT JOIN "RecipeState" s ON s."recipeId" = r.id
      ${q.fridge ? Prisma.sql`JOIN fridge_match fm ON fm."recipeId" = r.id` : Prisma.empty}
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY random()
      LIMIT 1`;
    if (rows.length) {
      const [card] = await cardsByIds([rows[0].id]);
      return card ? { ...card, fridge: fridgeOf(rows[0]) } : null;
    }
  }
  return null;
}

export async function getRecipeDetail(id: number): Promise<RecipeDetail> {
  const r = await prisma.recipe.findUnique({
    where: { id },
    include: {
      state: true,
      parent: { select: { id: true, title: true } },
      version: { select: { id: true } },
      ingredients: { include: { ingredient: { include: { fridge: true } } }, orderBy: { position: 'asc' } },
      cookLogs: { orderBy: { cookedAt: 'desc' }, take: 20 },
    },
  });
  if (!r) throw new HttpError(404, 'Recette introuvable');
  return {
    ...toCard(r),
    servings: r.servings,
    tips: r.tips,
    steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
    ingredients: r.ingredients.map((ri) => ({
      id: ri.id,
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      aisle: ri.ingredient.aisle as RecipeDetail['ingredients'][number]['aisle'],
      isStaple: ri.ingredient.isStaple,
      quantity: ri.quantity,
      unit: ri.unit,
      note: ri.note,
      optional: ri.optional,
      inFridge: !!ri.ingredient.fridge,
    })),
    original: r.parent ? { id: r.parent.id, title: r.parent.title } : null,
    versionId: r.version?.id ?? null,
    cookLog: r.cookLogs.map((l) => l.cookedAt.toISOString()),
  };
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 2; await tx.recipe.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
}

async function writeIngredients(
  tx: Prisma.TransactionClient,
  recipeId: number,
  input: RecipeInput['ingredients'],
) {
  await tx.recipeIngredient.deleteMany({ where: { recipeId } });
  let position = 0;
  for (const ing of input) {
    const ingredient = await findOrCreateIngredient(tx, ing.name);
    await tx.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId: ingredient.id,
        quantity: ing.quantity ?? null,
        unit: ing.unit || null,
        note: ing.note || null,
        optional: ing.optional ?? false,
        position: position++,
      },
    });
  }
}

function recipeData(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description,
    emoji: input.emoji,
    color: input.color,
    imageUrl: input.imageUrl ?? null,
    category: input.category,
    cuisine: input.cuisine,
    moods: input.moods,
    diets: input.diets,
    seasons: input.seasons,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    servings: input.servings,
    difficulty: input.difficulty,
    cost: input.cost,
    tips: input.tips ?? null,
    steps: input.steps,
  };
}

export async function createRecipe(input: RecipeInput): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: { ...recipeData(input), slug: await uniqueSlug(tx, input.title), source: 'perso', lang: 'fr' },
    });
    await writeIngredients(tx, recipe.id, input.ingredients);
    return recipe.id;
  });
}

/**
 * Modifie une recette. Une recette du catalogue n'est jamais écrasée : on crée (ou met à jour)
 * « ma version », liée à l'originale, qui la remplace dans les listes. Renvoie l'id réellement modifié.
 */
export async function updateRecipe(id: number, input: RecipeInput): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.recipe.findUnique({ where: { id }, include: { version: true } });
    if (!current) throw new HttpError(404, 'Recette introuvable');
    let targetId = id;
    if (current.source !== 'perso') {
      if (current.version) {
        targetId = current.version.id;
        await tx.recipe.update({ where: { id: targetId }, data: recipeData(input) });
      } else {
        const created = await tx.recipe.create({
          data: {
            ...recipeData(input),
            slug: await uniqueSlug(tx, `${current.slug}-ma-version`),
            source: 'perso',
            lang: current.lang,
            parentId: current.id,
          },
        });
        targetId = created.id;
        // Les notes et le statut suivent la recette dans sa nouvelle version.
        const state = await tx.recipeState.findUnique({ where: { recipeId: id } });
        if (state) {
          const { recipeId: _r, updatedAt: _u, ...rest } = state;
          await tx.recipeState.create({ data: { ...rest, recipeId: targetId } });
        }
      }
    } else {
      await tx.recipe.update({ where: { id }, data: recipeData(input) });
    }
    await writeIngredients(tx, targetId, input.ingredients);
    return targetId;
  });
}

/** Supprime une recette perso, ou « ma version » (ce qui restaure l'originale). */
export async function deleteRecipe(id: number): Promise<{ restoredId: number | null }> {
  const r = await prisma.recipe.findUnique({ where: { id } });
  if (!r) throw new HttpError(404, 'Recette introuvable');
  if (r.source !== 'perso')
    throw new HttpError(400, 'Les recettes du catalogue ne peuvent pas être supprimées');
  await prisma.recipe.delete({ where: { id } });
  return { restoredId: r.parentId };
}
