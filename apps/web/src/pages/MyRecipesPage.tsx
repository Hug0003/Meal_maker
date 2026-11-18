import { useState } from 'react';
import { Link } from 'react-router';
import { RecipeGrid } from '../components/RecipeGrid';
import { Chip, EmptyState, PageHeader } from '../components/ui';
import { useMeta } from '../lib/hooks';

const TABS = [
  {
    id: 'done',
    label: "Je l'ai fait",
    emoji: '✅',
    sort: 'rating',
    empty: 'Marque les plats que tu as cuisinés avec ✅ pour les retrouver ici, avec ta note.',
  },
  {
    id: 'favorite',
    label: 'Favoris',
    emoji: '❤️',
    sort: 'rating',
    empty: 'Clique sur le cœur d’une recette pour la garder sous la main.',
  },
  {
    id: 'rated',
    label: 'Notés',
    emoji: '⭐',
    sort: 'rating',
    empty: 'Note tes plats sur 5 depuis leur fiche.',
  },
  {
    id: 'to_try',
    label: 'À tester',
    emoji: '📌',
    sort: 'new',
    empty: 'Épingle les recettes qui te font envie.',
  },
  {
    id: 'mine',
    label: 'Mes recettes',
    emoji: '✏️',
    sort: 'new',
    empty: 'Crée tes propres recettes ou modifie celles du catalogue.',
  },
  {
    id: 'not_for_me',
    label: 'Pas pour moi',
    emoji: '🙅',
    sort: 'alpha',
    empty: 'Les recettes écartées n’apparaissent plus ailleurs. Tu peux changer d’avis ici.',
  },
] as const;

export function MyRecipesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('done');
  const [sort, setSort] = useState<string | null>(null);
  const meta = useMeta();
  const current = TABS.find((t) => t.id === tab)!;
  const stats = meta.data?.stats;

  return (
    <div>
      <PageHeader
        emoji="📒"
        title="Mes plats"
        subtitle="Tout ce que tu as cuisiné, noté, adoré ou mis de côté."
      >
        {stats && (
          <div className="flex gap-3 text-center">
            <Stat n={stats.done} label="faits" />
            <Stat n={stats.rated} label="notés" />
            <Stat n={stats.toTry} label="à tester" />
          </div>
        )}
      </PageHeader>
      <div
        role="tablist"
        aria-label="Catégories de mes plats"
        className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4"
      >
        {TABS.map((t) => (
          <Chip
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            active={tab === t.id}
            tint="tomato"
            onClick={() => {
              setTab(t.id);
              setSort(null);
            }}
          >
            {t.emoji} {t.label}
          </Chip>
        ))}
      </div>
      {(tab === 'done' || tab === 'rated' || tab === 'favorite') && (
        <div className="mb-4 flex gap-2 text-sm">
          <span className="self-center font-bold text-muted">Trier :</span>
          <Chip active={(sort ?? current.sort) === 'rating'} onClick={() => setSort('rating')}>
            ⭐ Mieux notés
          </Chip>
          <Chip active={sort === 'recent'} onClick={() => setSort('recent')}>
            🕒 Cuisinés récemment
          </Chip>
        </div>
      )}
      <RecipeGrid
        params={{ status: tab, sort: sort ?? current.sort }}
        empty={
          <EmptyState emoji={current.emoji} title="Rien ici pour l'instant">
            {current.empty}{' '}
            {tab === 'mine' ? (
              <Link to="/recette/nouvelle" className="font-bold text-tomato underline">
                Créer une recette
              </Link>
            ) : (
              <Link to="/" className="font-bold text-tomato underline">
                Explorer les recettes
              </Link>
            )}
          </EmptyState>
        }
      />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-2 ring-1 ring-line">
      <div className="font-display text-2xl font-semibold">{n}</div>
      <div className="text-xs font-bold text-muted">{label}</div>
    </div>
  );
}
