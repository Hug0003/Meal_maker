/** Importe le catalogue TheMealDB (≈ 300 recettes en anglais) dans la base. Idempotent. */
import { redis } from '../lib/cache';
import { prisma } from '../lib/db';
import { importMealDb } from '../seed/mealdb';

importMealDb()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
