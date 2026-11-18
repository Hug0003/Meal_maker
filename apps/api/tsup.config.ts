import { defineConfig } from 'tsup';

// Un bundle par point d'entrée ; le paquet @meal/shared (sources TS) est intégré au bundle.
export default defineConfig({
  entry: {
    server: 'src/server.ts',
    'scripts/seed': 'src/scripts/seed.ts',
    'scripts/import-mealdb': 'src/scripts/import-mealdb.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
  noExternal: ['@meal/shared'],
});
