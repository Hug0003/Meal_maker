import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useId, useState } from 'react';
import { api } from '../lib/api';

/** Champ avec autocomplétion sur les ingrédients connus ; Entrée valide aussi un texte libre. */
export function IngredientInput({
  onPick,
  placeholder = 'Ajouter un ingrédient…',
  value,
  onChange,
  className,
  autoFocus,
  clearOnPick = true,
  label = 'Ingrédient',
}: {
  onPick: (name: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
  autoFocus?: boolean;
  clearOnPick?: boolean;
  label?: string;
}) {
  const [inner, setInner] = useState('');
  const text = value ?? inner;
  const setText = onChange ?? setInner;
  const [debounced, setDebounced] = useState(text);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 150);
    return () => clearTimeout(t);
  }, [text]);

  const suggestions = useQuery({
    queryKey: ['ingredients', debounced],
    queryFn: () => api.ingredients(debounced),
    enabled: open && debounced.length >= 1,
    staleTime: 60_000,
  });
  const items = (suggestions.data ?? []).slice(0, 8);

  const pick = (name: string) => {
    if (!name.trim()) return;
    onPick(name.trim());
    if (clearOnPick) setText('');
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className={clsx('relative', className)}>
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(active >= 0 && items[active] ? items[active].name : text);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-2.5 font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-tomato"
      />
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border-2 border-line bg-surface shadow-xl"
        >
          {items.map((it, i) => (
            <li
              key={it.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(it.name);
              }}
              className={clsx(
                'cursor-pointer px-4 py-2 font-semibold',
                i === active ? 'bg-tomato/10 text-tomato' : 'hover:bg-surface-2',
              )}
            >
              {it.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
