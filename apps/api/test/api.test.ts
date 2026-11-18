/**
 * Tests d'intégration de l'API contre un vrai Postgres + Redis.
 * Ils ne tournent que si TEST_DATABASE_URL est défini (base dédiée, vidée au début) :
 * jamais sur la base de développement par accident.
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
const run = TEST_DB ? describe : describe.skip;

run('API', () => {
  let app: FastifyInstance;
  const call = async (method: string, url: string, payload?: unknown) => {
    const res = await app.inject({ method: method as 'GET', url, payload: payload as object });
    return { status: res.statusCode, body: res.json() };
  };

  beforeAll(async () => {
    // Schéma dédié aux tests dans la base de test : recréé à chaque exécution.
    const { PrismaClient } = await import('@prisma/client');
    const admin = new PrismaClient({ datasourceUrl: TEST_DB });
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS vitest CASCADE');
    await admin.$disconnect();
    process.env.DATABASE_URL = `${TEST_DB}${TEST_DB!.includes('?') ? '&' : '?'}schema=vitest`;
    process.env.NODE_ENV = 'test';
    const { execSync } = await import('node:child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    const { prisma } = await import('../src/lib/db');
    const { redis } = await import('../src/lib/cache');
    await redis.flushdb();
    const { SEED_RECIPES, toCatalogRecipe } = await import('../src/seed/catalog');
    const { upsertCatalogRecipe } = await import('../src/seed/upsert');
    for (const r of SEED_RECIPES) await upsertCatalogRecipe(prisma, toCatalogRecipe(r));
    const { buildApp } = await import('../src/app');
    app = await buildApp({ logger: false });
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    const { prisma } = await import('../src/lib/db');
    const { redis } = await import('../src/lib/cache');
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('répond à /api/health', async () => {
    const res = await call('GET', '/api/health');
    expect(res).toMatchObject({ status: 200, body: { status: 'ok', db: true, redis: true } });
  });

  it('liste et filtre le catalogue', async () => {
    const all = await call('GET', '/api/recipes?pageSize=5');
    expect(all.body.total).toBeGreaterThan(150);
    expect(all.body.items).toHaveLength(5);

    const quick = await call('GET', '/api/recipes?maxTime=20&category=plat,entree');
    for (const r of quick.body.items) {
      expect(r.prepMinutes + r.cookMinutes).toBeLessThanOrEqual(20);
      expect(['plat', 'entree']).toContain(r.category);
    }

    const vegan = await call('GET', '/api/recipes?diet=vegan&pageSize=60');
    expect(vegan.body.items.every((r: { diets: string[] }) => r.diets.includes('vegan'))).toBe(true);

    const mood = await call('GET', '/api/recipes?mood=healthy');
    expect(mood.body.items[0].moods).toContain('healthy');
  });

  it('cherche sans accents', async () => {
    const res = await call('GET', '/api/recipes?q=creme%20brulee');
    expect(res.body.items[0].title).toBe('Crème brûlée');
    const byIngredient = await call('GET', '/api/recipes?q=reblochon');
    expect(byIngredient.body.items.map((r: { title: string }) => r.title)).toContain('Tartiflette');
  });

  it('refuse les paramètres invalides', async () => {
    expect((await call('GET', '/api/recipes?mood=inconnu')).status).toBe(400);
    expect((await call('POST', '/api/recipes', { title: 'x' })).status).toBe(400);
    expect((await call('GET', '/api/recipes/999999')).status).toBe(404);
  });

  it('filtre selon le frigo', async () => {
    for (const name of ['œufs', 'lardons', 'crème fraîche', 'pâte brisée', 'lait']) {
      expect((await call('POST', '/api/fridge', { name })).status).toBe(201);
    }
    const fridge = await call('GET', '/api/fridge');
    expect(fridge.body.map((f: { name: string }) => f.name)).toContain('œuf');

    const res = await call('GET', '/api/recipes?fridge=1&maxMissing=0');
    const quiche = res.body.items.find((r: { title: string }) => r.title === 'Quiche lorraine');
    expect(quiche.fridge).toMatchObject({ missing: [] });

    const random = await call('GET', '/api/recipes/random?fridge=1&maxMissing=0');
    expect(random.status).toBe(200);
    expect(random.body.fridge.missing).toEqual([]);
    await call('DELETE', '/api/fridge');
  });

  it('enregistre statut, note et cuisson', async () => {
    const { body: list } = await call('GET', '/api/recipes?q=tartiflette');
    const id = list.items[0].id;
    const rated = await call('PUT', `/api/recipes/${id}/state`, { rating: 5 });
    expect(rated.body).toMatchObject({ rating: 5, status: 'done' });
    const cooked = await call('POST', `/api/recipes/${id}/cooked`);
    expect(cooked.body.timesCooked).toBe(1);
    const mine = await call('GET', '/api/recipes?status=done&sort=rating');
    expect(mine.body.items[0].id).toBe(id);

    const hidden = await call('PUT', `/api/recipes/${id}/state`, { status: 'not_for_me' });
    expect(hidden.status).toBe(200);
    const search = await call('GET', '/api/recipes?q=tartiflette');
    expect(search.body.items.find((r: { id: number }) => r.id === id)).toBeUndefined();
    await call('PUT', `/api/recipes/${id}/state`, { status: 'done' });
  });

  it('crée « ma version » d’une recette du catalogue puis la restaure', async () => {
    const { body: list } = await call('GET', '/api/recipes?q=ratatouille');
    const original = (await call('GET', `/api/recipes/${list.items[0].id}`)).body;
    const input = {
      title: 'Ratatouille express',
      description: original.description,
      emoji: original.emoji,
      color: original.color,
      category: original.category,
      cuisine: original.cuisine,
      moods: original.moods,
      diets: original.diets,
      seasons: original.seasons,
      prepMinutes: 10,
      cookMinutes: 20,
      servings: 2,
      difficulty: 1,
      cost: 1,
      ingredients: [{ name: 'courgette', quantity: 2 }, { name: 'tomates' }],
      steps: ['Tout couper.', 'Tout cuire 20 min.'],
    };
    const edited = await call('PUT', `/api/recipes/${original.id}`, input);
    expect(edited.body).toMatchObject({
      title: 'Ratatouille express',
      isVersion: true,
      original: { id: original.id },
    });
    expect(edited.body.ingredients.map((i: { name: string }) => i.name)).toEqual(['courgette', 'tomate']);

    const search = await call('GET', '/api/recipes?q=ratatouille');
    expect(search.body.items.map((r: { id: number }) => r.id)).toEqual([edited.body.id]);

    const restored = await call('DELETE', `/api/recipes/${edited.body.id}`);
    expect(restored.body).toEqual({ restoredId: original.id });
    expect((await call('DELETE', `/api/recipes/${original.id}`)).status).toBe(400);
  });

  it('propose des découvertes stables sur la semaine', async () => {
    const a = await call('GET', '/api/discover');
    expect(a.body.weekly.recipe.id).toBeTypeOf('number');
    expect(a.body.newIngredients.length).toBeGreaterThan(0);
    const { discover } = await import('../src/lib/discover');
    const b = await discover();
    expect(b.weekly?.recipe.id).toBe(a.body.weekly.recipe.id);
  });

  it('génère la liste de courses depuis le planning', async () => {
    const { body: list } = await call('GET', '/api/recipes?q=bourguignon');
    const id = list.items[0].id;
    await call('POST', '/api/fridge', { name: 'carotte' });
    expect(
      (await call('POST', '/api/plan', { date: '2026-11-18', slot: 'soir', recipeId: id, servings: 3 }))
        .status,
    ).toBe(201);
    const shop = await call('POST', '/api/shopping/generate', { from: '2026-11-16', to: '2026-11-22' });
    const labels = shop.body.map((i: { label: string }) => i.label);
    expect(labels).toContain('bœuf');
    expect(labels).not.toContain('carotte'); // déjà dans le frigo
    expect(labels).not.toContain('sel'); // basique
    expect(shop.body.find((i: { label: string }) => i.label === 'bœuf').quantity).toBe('600 g');
  });
});
