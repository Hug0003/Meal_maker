import type { PlanEntryDto, RecipeCard } from '@meal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Dices, Plus, ShoppingBasket, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '../components/Toaster';
import { Button, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { addDays, formatShortDay, startOfWeek, toISODate } from '../lib/dates';
import { useMood } from '../lib/prefs';

const SLOTS = [
  { id: 'midi', label: 'Midi', emoji: '☀️' },
  { id: 'soir', label: 'Soir', emoji: '🌙' },
] as const;

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [picker, setPicker] = useState<{ date: string; slot: 'midi' | 'soir' } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 6));
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const plan = useQuery({ queryKey: ['plan', from], queryFn: () => api.plan(from, to) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['plan'] });

  const add = useMutation({
    mutationFn: (input: { date: string; slot: 'midi' | 'soir'; recipeId: number }) => api.addPlan(input),
    onSuccess: () => {
      setPicker(null);
      return refresh();
    },
  });
  const remove = useMutation({ mutationFn: (id: number) => api.removePlan(id), onSuccess: refresh });
  const moveEntry = useMutation({
    mutationFn: ({ id, date, slot }: { id: number; date: string; slot: 'midi' | 'soir' }) =>
      api.updatePlan(id, { date, slot }),
    onSuccess: refresh,
  });
  const servings = useMutation({
    mutationFn: ({ id, n }: { id: number; n: number }) => api.updatePlan(id, { servings: n }),
    onSuccess: refresh,
  });
  const shopping = useMutation({
    mutationFn: () => api.generateShopping(from, to),
    onSuccess: (items) => {
      qc.setQueryData(['shopping'], items);
      toast({
        emoji: '🛒',
        message: `Liste de courses prête (${items.filter((i) => i.fromPlan).length} articles)`,
      });
      navigate('/courses');
    },
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const entries = plan.data ?? [];
  const at = (date: string, slot: string) => entries.filter((e) => e.date === date && e.slot === slot);
  const isThisWeek = from === toISODate(startOfWeek());

  return (
    <div>
      <PageHeader
        emoji="📅"
        title="Planning de la semaine"
        subtitle="Prévois tes repas, glisse-les d'un jour à l'autre et génère ta liste de courses en un clic."
      >
        <Button onClick={() => shopping.mutate()} disabled={!entries.length || shopping.isPending}>
          <ShoppingBasket size={18} /> Générer les courses
        </Button>
      </PageHeader>

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="soft"
          aria-label="Semaine précédente"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <ChevronLeft size={18} />
        </Button>
        <p className="min-w-56 text-center font-bold">
          {isThisWeek ? 'Cette semaine' : `Semaine du ${formatShortDay(weekStart)}`}
          <span className="block text-xs font-semibold text-muted">
            {weekStart.toLocaleDateString('fr-FR')} → {addDays(weekStart, 6).toLocaleDateString('fr-FR')}
          </span>
        </p>
        <Button
          variant="soft"
          aria-label="Semaine suivante"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <ChevronRight size={18} />
        </Button>
        {!isThisWeek && (
          <Button variant="ghost" onClick={() => setWeekStart(startOfWeek())}>
            Aujourd'hui
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((d) => {
          const iso = toISODate(d);
          const today = iso === toISODate(new Date());
          return (
            <section
              key={iso}
              aria-label={formatShortDay(d)}
              className={clsx(
                'rounded-3xl bg-surface p-3 ring-1',
                today ? 'ring-2 ring-tomato' : 'ring-line',
              )}
            >
              <h2 className={clsx('mb-2 text-lg font-semibold capitalize', today && 'text-tomato')}>
                {formatShortDay(d)}
              </h2>
              {SLOTS.map((slot) => (
                <div
                  key={slot.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragging !== null) moveEntry.mutate({ id: dragging, date: iso, slot: slot.id });
                    setDragging(null);
                  }}
                  className={clsx(
                    'mb-2 min-h-16 rounded-2xl border-2 border-dashed p-1.5 transition',
                    dragging !== null ? 'border-tomato/40 bg-tomato/5' : 'border-transparent',
                  )}
                >
                  <p className="mb-1 px-1 text-xs font-extrabold text-muted uppercase">
                    {slot.emoji} {slot.label}
                  </p>
                  {at(iso, slot.id).map((e) => (
                    <PlanItem
                      key={e.id}
                      entry={e}
                      onDragStart={() => setDragging(e.id)}
                      onDragEnd={() => setDragging(null)}
                      onRemove={() => remove.mutate(e.id)}
                      onServings={(n) => servings.mutate({ id: e.id, n })}
                    />
                  ))}
                  <button
                    onClick={() => setPicker({ date: iso, slot: slot.id })}
                    className="flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-sm font-bold text-muted hover:bg-surface-2 hover:text-ink"
                    aria-label={`Ajouter un plat ${formatShortDay(d)} ${slot.label}`}
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {picker && (
        <RecipePicker
          onClose={() => setPicker(null)}
          onPick={(r) => add.mutate({ ...picker, recipeId: r.id })}
        />
      )}
    </div>
  );
}

function PlanItem({
  entry,
  onDragStart,
  onDragEnd,
  onRemove,
  onServings,
}: {
  entry: PlanEntryDto;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onServings: (n: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`tint-${entry.recipe.color} soft-bg mb-1.5 cursor-grab rounded-xl p-2 active:cursor-grabbing`}
    >
      <div className="flex items-start gap-1.5">
        <span aria-hidden>{entry.recipe.emoji}</span>
        <Link
          to={`/recette/${entry.recipe.id}`}
          className="line-clamp-2 flex-1 text-sm leading-tight font-bold hover:underline"
        >
          {entry.recipe.title}
        </Link>
        <button
          onClick={onRemove}
          aria-label={`Retirer ${entry.recipe.title}`}
          className="rounded-full p-0.5 text-muted hover:text-tomato"
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
        <button
          aria-label="Une personne de moins"
          disabled={entry.servings <= 1}
          onClick={() => onServings(entry.servings - 1)}
          className="rounded px-1 hover:bg-black/5"
        >
          −
        </button>
        {entry.servings} pers.
        <button
          aria-label="Une personne de plus"
          onClick={() => onServings(entry.servings + 1)}
          className="rounded px-1 hover:bg-black/5"
        >
          +
        </button>
      </div>
    </div>
  );
}

function RecipePicker({ onClose, onPick }: { onClose: () => void; onPick: (r: RecipeCard) => void }) {
  const [q, setQ] = useState('');
  const [moods] = useMood();
  const results = useQuery({
    queryKey: ['recipes', 'picker', q],
    queryFn: () =>
      api.recipes({
        q: q || undefined,
        category: q ? undefined : ['plat', 'soupe'],
        mood: moods,
        pageSize: 12,
      }),
    placeholderData: (p) => p,
  });
  const random = useMutation({
    mutationFn: () => api.random({ category: ['plat'], mood: moods }),
    onSuccess: onPick,
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choisir un plat"
        className="max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-[2rem] bg-surface shadow-2xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line p-4">
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="Chercher un plat…"
            aria-label="Chercher un plat"
            className="flex-1 rounded-full border-2 border-line bg-bg px-4 py-2 font-semibold outline-none focus:border-tomato"
          />
          <Button
            variant="soft"
            onClick={() => random.mutate()}
            title="Au hasard"
            aria-label="Choisir au hasard"
          >
            <Dices size={18} />
          </Button>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-muted hover:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="max-h-[60dvh] overflow-y-auto p-2">
          {results.data?.items.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onPick(r)}
                className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2"
              >
                <span
                  className={`tint-${r.color} blob-bg grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl`}
                >
                  {r.emoji}
                </span>
                <span>
                  <span className="block font-bold">{r.title}</span>
                  <span className="text-sm text-muted">
                    {r.prepMinutes + r.cookMinutes} min · {r.cuisine}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {results.data && !results.data.items.length && (
            <li className="p-6 text-center text-muted">Aucun résultat</li>
          )}
        </ul>
      </div>
    </div>
  );
}
