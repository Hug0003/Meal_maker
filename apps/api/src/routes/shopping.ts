import type { ShoppingItemDto } from '@meal/shared';
import {
  AISLES,
  mergeQuantities,
  scaleQuantity,
  shoppingGenerateSchema,
  shoppingInputSchema,
  shoppingUpdateSchema,
} from '@meal/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { guessAisle } from '../lib/ingredients';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const aisleOrder = new Map<string, number>(AISLES.map((a, i) => [a.id, i]));

async function listShopping(): Promise<ShoppingItemDto[]> {
  const items = await prisma.shoppingItem.findMany({ orderBy: [{ checked: 'asc' }, { label: 'asc' }] });
  return items
    .map((i) => ({
      id: i.id,
      label: i.label,
      quantity: i.quantity,
      aisle: i.aisle as ShoppingItemDto['aisle'],
      checked: i.checked,
      fromPlan: i.fromPlan,
    }))
    .sort((a, b) => (aisleOrder.get(a.aisle) ?? 99) - (aisleOrder.get(b.aisle) ?? 99));
}

/**
 * Construit la liste de courses à partir du planning : quantités ajustées aux portions prévues,
 * fusionnées par ingrédient, sans les basiques ni ce qui est déjà dans le frigo.
 */
export async function buildShoppingFromPlan(from: string, to: string) {
  const entries = await prisma.mealPlanEntry.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    include: {
      recipe: { include: { ingredients: { include: { ingredient: { include: { fridge: true } } } } } },
    },
  });
  const byIngredient = new Map<
    number,
    { label: string; aisle: string; parts: { quantity: number | null; unit: string | null }[] }
  >();
  for (const entry of entries) {
    for (const ri of entry.recipe.ingredients) {
      if (ri.ingredient.isStaple || ri.ingredient.fridge || ri.optional) continue;
      const item = byIngredient.get(ri.ingredientId) ?? {
        label: ri.ingredient.name,
        aisle: ri.ingredient.aisle,
        parts: [],
      };
      item.parts.push({
        quantity: scaleQuantity(ri.quantity, entry.recipe.servings, entry.servings),
        unit: ri.unit,
      });
      byIngredient.set(ri.ingredientId, item);
    }
  }
  return [...byIngredient.values()].map((i) => ({
    label: i.label,
    aisle: i.aisle,
    quantity: mergeQuantities(i.parts) || null,
  }));
}

export async function shoppingRoutes(app: FastifyInstance) {
  app.get('/api/shopping', listShopping);

  app.post('/api/shopping/generate', async (req) => {
    const { from, to } = shoppingGenerateSchema.parse(req.body);
    const items = await buildShoppingFromPlan(from, to);
    // On remplace les articles issus du planning, en gardant ceux ajoutés à la main.
    await prisma.$transaction([
      prisma.shoppingItem.deleteMany({ where: { fromPlan: true } }),
      prisma.shoppingItem.createMany({ data: items.map((i) => ({ ...i, fromPlan: true })) }),
    ]);
    return listShopping();
  });

  app.post('/api/shopping', async (req, reply) => {
    const input = shoppingInputSchema.parse(req.body);
    await prisma.shoppingItem.create({
      data: { label: input.label, quantity: input.quantity ?? null, aisle: guessAisle(input.label) },
    });
    return reply.status(201).send(await listShopping());
  });

  app.patch('/api/shopping/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const { checked } = shoppingUpdateSchema.parse(req.body);
    await prisma.shoppingItem.update({ where: { id }, data: { checked } });
    return listShopping();
  });

  app.delete('/api/shopping/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    await prisma.shoppingItem.deleteMany({ where: { id } });
    return listShopping();
  });

  app.delete('/api/shopping', async (req) => {
    const { checked } = z.object({ checked: z.enum(['1', 'true']).optional() }).parse(req.query);
    await prisma.shoppingItem.deleteMany({ where: checked ? { checked: true } : {} });
    return listShopping();
  });
}
