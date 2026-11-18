import { AISLES, type ShoppingItemDto } from '@meal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CalendarDays, Check, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { IngredientInput } from '../components/IngredientInput';
import { Button, EmptyState, PageHeader, Spinner, buttonClasses } from '../components/ui';
import { api } from '../lib/api';
import { addDays, startOfWeek, toISODate } from '../lib/dates';

export function ShoppingPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['shopping'], queryFn: api.shopping });
  const [qty, setQty] = useState('');
  const onList = (items: ShoppingItemDto[]) => qc.setQueryData(['shopping'], items);

  const add = useMutation({
    mutationFn: (label: string) => api.addShopping(label, qty || undefined),
    onSuccess: (i) => (setQty(''), onList(i)),
  });
  const check = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) => api.checkShopping(id, checked),
    onMutate: ({ id, checked }) => {
      qc.setQueryData<ShoppingItemDto[]>(['shopping'], (old) =>
        old?.map((x) => (x.id === id ? { ...x, checked } : x)),
      );
    },
    onSuccess: onList,
  });
  const remove = useMutation({ mutationFn: (id: number) => api.removeShopping(id), onSuccess: onList });
  const clear = useMutation({
    mutationFn: (onlyChecked: boolean) => api.clearShopping(onlyChecked),
    onSuccess: onList,
  });
  const week = startOfWeek();
  const regenerate = useMutation({
    mutationFn: () => api.generateShopping(toISODate(week), toISODate(addDays(week, 6))),
    onSuccess: onList,
  });

  if (list.isPending) return <Spinner />;
  const items = list.data ?? [];
  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        emoji="🛒"
        title="Liste de courses"
        subtitle={
          items.length
            ? `${remaining} article${remaining > 1 ? 's' : ''} à acheter. Ce qui est déjà dans ton frigo et les basiques ne sont pas ajoutés.`
            : undefined
        }
      >
        <Button variant="soft" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
          <CalendarDays size={16} /> Depuis le planning
        </Button>
      </PageHeader>

      <form onSubmit={(e) => e.preventDefault()} className="mb-6 flex gap-2" aria-label="Ajouter un article">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qté"
          aria-label="Quantité"
          className="w-24 rounded-2xl border-2 border-line bg-surface px-3 font-semibold outline-none focus:border-tomato"
        />
        <IngredientInput
          className="flex-1"
          onPick={(n) => add.mutate(n)}
          placeholder="Ajouter un article (Entrée pour valider)"
          label="Article à ajouter"
        />
      </form>

      {items.length === 0 ? (
        <EmptyState emoji="🧺" title="Ta liste est vide">
          Ajoute des articles à la main, depuis une recette (« Ajouter ce qui manque aux courses »), ou
          génère-la depuis ton{' '}
          <Link to="/planning" className="font-bold text-tomato underline">
            planning
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {AISLES.map((aisle) => {
            const group = items.filter((i) => i.aisle === aisle.id);
            if (!group.length) return null;
            return (
              <section key={aisle.id} aria-label={aisle.label}>
                <h2 className="mb-2 text-lg font-semibold">
                  {aisle.emoji} {aisle.label}
                </h2>
                <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
                  {group.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        role="checkbox"
                        aria-checked={item.checked}
                        aria-label={item.label}
                        onClick={() => check.mutate({ id: item.id, checked: !item.checked })}
                        className={clsx(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition',
                          item.checked ? 'border-mint bg-mint text-white' : 'border-line hover:border-mint',
                        )}
                      >
                        {item.checked && <Check size={14} strokeWidth={3} />}
                      </button>
                      <span
                        className={clsx('flex-1 font-semibold', item.checked && 'text-muted line-through')}
                      >
                        {item.label}
                        {item.quantity && (
                          <span className="ml-2 text-sm font-bold text-muted">{item.quantity}</span>
                        )}
                      </span>
                      <button
                        onClick={() => remove.mutate(item.id)}
                        aria-label={`Supprimer ${item.label}`}
                        className="rounded-full p-1 text-muted hover:text-tomato"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="soft" onClick={() => clear.mutate(true)} disabled={remaining === items.length}>
              <Check size={16} /> Retirer les articles cochés
            </Button>
            <button
              className={buttonClasses('ghost')}
              onClick={() => window.confirm('Vider toute la liste ?') && clear.mutate(false)}
            >
              <Trash2 size={16} /> Tout vider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
