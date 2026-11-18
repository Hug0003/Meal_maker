/**
 * Charge (ou met à jour) les recettes françaises du seed. Idempotent : peut être relancé sans risque,
 * les notes, le frigo et « mes versions » ne sont jamais touchés.
 */
import { invalidate, redis } from '../lib/cache';
import { prisma } from '../lib/db';
import { guessAisle, isStaple } from '../lib/ingredients';
import { SEED_RECIPES, toCatalogRecipe } from '../seed/catalog';
import { upsertCatalogRecipe } from '../seed/upsert';

async function main() {
  let created = 0;
  let updated = 0;
  for (const seed of SEED_RECIPES) {
    const res = await upsertCatalogRecipe(prisma, toCatalogRecipe(seed));
    if (res === 'created') created++;
    else updated++;
  }
  // Les règles de rayon et de basiques évoluent : on les réapplique à tous les ingrédients.
  const all = await prisma.ingredient.findMany();
  for (const ing of all) {
    const aisle = guessAisle(ing.name);
    const staple = isStaple(ing.name);
    if (aisle !== ing.aisle || staple !== ing.isStaple) {
      await prisma.ingredient.update({ where: { id: ing.id }, data: { aisle, isStaple: staple } });
    }
  }
  await invalidate();
  console.log(
    `Seed terminé : ${created} recettes créées, ${updated} mises à jour (${SEED_RECIPES.length} au total).`,
  );

  if (process.env.IMPORT_MEALDB === 'true') {
    const { importMealDb } = await import('../seed/mealdb');
    await importMealDb();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
