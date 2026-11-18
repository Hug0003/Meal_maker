import { formatDuration } from '@meal/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CardGrid } from '../components/RecipeGrid';
import { RecipeVisual } from '../components/RecipeVisual';
import { EmptyState, PageHeader, Spinner, buttonClasses } from '../components/ui';
import { api } from '../lib/api';
import { capitalize } from '../lib/labels';

export function DiscoverPage() {
  const query = useQuery({ queryKey: ['discover'], queryFn: api.discover });
  if (query.isPending) return <Spinner label="On cherche des idées qui changent…" />;
  if (query.isError) return <EmptyState emoji="😵" title="Impossible de charger la découverte" />;
  const { weekly, history, newIngredients, cuisines } = query.data;
  const week = weekly?.week.split('-W')[1];

  return (
    <div className="space-y-12">
      <PageHeader
        emoji="🧭"
        title="Découverte"
        subtitle="Sors de tes habitudes : de nouveaux ingrédients, d'autres cuisines, et un plat surprise chaque semaine."
      />

      {weekly && (
        <section
          aria-labelledby="weekly-title"
          className={`tint-${weekly.recipe.color} overflow-hidden rounded-[2rem] bg-surface ring-1 ring-line md:grid md:grid-cols-2`}
        >
          <RecipeVisual
            emoji={weekly.recipe.emoji}
            color={weekly.recipe.color}
            imageUrl={weekly.recipe.imageUrl}
            title={weekly.recipe.title}
            className="h-56 md:h-full md:min-h-80"
            emojiClass="text-[8rem]"
          />
          <div className="flex flex-col justify-center p-6 md:p-10">
            <p className="font-extrabold text-tomato">
              🌟 Découverte de la semaine {week && `· semaine ${Number(week)}`}
            </p>
            <h2 id="weekly-title" className="mt-2 text-3xl font-semibold md:text-4xl">
              {weekly.recipe.title}
            </h2>
            <p className="mt-2 text-muted">{weekly.reason}</p>
            <p className="mt-3 text-sm font-bold">
              ⏱️ {formatDuration(weekly.recipe.prepMinutes + weekly.recipe.cookMinutes)} ·{' '}
              {capitalize(weekly.recipe.cuisine)}
            </p>
            <div className="mt-6">
              <Link to={`/recette/${weekly.recipe.id}`} className={buttonClasses('primary')}>
                Je relève le défi 💪
              </Link>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="new-title">
        <h2 id="new-title" className="text-2xl font-semibold">
          ✨ Des ingrédients que tu ne cuisines jamais
        </h2>
        <p className="mb-4 text-muted">
          Basé sur les plats que tu as marqués comme faits. Plus tu en marques, plus c'est pertinent.
        </p>
        {newIngredients.length ? (
          <CardGrid recipes={newIngredients} />
        ) : (
          <p className="text-muted">Tu as déjà tout essayé ?! Bravo 👏</p>
        )}
      </section>

      {cuisines.length > 0 && (
        <section aria-labelledby="cuisines-title">
          <h2 id="cuisines-title" className="mb-4 text-2xl font-semibold">
            🌍 Cuisines à explorer
          </h2>
          <div className="space-y-8">
            {cuisines.map((c) => (
              <div key={c.cuisine}>
                <h3 className="mb-3 text-lg font-semibold">
                  Cuisine {c.cuisine}{' '}
                  <span className="text-sm font-bold text-muted">
                    ·{' '}
                    {c.cooked === 0
                      ? 'jamais testée'
                      : `${c.cooked} plat${c.cooked > 1 ? 's' : ''} fait${c.cooked > 1 ? 's' : ''}`}
                  </span>
                </h3>
                <CardGrid recipes={c.recipes} />
              </div>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-4 text-2xl font-semibold">
            🗓️ Les découvertes précédentes
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {history.map((h) => (
              <Link
                key={h.week}
                to={`/recette/${h.recipe.id}`}
                className="w-48 shrink-0 overflow-hidden rounded-3xl bg-surface ring-1 ring-line"
              >
                <RecipeVisual
                  emoji={h.recipe.emoji}
                  color={h.recipe.color}
                  imageUrl={h.recipe.imageUrl}
                  title={h.recipe.title}
                  className="h-24"
                  emojiClass="text-4xl"
                />
                <div className="p-3">
                  <p className="text-xs font-bold text-muted">Semaine {Number(h.week.split('-W')[1])}</p>
                  <p className="line-clamp-2 font-semibold">{h.recipe.title}</p>
                  {h.recipe.state?.status === 'done' && (
                    <p className="text-xs font-bold text-mint">✅ Relevé !</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
