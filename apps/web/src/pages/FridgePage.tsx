import { AISLES, type FridgeItemDto } from '@meal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarClock, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { IngredientInput } from '../components/IngredientInput';
import { CardGrid } from '../components/RecipeGrid';
import { useToast } from '../components/Toaster';
import { Button, EmptyState, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { daysUntil, relativeDays } from '../lib/dates';
import { useFridge, useInvalidateRecipes } from '../lib/hooks';
import { useFridgeMode } from '../lib/prefs';

const QUICK = [
  'œuf',
  'lait',
  'tomate',
  'oignon',
  'carotte',
  'pomme de terre',
  'courgette',
  'blanc de poulet',
  'lardons',
  'crème fraîche',
  'emmental',
  'riz',
  'spaghetti',
  'citron',
  'yaourt nature',
  'épinards frais',
  'champignons de Paris',
  'poivron',
  'feta',
  'avocat',
];

export function FridgePage() {
  const fridge = useFridge();
  const qc = useQueryClient();
  const invalidate = useInvalidateRecipes();
  const toast = useToast();
  const navigate = useNavigate();
  const [, setFridgeMode] = useFridgeMode();
  const [expiresAt, setExpiresAt] = useState('');

  const onFridge = async (items: FridgeItemDto[]) => {
    qc.setQueryData(['fridge'], items);
    await invalidate();
  };
  const add = useMutation({
    mutationFn: (name: string) => api.addFridge(name, expiresAt || null),
    onSuccess: (items, name) => {
      setExpiresAt('');
      toast({ emoji: '🧊', message: `${name} ajouté au frigo` });
      return onFridge(items);
    },
  });
  const remove = useMutation({ mutationFn: (id: number) => api.removeFridge(id), onSuccess: onFridge });
  const clear = useMutation({ mutationFn: api.clearFridge, onSuccess: onFridge });
  const setExpiry = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string | null }) => api.updateFridge(id, date),
    onSuccess: onFridge,
  });

  const items = fridge.data ?? [];
  const names = new Set(items.map((i) => i.name.toLowerCase()));
  const matches = useQuery({
    queryKey: ['recipes', 'fridge-preview', items.map((i) => i.ingredientId)],
    queryFn: () => api.recipes({ fridge: true, maxMissing: 1, pageSize: 4 }),
    enabled: items.length > 0,
  });
  const expiring = items.filter((i) => i.expiresAt && daysUntil(i.expiresAt) <= 2);

  return (
    <div>
      <PageHeader
        emoji="🧊"
        title="Mon frigo"
        subtitle="Dis-moi ce que tu as, je te dis ce que tu peux cuisiner. Le sel, le poivre, l'huile, le beurre, la farine et les épices sont considérés comme toujours là."
      >
        {items.length > 0 && (
          <Button
            onClick={() => {
              setFridgeMode(true);
              navigate('/');
            }}
          >
            Voir ce que je peux cuisiner 🍳
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Ajouter un ingrédient au frigo"
          >
            <IngredientInput
              className="flex-1"
              onPick={(n) => add.mutate(n)}
              placeholder="Ex. : courgette, poulet, feta…"
              autoFocus
              label="Ingrédient à ajouter"
            />
            <label className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-3 text-sm font-semibold text-muted">
              <CalendarClock size={16} />
              <span className="sr-only">Date de péremption (facultatif)</span>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="bg-transparent py-2 text-ink"
                title="Périme le (facultatif)"
              />
            </label>
          </form>

          <div className="mt-4">
            <p className="mb-2 text-xs font-extrabold tracking-wide text-muted uppercase">Ajout rapide</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.filter((q) => !names.has(q)).map((q) => (
                <button
                  key={q}
                  onClick={() => add.mutate(q)}
                  className="rounded-full border-2 border-dashed border-line px-3 py-1 text-sm font-bold text-muted hover:border-mint hover:text-mint"
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>

          {expiring.length > 0 && (
            <div className="mt-6 rounded-3xl bg-tomato/10 p-4 text-sm font-semibold">
              ⏰ À utiliser vite : {expiring.map((i) => i.name).join(', ')}. Les recettes qui les utilisent
              passent en premier.
            </div>
          )}

          <div className="mt-6 space-y-5">
            {items.length === 0 ? (
              <EmptyState emoji="🥶" title="Ton frigo est vide">
                Ajoute quelques ingrédients pour découvrir ce que tu peux préparer.
              </EmptyState>
            ) : (
              AISLES.map((aisle) => {
                const list = items.filter((i) => i.aisle === aisle.id);
                if (!list.length) return null;
                return (
                  <div key={aisle.id}>
                    <h2 className="mb-2 text-lg font-semibold">
                      {aisle.emoji} {aisle.label}
                    </h2>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((item) => {
                        const d = item.expiresAt ? daysUntil(item.expiresAt) : null;
                        return (
                          <li
                            key={item.ingredientId}
                            className={clsx(
                              'group flex items-center gap-1 rounded-full py-1 pr-1 pl-3.5 font-bold',
                              d !== null && d <= 0
                                ? 'bg-tomato/15'
                                : d !== null && d <= 2
                                  ? 'bg-mango/20'
                                  : 'bg-mint/12',
                            )}
                          >
                            {item.name}
                            {item.expiresAt && (
                              <span className="text-xs font-semibold text-muted">
                                · {d! < 0 ? 'périmé' : relativeDays(item.expiresAt)}
                              </span>
                            )}
                            <label
                              className="relative ml-1 cursor-pointer rounded-full p-1 text-muted hover:bg-black/5"
                              title="Date de péremption"
                            >
                              <CalendarClock size={14} />
                              <input
                                type="date"
                                aria-label={`Date de péremption de ${item.name}`}
                                value={item.expiresAt ?? ''}
                                onChange={(e) =>
                                  setExpiry.mutate({ id: item.ingredientId, date: e.target.value || null })
                                }
                                className="absolute inset-0 cursor-pointer opacity-0"
                              />
                            </label>
                            <button
                              onClick={() => remove.mutate(item.ingredientId)}
                              aria-label={`Retirer ${item.name}`}
                              className="rounded-full p-1 text-muted hover:bg-black/5 hover:text-tomato"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              className="mt-6"
              onClick={() => window.confirm('Vider tout le frigo ?') && clear.mutate()}
            >
              <Trash2 size={16} /> Vider le frigo
            </Button>
          )}
        </section>

        <section aria-labelledby="preview-title">
          <h2 id="preview-title" className="mb-3 text-2xl font-semibold">
            Faisable maintenant (ou presque)
          </h2>
          {items.length === 0 ? (
            <p className="text-muted">
              Les idées apparaîtront ici dès que ton frigo aura quelques ingrédients.
            </p>
          ) : matches.data?.items.length ? (
            <div className="[&_.grid]:grid-cols-1 sm:[&_.grid]:grid-cols-2">
              <CardGrid recipes={matches.data.items} />
            </div>
          ) : (
            <p className="text-muted">Pas encore d'idée avec ça… ajoute un ou deux ingrédients de base !</p>
          )}
        </section>
      </div>
    </div>
  );
}
