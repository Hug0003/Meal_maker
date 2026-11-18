import { recipeInputSchema, recipeQuerySchema, recipeStateInputSchema } from '@meal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cached, invalidate } from '../lib/cache';
import { prisma } from '../lib/db';
import {
  HttpError,
  createRecipe,
  deleteRecipe,
  getRecipeDetail,
  randomRecipe,
  searchRecipes,
  toStateDto,
  updateRecipe,
} from '../lib/recipes';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export async function recipeRoutes(app: FastifyInstance) {
  app.get('/api/recipes', async (req) => {
    const q = recipeQuerySchema.parse(req.query);
    return cached('recipes', q, 600, () => searchRecipes(q));
  });

  // Jamais mis en cache : le tirage doit changer à chaque clic.
  app.get('/api/recipes/random', async (req, reply) => {
    const q = recipeQuerySchema.parse(req.query);
    const recipe = await randomRecipe(q);
    if (!recipe) return reply.status(404).send({ error: 'Aucune recette ne correspond à ces critères' });
    return recipe;
  });

  app.get('/api/recipes/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return cached('recipe', id, 600, () => getRecipeDetail(id));
  });

  app.post('/api/recipes', async (req, reply) => {
    const input = recipeInputSchema.parse(req.body);
    const id = await createRecipe(input);
    await invalidate();
    return reply.status(201).send(await getRecipeDetail(id));
  });

  app.put('/api/recipes/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const input = recipeInputSchema.parse(req.body);
    const targetId = await updateRecipe(id, input);
    await invalidate();
    return getRecipeDetail(targetId);
  });

  app.delete('/api/recipes/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const res = await deleteRecipe(id);
    await invalidate();
    return res;
  });

  app.put('/api/recipes/:id/state', async (req) => {
    const { id } = idParam.parse(req.params);
    const input = recipeStateInputSchema.parse(req.body);
    await ensureRecipe(id);
    const data = {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.favorite !== undefined && { favorite: input.favorite }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    // Noter un plat, c'est l'avoir fait.
    if (input.rating && input.status === undefined) {
      const current = await prisma.recipeState.findUnique({ where: { recipeId: id } });
      if (!current?.status || current.status === 'to_try') Object.assign(data, { status: 'done' });
    }
    const state = await prisma.recipeState.upsert({
      where: { recipeId: id },
      update: data,
      create: { recipeId: id, ...data },
    });
    await invalidate();
    return toStateDto(state);
  });

  app.post('/api/recipes/:id/cooked', async (req) => {
    const { id } = idParam.parse(req.params);
    await ensureRecipe(id);
    const now = new Date();
    const [state] = await prisma.$transaction([
      prisma.recipeState.upsert({
        where: { recipeId: id },
        update: { status: 'done', timesCooked: { increment: 1 }, lastCookedAt: now },
        create: { recipeId: id, status: 'done', timesCooked: 1, lastCookedAt: now },
      }),
      prisma.cookLog.create({ data: { recipeId: id, cookedAt: now } }),
    ]);
    await invalidate();
    return toStateDto(state);
  });
}

async function ensureRecipe(id: number) {
  const exists = await prisma.recipe.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, 'Recette introuvable');
}
