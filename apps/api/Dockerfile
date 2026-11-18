# API Meal Maker (Fastify + Prisma). Construit depuis la racine du monorepo :
#   docker build -f apps/api/Dockerfile .
FROM node:26-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Manifestes seuls : la couche d'installation reste en cache tant que les dépendances ne changent pas.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Toutes les dépendances (build, tests, mode développement).
FROM manifests AS deps
RUN npm ci --no-audit --no-fund

FROM deps AS dev
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "-w", "@meal/api"]

FROM dev AS build
RUN npm run build -w @meal/api

# Dépendances de production uniquement (le code partagé est déjà intégré au bundle).
FROM manifests AS prod-deps
COPY apps/api/prisma apps/api/prisma
RUN npm ci --omit=dev --workspace @meal/api --no-audit --no-fund \
    && npx prisma generate --schema apps/api/prisma/schema.prisma \
    && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/prisma ./prisma
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN echo '{"type":"module"}' > package.json \
    && chmod 755 /usr/local/bin/docker-entrypoint.sh \
    && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["/usr/local/bin/docker-entrypoint.sh"]
