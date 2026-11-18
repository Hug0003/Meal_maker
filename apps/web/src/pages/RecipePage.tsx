import { detectTimers, formatDuration, formatQuantity, scaleQuantity, type RecipeDetail } from '@meal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChefHat,
  Heart,
  Minus,
  Pencil,
  Pin,
  Plus,
  ShoppingBasket,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CookMode } from '../components/CookMode';
import { RecipeVisual } from '../components/RecipeVisual';
import { StarRating } from '../components/StarRating';
import { Timer } from '../components/Timer';
import { useToast } from '../components/Toaster';
import { Button, EmptyState, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { formatDay, timeAgo, toISODate } from '../lib/dates';
import { useCooked, useInvalidateRecipes, useSetRecipeState } from '../lib/hooks';
import { COST, DIFFICULTY, capitalize, categoryById, dietById, moodById, seasonById } from '../lib/labels';

export function RecipePage() {
  const id = Number(useParams().id);
  const query = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.recipe(id),
    enabled: Number.isFinite(id),
  });
  if (query.isPending) return <Spinner />;
  if (query.isError || !query.data)
    return (
      <EmptyState emoji="🔍" title="Recette introuvable">
        <Link to="/" className="font-bold text-tomato underline">
          Retour aux recettes
        </Link>
      </EmptyState>
    );
  return <RecipeView key={query.data.id} recipe={query.data} />;
}

function RecipeView({ recipe }: { recipe: RecipeDetail }) {
  const [servings, setServings] = useState(recipe.servings);
  const [cooking, setCooking] = useState(false);
  const [notes, setNotes] = useState(recipe.state?.notes ?? '');
  const setState = useSetRecipeState();
  const cooked = useCooked();
  const navigate = useNavigate();
  const toast = useToast();
  const invalidate = useInvalidateRecipes();
  const qc = useQueryClient();
  const state = recipe.state;
  const done = state?.status === 'done' || (state?.timesCooked ?? 0) > 0;

  useEffect(() => {
    document.title = `${recipe.title} · Meal Maker`;
    return () => {
      document.title = 'Meal Maker';
    };
  }, [recipe.title]);

  const remove = useMutation({
    mutationFn: () => api.deleteRecipe(recipe.id),
    onSuccess: async (res) => {
      await invalidate();
      toast({
        emoji: res.restoredId ? '↩️' : '🗑️',
        message: res.restoredId ? 'Recette d’origine restaurée' : 'Recette supprimée',
      });
      navigate(res.restoredId ? `/recette/${res.restoredId}` : '/', { replace: true });
    },
  });

  const addMissing = useMutation({
    mutationFn: async () => {
      const missing = recipe.ingredients.filter((i) => !i.inFridge && !i.isStaple && !i.optional);
      for (const ing of missing) {
        const q = scaleQuantity(ing.quantity, recipe.servings, servings);
        await api.addShopping(ing.name, q ? `${formatQuantity(q)} ${ing.unit ?? ''}`.trim() : undefined);
      }
      return missing.length;
    },
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: ['shopping'] });
      toast({
        emoji: '🛒',
        message: `${n} ingrédient${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} aux courses`,
        action: { label: 'Voir', onClick: () => navigate('/courses') },
      });
    },
  });

  const total = recipe.prepMinutes + recipe.cookMinutes;
  const category = categoryById.get(recipe.category);
  const inFridge = recipe.ingredients.filter((i) => i.inFridge).length;

  return (
    <article className={`tint-${recipe.color}`}>
      <button
        onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
        className="mb-4 inline-flex items-center gap-1.5 font-bold text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Retour
      </button>

      {recipe.original && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-grape/10 px-4 py-3 text-sm font-semibold">
          <span>✏️ C'est ta version de « {recipe.original.title} ».</span>
          <Button
            variant="soft"
            onClick={() =>
              window.confirm('Supprimer ta version et revenir à la recette d’origine ?') && remove.mutate()
            }
          >
            <Undo2 size={16} /> Revenir à l'originale
          </Button>
        </div>
      )}
      {recipe.versionId && (
        <div className="mb-4 rounded-2xl bg-grape/10 px-4 py-3 text-sm font-semibold">
          ✏️ Tu as modifié cette recette.{' '}
          <Link className="text-grape underline" to={`/recette/${recipe.versionId}`}>
            Voir ma version
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <RecipeVisual
          emoji={recipe.emoji}
          color={recipe.color}
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          className="h-64 rounded-blob md:h-80"
          emojiClass="text-[7rem]"
        />
        <div className="flex flex-col">
          <p className="text-sm font-extrabold tracking-wide text-muted uppercase">
            {category?.emoji} {category?.label} · {capitalize(recipe.cuisine)}
            {recipe.lang === 'en' && ' · recette en anglais'}
          </p>
          <h1 className="mt-1 text-3xl leading-tight font-semibold md:text-5xl">{recipe.title}</h1>
          {recipe.description && <p className="mt-3 text-lg text-muted">{recipe.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <Pill>⏱️ {formatDuration(total)}</Pill>
            {recipe.prepMinutes > 0 && <Pill>🔪 {formatDuration(recipe.prepMinutes)} de prépa</Pill>}
            {recipe.cookMinutes > 0 && <Pill>🔥 {formatDuration(recipe.cookMinutes)} de cuisson</Pill>}
            <Pill>📶 {DIFFICULTY[recipe.difficulty]}</Pill>
            <Pill>💰 {COST[recipe.cost]}</Pill>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.moods.map((m) => {
              const mood = moodById.get(m);
              return mood ? (
                <span
                  key={m}
                  className={`tint-${mood.color} soft-bg rounded-full px-2.5 py-1 text-xs font-bold`}
                >
                  {mood.emoji} {mood.label}
                </span>
              ) : null;
            })}
            {recipe.diets.map((d) => (
              <span key={d} className="rounded-full bg-mint/12 px-2.5 py-1 text-xs font-bold text-mint">
                {dietById.get(d)?.emoji} {dietById.get(d)?.label}
              </span>
            ))}
            {recipe.seasons.map((s) => (
              <span key={s} className="rounded-full bg-lime/15 px-2.5 py-1 text-xs font-bold">
                {seasonById.get(s)?.emoji} {seasonById.get(s)?.label}
              </span>
            ))}
          </div>

          {/* Suivi : fait / à tester / pas pour moi, note, favori */}
          <div className="mt-5 rounded-3xl border-2 border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusButton
                active={done}
                onClick={() => setState.mutate({ id: recipe.id, input: { status: done ? null : 'done' } })}
                className="bg-mint"
              >
                <Check size={16} strokeWidth={3} /> Je l'ai fait
              </StatusButton>
              <StatusButton
                active={state?.status === 'to_try'}
                onClick={() =>
                  setState.mutate({
                    id: recipe.id,
                    input: { status: state?.status === 'to_try' ? null : 'to_try' },
                  })
                }
                className="bg-sky"
              >
                <Pin size={16} /> À tester
              </StatusButton>
              <StatusButton
                active={state?.status === 'not_for_me'}
                onClick={() =>
                  setState.mutate({
                    id: recipe.id,
                    input: { status: state?.status === 'not_for_me' ? null : 'not_for_me' },
                  })
                }
                className="bg-muted"
              >
                🙅 Pas pour moi
              </StatusButton>
              <button
                onClick={() => setState.mutate({ id: recipe.id, input: { favorite: !state?.favorite } })}
                aria-pressed={!!state?.favorite}
                aria-label={state?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={clsx(
                  'ml-auto rounded-full p-2.5 transition',
                  state?.favorite ? 'bg-berry text-white' : 'bg-surface-2 text-muted hover:text-berry',
                )}
              >
                <Heart size={18} className={state?.favorite ? 'fill-current' : ''} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-muted">Ma note</span>
              <StarRating
                value={state?.rating ?? null}
                onChange={(v) => setState.mutate({ id: recipe.id, input: { rating: v } })}
                size="lg"
              />
              {(state?.timesCooked ?? 0) > 0 && (
                <span className="text-sm text-muted">
                  Cuisiné {state!.timesCooked} fois · dernière fois {timeAgo(state!.lastCookedAt!)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setCooking(true)}>
              <ChefHat size={18} /> Mode cuisine
            </Button>
            <AddToPlan recipeId={recipe.id} servings={servings} />
            <Button variant="soft" onClick={() => navigate(`/recette/${recipe.id}/modifier`)}>
              <Pencil size={16} /> Modifier
            </Button>
            {recipe.source === 'perso' && !recipe.original && (
              <Button
                variant="danger"
                onClick={() => window.confirm('Supprimer définitivement cette recette ?') && remove.mutate()}
              >
                <Trash2 size={16} /> Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="ingredients-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="ingredients-title" className="text-2xl font-semibold">
              Ingrédients
            </h2>
            <div
              className="flex items-center gap-1 rounded-full bg-surface-2 p-1"
              role="group"
              aria-label="Nombre de personnes"
            >
              <button
                className="rounded-full p-1.5 hover:bg-surface disabled:opacity-40"
                disabled={servings <= 1}
                onClick={() => setServings((s) => s - 1)}
                aria-label="Une personne de moins"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-20 text-center text-sm font-extrabold" aria-live="polite">
                {servings} pers.
              </span>
              <button
                className="rounded-full p-1.5 hover:bg-surface"
                onClick={() => setServings((s) => s + 1)}
                aria-label="Une personne de plus"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {inFridge > 0 && (
            <p className="mb-2 text-sm font-semibold text-mint">
              🧊 {inFridge} ingrédient{inFridge > 1 ? 's' : ''} déjà dans ton frigo
            </p>
          )}
          <ul className="divide-y divide-line rounded-3xl border-2 border-line bg-surface">
            {recipe.ingredients.map((ing) => {
              const q = scaleQuantity(ing.quantity, recipe.servings, servings);
              return (
                <li key={ing.id} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span aria-hidden className="w-4 shrink-0 text-xs">
                    {ing.inFridge ? '✅' : ing.isStaple ? '🧂' : ''}
                  </span>
                  <span className="min-w-20 shrink-0 font-extrabold">
                    {formatQuantity(q)} {ing.unit ?? ''}
                  </span>
                  <span className={clsx(ing.optional && 'text-muted')}>
                    {ing.name}
                    {ing.note && <span className="text-muted"> · {ing.note}</span>}
                    {ing.optional && <span className="text-muted"> (facultatif)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button
            variant="soft"
            className="mt-3 w-full"
            onClick={() => addMissing.mutate()}
            disabled={addMissing.isPending}
          >
            <ShoppingBasket size={16} /> Ajouter ce qui manque aux courses
          </Button>
          <p className="mt-2 text-xs text-muted">✅ dans ton frigo · 🧂 basique du placard</p>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="mb-3 text-2xl font-semibold">
            Préparation
          </h2>
          <ol className="space-y-4">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="blob-bg grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-semibold text-white">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="leading-relaxed">{s}</p>
                  {detectTimers(s).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detectTimers(s).map((t, j) => (
                        <Timer key={j} label={t.label} seconds={t.seconds} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {recipe.tips && (
            <div className="mt-6 rounded-3xl bg-mango/15 p-4">
              <p className="font-bold">💡 Astuce</p>
              <p className="mt-1">{recipe.tips}</p>
            </div>
          )}
          <div className="mt-6">
            <label htmlFor="notes" className="mb-1.5 block font-bold">
              📝 Mes notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() =>
                notes !== (state?.notes ?? '') &&
                setState.mutate({ id: recipe.id, input: { notes: notes || null } })
              }
              placeholder="Un peu moins de sel la prochaine fois, doubler la sauce…"
              rows={3}
              className="w-full rounded-2xl border-2 border-line bg-surface p-3 outline-none focus:border-tomato"
            />
          </div>
          {recipe.cookLog.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              📅 Cuisiné le{' '}
              {recipe.cookLog
                .slice(0, 5)
                .map((d) => new Date(d).toLocaleDateString('fr-FR'))
                .join(', ')}
            </p>
          )}
        </section>
      </div>

      {cooking && (
        <CookMode
          recipe={recipe}
          servings={servings}
          onClose={() => setCooking(false)}
          onFinish={() => {
            setCooking(false);
            cooked.mutate(recipe.id);
          }}
        />
      )}
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-surface-2 px-3 py-1.5">{children}</span>;
}

function StatusButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      aria-pressed={active}
      {...props}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-extrabold transition',
        active ? `${className} text-white shadow-sm` : 'bg-surface-2 text-ink hover:brightness-95',
      )}
    />
  );
}

function AddToPlan({ recipeId, servings }: { recipeId: number; servings: number }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toISODate(new Date()));
  const [slot, setSlot] = useState<'midi' | 'soir'>(new Date().getHours() < 14 ? 'midi' : 'soir');
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const add = useMutation({
    mutationFn: () => api.addPlan({ date, slot, recipeId, servings }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['plan'] });
      const [y, m, d] = date.split('-').map(Number);
      toast({
        emoji: '📅',
        message: `Prévu ${formatDay(new Date(y, m - 1, d))} (${slot})`,
        action: { label: 'Planning', onClick: () => navigate('/planning') },
      });
    },
  });
  if (!open)
    return (
      <Button variant="soft" onClick={() => setOpen(true)}>
        <CalendarPlus size={16} /> Planifier
      </Button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-full bg-surface-2 p-1 pl-3"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate();
      }}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        aria-label="Date"
        className="bg-transparent text-sm font-bold"
      />
      <select
        value={slot}
        onChange={(e) => setSlot(e.target.value as 'midi' | 'soir')}
        aria-label="Repas"
        className="bg-transparent text-sm font-bold"
      >
        <option value="midi">Midi</option>
        <option value="soir">Soir</option>
      </select>
      <Button type="submit" className="py-1.5" disabled={add.isPending}>
        OK
      </Button>
      <button type="button" className="px-2 text-sm text-muted" onClick={() => setOpen(false)}>
        Annuler
      </button>
    </form>
  );
}
