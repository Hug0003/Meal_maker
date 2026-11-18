import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests d'intégration partagent une base : on les exécute en série.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
