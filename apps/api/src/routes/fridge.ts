import type { FridgeItemDto } from '@meal/shared';
import { fridgeInputSchema, fridgeUpdateSchema } from '@meal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { invalidate } from '../lib/cache';
import { prisma } from '../lib/db';
import { findOrCreateIngredient } from '../lib/ingredients';

const idParam = z.object({ ingredientId: z.coerce.number().int().positive() });

async function listFridge(): Promise<FridgeItemDto[]> {
  const items = await prisma.fridgeItem.findMany({
    include: { ingredient: true },
    orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { addedAt: 'desc' }],
  });
  return items.map((f) => ({
    ingredientId: f.ingredientId,
    name: f.ingredient.name,
    aisle: f.ingredient.aisle as FridgeItemDto['aisle'],
    addedAt: f.addedAt.toISOString(),
    expiresAt: f.expiresAt ? f.expiresAt.toISOString().slice(0, 10) : null,
  }));
}

export async function fridgeRoutes(app: FastifyInstance) {
  app.get('/api/fridge', listFridge);

  app.post('/api/fridge', async (req, reply) => {
    const input = fridgeInputSchema.parse(req.body);
    const ingredient = await findOrCreateIngredient(prisma, input.name);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    await prisma.fridgeItem.upsert({
      where: { ingredientId: ingredient.id },
      update: input.expiresAt !== undefined ? { expiresAt } : {},
      create: { ingredientId: ingredient.id, expiresAt },
    });
    await invalidate();
    return reply.status(201).send(await listFridge());
  });

  app.patch('/api/fridge/:ingredientId', async (req) => {
    const { ingredientId } = idParam.parse(req.params);
    const { expiresAt } = fridgeUpdateSchema.parse(req.body);
    await prisma.fridgeItem.update({
      where: { ingredientId },
      data: { expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    await invalidate();
    return listFridge();
  });

  app.delete('/api/fridge/:ingredientId', async (req) => {
    const { ingredientId } = idParam.parse(req.params);
    await prisma.fridgeItem.deleteMany({ where: { ingredientId } });
    await invalidate();
    return listFridge();
  });

  app.delete('/api/fridge', async () => {
    await prisma.fridgeItem.deleteMany();
    await invalidate();
    return [];
  });
}
