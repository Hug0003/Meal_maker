#!/bin/sh
# Démarrage de l'API : migrations, seed (idempotent), puis serveur.
set -e

echo "→ Migrations"
./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "→ Seed des recettes"
  node dist/scripts/seed.js
fi

echo "→ Démarrage de l'API"
exec node dist/server.js
