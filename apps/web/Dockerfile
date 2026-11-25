# Front Meal Maker : build Vite puis Nginx non privilégié. Construit depuis la racine du monorepo :
#   docker build -f apps/web/Dockerfile .
FROM node:25-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Les scripts d'installation (moteurs Prisma…) ne servent pas au front.
RUN npm ci --no-audit --no-fund --ignore-scripts

FROM deps AS dev
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "@meal/web"]

FROM dev AS build
RUN npm run build -w @meal/web

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
