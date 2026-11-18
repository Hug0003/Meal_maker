# 🍳 Meal Maker

Des idées de plats selon ton frigo et ton humeur du jour : un gros catalogue de recettes variées, un tirage
au sort, un suivi « fait / à tester / pas pour moi » avec notes sur 5, une rubrique découverte et un planning
qui génère la liste de courses.

## Fonctionnalités

|                           |                                                                                                                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📚 **Catalogue**          | ~160 recettes françaises rédigées (46 cuisines au total) + ~790 recettes TheMealDB importables. Recherche sans accents ni fautes (« creme brulee »), filtres par catégorie, temps, régime, cuisine, saison.                                        |
| 🧊 **Mon frigo**          | On liste ce qu'on a (avec date de péremption facultative) : le catalogue affiche « Tout est dans ton frigo » ou « Il manque : … ». Les basiques (sel, huile, beurre, farine…) et les épices sont ignorés ; ce qui périme bientôt passe en premier. |
| 🍫 **Mood du jour**       | Gourmand, Healthy, Rapide, Réconfort, Léger, Exotique, Festif : combinables, mémorisés pour la journée.                                                                                                                                            |
| 🎲 **Surprends-moi**      | Un plat au hasard qui respecte le mood, le frigo et la catégorie, sans reproposer ce qui a été cuisiné ces 14 derniers jours.                                                                                                                      |
| ⭐ **Suivi**              | Je l'ai fait / À tester / Pas pour moi, note sur 5, favoris, notes perso, historique des cuissons. Page **Mes plats** pour tout retrouver.                                                                                                         |
| 🧭 **Découverte**         | Plat de la semaine (change chaque lundi, historique conservé), recettes aux ingrédients jamais cuisinés, cuisines du monde peu explorées.                                                                                                          |
| ✏️ **Édition**            | Modifier une recette du catalogue crée « ma version » (l'originale reste restaurable) ; création de recettes perso.                                                                                                                                |
| 👩‍🍳 **Mode cuisine**       | Une étape à la fois en grand, minuteurs détectés automatiquement (« 20 min »), écran maintenu allumé.                                                                                                                                              |
| 📅 **Planning & courses** | Repas midi/soir de la semaine (glisser-déposer), liste de courses générée : quantités ajustées et fusionnées, sans ce qui est dans le frigo, rangée par rayon.                                                                                     |
| 🎨 **Confort**            | Portions ajustables, thème clair/sombre automatique, mobile d'abord, installable comme une app (PWA).                                                                                                                                              |

## Stack

```
apps/web         React 19 + Vite + Tailwind CSS v4 + TanStack Query    → Nginx (non privilégié)
apps/api         Node 22 + Fastify 5 + Prisma 6 + zod                  → /api
packages/shared  Types, schémas zod et fonctions partagés front/API
PostgreSQL 17    données (unaccent + pg_trgm pour la recherche)
Redis 7          cache des listes/recherches/découvertes, rate-limit
```

Tout tourne dans Docker. Le conteneur `web` est le seul exposé : il sert le front et relaie `/api` vers l'API.

## Démarrer

Prérequis : Docker Desktop.

```bash
cp .env.example .env          # facultatif : mots de passe, port, APP_PASSWORD…
docker compose up --build     # mode développement (rechargement à chaud)
```

→ http://localhost:8080. Au premier démarrage l'API applique les migrations et charge les recettes françaises.

| Commande                                                     | Effet                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `docker compose up --build`                                  | Développement : Vite + `tsx watch`, code monté depuis le disque    |
| `docker compose -f docker-compose.yml up --build`            | La pile de production en local                                     |
| `docker compose exec api npm run import:mealdb -w @meal/api` | Importe ~790 recettes TheMealDB (en anglais, ingrédients traduits) |
| `IMPORT_MEALDB=true` dans `.env`                             | Fait l'import automatiquement au démarrage                         |
| `APP_PASSWORD=…` dans `.env`                                 | Protège le site par un mot de passe unique                         |

En développement, Postgres, Redis et l'API sont aussi accessibles sur `127.0.0.1:55432`, `:56379` et `:53000`.

### Sans Docker (outils locaux)

```bash
npm install
npm run lint && npm run typecheck && npm test        # tests unitaires
TEST_DATABASE_URL=postgresql://meal:meal@localhost:55432/meal_test npm test -w @meal/api   # + intégration
BASE_URL=http://localhost:8080 npm run test:e2e      # Playwright, pile lancée
```

Les tests d'intégration ne tournent que si `TEST_DATABASE_URL` est défini : ils utilisent un schéma `vitest`
dédié dans cette base, jamais la base de développement.

## Ajouter des recettes au seed

Les recettes sont dans `apps/api/src/seed/data/*.ts`, au format compact :

```ts
{
  t: 'Quiche lorraine', d: 'Pâte croustillante, lardons…', e: '🥧', c: 'plat', k: 'française',
  m: ['gourmand', 'rapide'], p: 15, cook: 35, n: 6,
  i: ['1 rouleau|pâte brisée', '200 g|lardons', '3|œuf', '|sel', '?|ciboulette'],   // « ? » = facultatif
  st: ['Préchauffer le four…', 'Cuire 35 min.'],
}
```

Les régimes (végétarien, vegan, sans gluten, sans lactose) et les rayons sont déduits des ingrédients.
Le seed est idempotent : il est rejoué à chaque démarrage sans toucher aux notes, au frigo ni à « mes versions ».

## CI/CD

`.github/workflows/ci.yml`, sur le modèle de hugomeuriel-portfolio :

1. **checks** : lint, format, types, tests unitaires + intégration (Postgres et Redis en services), migrations à jour ;
2. **build** : images `web` et `api`, test de fumée de la pile `docker compose` de production (chaque chemin,
   en-têtes de sécurité, fichiers interdits), parcours Playwright desktop + mobile ;
3. **publication** sur `ghcr.io/hug0003/meal-maker-api` et `ghcr.io/hug0003/meal-maker-web` (`:latest` et `:<sha>`),
   hors pull requests.

Dependabot ouvre chaque semaine les mises à jour npm, Docker et GitHub Actions.

**Runner** : comme pour le portfolio, la variable de dépôt `RUNS_ON` choisit le runner (`self-hosted` pour
le serveur, sinon `ubuntu-latest`). Le workflow est prévu pour un runner partagé : ports hôtes aléatoires
(services de test et pile de fumée), tags d'images propres au run et supprimés à la fin, Playwright exécuté
dans son image Docker officielle. Sur le serveur, il suffit de Docker, git et curl.

### Déploiement (à brancher plus tard)

Les images publiées suffisent : sur le serveur, `docker compose -f docker-compose.yml pull && docker compose -f docker-compose.yml up -d`
(avec un `.env`). Pour un déploiement automatique comme le portfolio, ajouter en fin de job `build` une étape qui
envoie l'événement `site-updated` à `Hug0003/sites-infra` (secret `SITES_DEPLOY_TOKEN`) et déclarer les services
`meal-maker-*` dans le `docker-compose.yml` de sites-infra.

## Crédits

Recettes importées depuis [TheMealDB](https://www.themealdb.com) (API publique de test).
