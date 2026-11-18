import { CATEGORIES, DIETS, SORTS, currentSeason, type SortId } from '@meal/shared';
import clsx from 'clsx';
import { Refrigerator, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MoodBar } from '../components/MoodBar';
import { RecipeGrid } from '../components/RecipeGrid';
import { Button, Chip, EmptyState } from '../components/ui';
import { useFridge, useMeta } from '../lib/hooks';
import { capitalize, seasonById } from '../lib/labels';
import { useFridgeMode, useMood } from '../lib/prefs';

const TIMES = [15, 30, 45, 60];

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return 'Bien réveillé ? On prépare quoi ce matin ?';
  if (h < 15) return "Qu'est-ce qu'on mange ce midi ?";
  if (h < 18) return 'Une petite envie pour le goûter ?';
  return "Qu'est-ce qu'on mange ce soir ?";
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const [moods] = useMood();
  const [fridgeMode, setFridgeMode] = useFridgeMode();
  const fridge = useFridge();
  const meta = useMeta();
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [total, setTotal] = useState<number | null>(null);
  const season = currentSeason();

  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? [];
  const set = (key: string, value: string | string[] | null) => {
    const next = new URLSearchParams(params);
    const v = Array.isArray(value) ? value.join(',') : value;
    if (v) next.set(key, v);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggleIn = (key: string, id: string) => {
    const cur = list(key);
    set(key, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  // Recherche avec un léger délai pour ne pas interroger l'API à chaque frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) set('q', search.trim() || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = useMemo(
    () => ({
      q: params.get('q') ?? undefined,
      category: list('category'),
      cuisine: list('cuisine'),
      diet: list('diet'),
      mood: moods,
      maxTime: params.get('maxTime') ?? undefined,
      season: params.get('season') ?? undefined,
      lang: params.get('lang') ?? undefined,
      sort: params.get('sort') ?? undefined,
      fridge: fridgeMode,
      maxMissing: fridgeMode ? (params.get('maxMissing') ?? 2) : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, moods, fridgeMode],
  );

  const activeFilters =
    list('category').length +
    list('cuisine').length +
    list('diet').length +
    (params.get('maxTime') ? 1 : 0) +
    (params.get('season') ? 1 : 0) +
    (params.get('lang') ? 1 : 0);
  const onTotal = useCallback((n: number) => setTotal(n), []);
  const fridgeCount = fridge.data?.length ?? 0;

  return (
    <div>
      <section className="mb-6">
        <p className="mb-1 font-bold text-tomato">Coucou 👋</p>
        <h1 className="text-3xl font-semibold md:text-5xl">{greeting()}</h1>
      </section>

      <div className="sticky top-14 z-20 -mx-4 mb-5 space-y-3 bg-bg/90 px-4 pt-2 pb-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher une recette ou un ingrédient</span>
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Une envie ? « curry », « courgette », « gratin »…"
              className="w-full rounded-full border-2 border-line bg-surface py-3 pr-4 pl-11 font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-tomato"
            />
          </label>
          <Button
            variant="soft"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0"
          >
            <SlidersHorizontal size={18} />
            <span className="hidden sm:inline">Filtres</span>
            {activeFilters > 0 && (
              <span className="rounded-full bg-tomato px-1.5 text-xs text-white">{activeFilters}</span>
            )}
          </Button>
        </div>
        <MoodBar />
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={fridgeMode} tint="mint" onClick={() => setFridgeMode(!fridgeMode)}>
            <Refrigerator size={15} /> Avec mon frigo {fridgeCount > 0 && `(${fridgeCount})`}
          </Chip>
          {fridgeMode && (
            <select
              aria-label="Ingrédients manquants acceptés"
              value={params.get('maxMissing') ?? '2'}
              onChange={(e) => set('maxMissing', e.target.value)}
              className="rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold"
            >
              <option value="0">Rien ne manque</option>
              <option value="1">Max 1 manquant</option>
              <option value="2">Max 2 manquants</option>
              <option value="4">Max 4 manquants</option>
            </select>
          )}
          <Chip
            active={params.get('season') === season}
            tint="lime"
            onClick={() => set('season', params.get('season') ? null : season)}
          >
            {seasonById.get(season)?.emoji} De saison
          </Chip>
          <select
            aria-label="Trier"
            value={params.get('sort') ?? 'relevance'}
            onChange={(e) => set('sort', e.target.value === 'relevance' ? null : (e.target.value as SortId))}
            className="ml-auto rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {showFilters && (
          <div className="space-y-3 rounded-3xl border-2 border-line bg-surface p-4">
            <FilterRow label="Catégorie">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  tint="tomato"
                  active={list('category').includes(c.id)}
                  onClick={() => toggleIn('category', c.id)}
                >
                  {c.emoji} {c.label}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Temps total">
              {TIMES.map((t) => (
                <Chip
                  key={t}
                  tint="mango"
                  active={params.get('maxTime') === String(t)}
                  onClick={() => set('maxTime', params.get('maxTime') === String(t) ? null : String(t))}
                >
                  ≤ {t} min
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Régime">
              {DIETS.map((d) => (
                <Chip
                  key={d.id}
                  tint="mint"
                  active={list('diet').includes(d.id)}
                  onClick={() => toggleIn('diet', d.id)}
                >
                  {d.emoji} {d.label}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Cuisine">
              {meta.data?.cuisines
                .filter((c) => c.count >= 2)
                .map((c) => (
                  <Chip
                    key={c.id}
                    tint="grape"
                    active={list('cuisine').includes(c.id)}
                    onClick={() => toggleIn('cuisine', c.id)}
                  >
                    {capitalize(c.id)} <span className="opacity-60">{c.count}</span>
                  </Chip>
                ))}
            </FilterRow>
            <FilterRow label="Langue">
              <Chip
                tint="sky"
                active={params.get('lang') === 'fr'}
                onClick={() => set('lang', params.get('lang') === 'fr' ? null : 'fr')}
              >
                🇫🇷 En français uniquement
              </Chip>
            </FilterRow>
            {activeFilters > 0 && (
              <button
                className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink"
                onClick={() => {
                  setSearch('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                <X size={14} /> Tout effacer
              </button>
            )}
          </div>
        )}
      </div>

      {total !== null && (
        <p className="mb-3 text-sm font-semibold text-muted">
          {total} recette{total > 1 ? 's' : ''}
          {fridgeMode && ' faisables avec ton frigo'}
        </p>
      )}

      {fridgeMode && fridgeCount === 0 ? (
        <EmptyState emoji="🧊" title="Ton frigo est vide (dans l'app 😉)">
          Ajoute ce que tu as sous la main et on te propose des plats.{' '}
          <Link to="/frigo" className="font-bold text-tomato underline">
            Remplir mon frigo
          </Link>
        </EmptyState>
      ) : (
        <RecipeGrid
          params={query}
          onTotal={onTotal}
          empty={
            <EmptyState emoji="🥲" title="Aucune recette ne correspond">
              Essaie d'enlever un filtre ou un mood
              {fridgeMode ? ', ou d’accepter plus d’ingrédients manquants' : ''}.
            </EmptyState>
          }
        />
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={clsx('mb-1.5 text-xs font-extrabold tracking-wide text-muted uppercase')}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
