import type { IngredientDto, MetaDto } from '@meal/shared';
import { normalizeName } from '@meal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cached } from '../lib/cache';
import { prisma } from '../lib/db';

export async function metaRoutes(app: FastifyInstance) {
  app.get('/api/meta', async (): Promise<MetaDto> =>
    cached('meta', null, 600, async () => {
      const visible = { version: { is: null } };
      const [total, cuisines, categories, moodRows, done, rated, toTry, fridge] = await Promise.all([
        prisma.recipe.count({ where: visible }),
        prisma.recipe.groupBy({ by: ['cuisine'], where: visible, _count: true, orderBy: { cuisine: 'asc' } }),
        prisma.recipe.groupBy({ by: ['category'], where: visible, _count: true }),
        prisma.$queryRaw<{ id: string; count: number }[]>`
          SELECT m AS id, count(*)::int AS count FROM "Recipe" r, unnest(r.moods) m
          WHERE NOT EXISTS (SELECT 1 FROM "Recipe" v WHERE v."parentId" = r.id) GROUP BY m`,
        prisma.recipeState.count({ where: { OR: [{ status: 'done' }, { timesCooked: { gt: 0 } }] } }),
        prisma.recipeState.count({ where: { rating: { not: null } } }),
        prisma.recipeState.count({ where: { status: 'to_try' } }),
        prisma.fridgeItem.count(),
      ]);
      return {
        total,
        cuisines: cuisines.map((c) => ({ id: c.cuisine, count: c._count })),
        categories: categories.map((c) => ({ id: c.category, count: c._count })),
        moods: moodRows,
        stats: { done, rated, toTry, fridge },
      };
    }),
  );

  app.get('/api/ingredients', async (req): Promise<IngredientDto[]> => {
    const { q } = z.object({ q: z.string().trim().max(60).default('') }).parse(req.query);
    const n = normalizeName(q);
    return cached('ingredients', n, 3600, async () => {
      const rows = await prisma.$queryRaw<(IngredientDto & { uses: number })[]>`
        SELECT i.id, i.name, i.aisle, i."isStaple", count(ri.id)::int AS uses
        FROM "Ingredient" i LEFT JOIN "RecipeIngredient" ri ON ri."ingredientId" = i.id
        WHERE ${n} = '' OR i."normalizedName" LIKE ${'%' + n + '%'} OR word_similarity(${n}, i."normalizedName") > 0.5
        GROUP BY i.id
        ORDER BY (i."normalizedName" = ${n}) DESC, (i."normalizedName" LIKE ${n + '%'}) DESC, uses DESC, i.name
        LIMIT 12`;
      return rows.map(({ uses: _u, ...rest }) => rest);
    });
  });
}
