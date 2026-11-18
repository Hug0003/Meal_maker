import type { PlanEntryDto } from '@meal/shared';
import { planInputSchema, planUpdateSchema } from '@meal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { HttpError, toCard } from '../lib/recipes';

const range = z.object({ from: z.string().date(), to: z.string().date() });
const idParam = z.object({ id: z.coerce.number().int().positive() });

export async function listPlan(from: string, to: string): Promise<PlanEntryDto[]> {
  const entries = await prisma.mealPlanEntry.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    include: { recipe: { include: { state: true } } },
    orderBy: [{ date: 'asc' }, { slot: 'asc' }, { id: 'asc' }],
  });
  return entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    slot: e.slot as PlanEntryDto['slot'],
    servings: e.servings,
    recipe: toCard(e.recipe),
  }));
}

export async function planRoutes(app: FastifyInstance) {
  app.get('/api/plan', async (req) => {
    const { from, to } = range.parse(req.query);
    return listPlan(from, to);
  });

  app.post('/api/plan', async (req, reply) => {
    const input = planInputSchema.parse(req.body);
    const recipe = await prisma.recipe.findUnique({ where: { id: input.recipeId } });
    if (!recipe) throw new HttpError(404, 'Recette introuvable');
    const entry = await prisma.mealPlanEntry.create({
      data: {
        date: new Date(input.date),
        slot: input.slot,
        recipeId: input.recipeId,
        servings: input.servings ?? recipe.servings,
      },
    });
    return reply.status(201).send({ id: entry.id });
  });

  app.patch('/api/plan/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const input = planUpdateSchema.parse(req.body);
    await prisma.mealPlanEntry.update({
      where: { id },
      data: {
        ...(input.date && { date: new Date(input.date) }),
        ...(input.slot && { slot: input.slot }),
        ...(input.servings && { servings: input.servings }),
      },
    });
    return { ok: true };
  });

  app.delete('/api/plan/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    await prisma.mealPlanEntry.deleteMany({ where: { id } });
    return { ok: true };
  });
}
