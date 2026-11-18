import type { ParsedIngredient } from '@meal/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { findOrCreateIngredient } from '../lib/ingredients';

export interface CatalogRecipe {
  slug: string;
  externalId?: string | null;
  title: string;
  description: string;
  emoji: string;
  color: string;
  imageUrl?: string | null;
  category: string;
  cuisine: string;
  moods: string[];
  diets: string[];
  seasons: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: number;
  cost: number;
  tips?: string | null;
  steps: string[];
  source: 'seed' | 'themealdb';
  lang: 'fr' | 'en';
  ingredients: ParsedIngredient[];
}

/** Crée ou met à jour une recette du catalogue (clé : slug), ingrédients compris. Idempotent. */
export async function upsertCatalogRecipe(
  prisma: PrismaClient,
  r: CatalogRecipe,
): Promise<'created' | 'updated'> {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const { ingredients, ...data } = r;
      const existing = await tx.recipe.findUnique({ where: { slug: r.slug }, select: { id: true } });
      const recipe = existing
        ? await tx.recipe.update({ where: { id: existing.id }, data })
        : await tx.recipe.create({ data });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      // Un même ingrédient peut apparaître deux fois (ex. « œuf » et « jaune d'œuf » restent distincts) : on garde chaque ligne.
      let position = 0;
      for (const ing of ingredients) {
        if (!ing.name) continue;
        const ingredient = await findOrCreateIngredient(tx, ing.name);
        await tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: ing.quantity,
            unit: ing.unit,
            note: ing.note,
            optional: ing.optional,
            position: position++,
          },
        });
      }
      return existing ? 'updated' : 'created';
    },
    { timeout: 30000 },
  );
}
