import type { RecipeCard as Card } from '@meal/shared';
import { formatDuration } from '@meal/shared';
import clsx from 'clsx';
import { Check, Clock, Heart, Pin } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useSetRecipeState } from '../lib/hooks';
import { capitalize, moodById } from '../lib/labels';
import { RecipeVisual } from './RecipeVisual';
import { StarRating } from './StarRating';

export function RecipeCard({ recipe, footer }: { recipe: Card; footer?: React.ReactNode }) {
  const setState = useSetRecipeState();
  const state = recipe.state;
  const total = recipe.prepMinutes + recipe.cookMinutes;
  const done = state?.status === 'done' || (state?.timesCooked ?? 0) > 0;

  const quick = (
    label: string,
    active: boolean,
    icon: React.ReactNode,
    onClick: () => void,
    activeClass: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-full shadow-sm backdrop-blur transition hover:scale-110',
        active ? activeClass : 'bg-white/90 text-[#2b2340]/70 hover:text-[#2b2340]',
      )}
    >
      {icon}
    </button>
  );

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        `tint-${recipe.color}`,
        'group relative overflow-hidden rounded-blob bg-surface shadow-[0_2px_0_0_var(--line)] ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lg',
      )}
    >
      <Link
        to={`/recette/${recipe.id}`}
        className="block focus-visible:outline-none"
        aria-label={recipe.title}
      >
        <RecipeVisual
          emoji={recipe.emoji}
          color={recipe.color}
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          className="h-40"
        />
        <div className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wide text-muted uppercase">
            <span>{capitalize(recipe.cuisine)}</span>
            {recipe.lang === 'en' && <span className="rounded bg-sky/15 px-1.5 text-sky">EN</span>}
            {recipe.isVersion && <span className="rounded bg-grape/15 px-1.5 text-grape">Ma version</span>}
          </div>
          <h3 className="line-clamp-2 text-lg leading-tight font-semibold">{recipe.title}</h3>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {formatDuration(total)}
            </span>
            {state?.rating ? <StarRating value={state.rating} size="sm" /> : null}
          </div>
          {recipe.fridge && (
            <p
              className={clsx(
                'mt-2 rounded-xl px-2.5 py-1.5 text-xs font-bold',
                recipe.fridge.missing.length ? 'bg-mango/15 text-ink' : 'bg-mint/15 text-mint',
              )}
            >
              {recipe.fridge.missing.length === 0
                ? '✅ Tout est dans ton frigo'
                : `🛒 Il manque : ${recipe.fridge.missing.join(', ')}`}
            </p>
          )}
          {recipe.newIngredients && recipe.newIngredients.length > 0 && (
            <p className="mt-2 rounded-xl bg-grape/10 px-2.5 py-1.5 text-xs font-bold text-grape">
              ✨ Nouveau pour toi : {recipe.newIngredients.join(', ')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.moods.slice(0, 3).map((m) => {
              const mood = moodById.get(m);
              return mood ? (
                <span
                  key={m}
                  className={`tint-${mood.color} soft-bg rounded-full px-2 py-0.5 text-xs font-bold`}
                >
                  {mood.emoji} {mood.label}
                </span>
              ) : null;
            })}
          </div>
          {footer}
        </div>
      </Link>
      <div className="absolute top-3 right-3 flex gap-1.5">
        {quick(
          done ? 'Déjà fait' : "Je l'ai fait",
          done,
          <Check size={18} strokeWidth={3} />,
          () => setState.mutate({ id: recipe.id, input: { status: done ? null : 'done' } }),
          'bg-mint text-white',
        )}
        {!done &&
          quick(
            state?.status === 'to_try' ? 'Retirer de « À tester »' : 'À tester',
            state?.status === 'to_try',
            <Pin size={16} strokeWidth={2.5} />,
            () =>
              setState.mutate({
                id: recipe.id,
                input: { status: state?.status === 'to_try' ? null : 'to_try' },
              }),
            'bg-sky text-white',
          )}
        {quick(
          state?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
          !!state?.favorite,
          <Heart size={16} strokeWidth={2.5} className={state?.favorite ? 'fill-current' : ''} />,
          () => setState.mutate({ id: recipe.id, input: { favorite: !state?.favorite } }),
          'bg-berry text-white',
        )}
      </div>
    </motion.article>
  );
}
