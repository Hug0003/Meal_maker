import { CATEGORIES, formatDuration, type CategoryId, type RecipeCard } from '@meal/shared';
import { useMutation } from '@tanstack/react-query';
import { Dices, Refrigerator, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { moodById } from '../lib/labels';
import { useFridgeMode, useMood } from '../lib/prefs';
import { RecipeVisual } from './RecipeVisual';
import { Button, Chip } from './ui';

const PICKABLE: CategoryId[] = ['plat', 'soupe', 'entree', 'dessert', 'petit-dej'];

/** Tirage au sort d'un plat, en respectant le mood du jour et (si activé) le frigo. */
export function SurpriseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [moods] = useMood();
  const [fridgeMode, setFridgeMode] = useFridgeMode();
  const [category, setCategory] = useState<CategoryId>('plat');
  const [previous, setPrevious] = useState<number | undefined>();
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);

  const draw = useMutation({
    mutationFn: () =>
      api.random({ mood: moods, fridge: fridgeMode, maxMissing: 3, category: [category], exclude: previous }),
    onSuccess: (r: RecipeCard) => setPrevious(r.id),
  });

  useEffect(() => {
    if (!open) return;
    draw.reset();
    draw.mutate();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, fridgeMode]);

  const recipe = draw.data;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="surprise-title"
            className="w-full max-w-md rounded-t-[2rem] bg-surface p-5 shadow-2xl sm:rounded-[2rem]"
            initial={{ y: 40, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="surprise-title" className="flex items-center gap-2 text-2xl font-semibold">
                🎲 Surprends-moi
              </h2>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full p-2 text-muted hover:bg-surface-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
              {PICKABLE.map((id) => {
                const c = CATEGORIES.find((x) => x.id === id)!;
                return (
                  <Chip key={id} active={category === id} tint="tomato" onClick={() => setCategory(id)}>
                    {c.emoji} {c.label}
                  </Chip>
                );
              })}
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Chip active={fridgeMode} tint="mint" onClick={() => setFridgeMode(!fridgeMode)}>
                <Refrigerator size={15} /> Avec mon frigo
              </Chip>
              {moods.length > 0 && <span>Mood : {moods.map((m) => moodById.get(m)?.emoji).join(' ')}</span>}
            </div>

            <div className="min-h-64" aria-live="polite">
              {draw.isPending && (
                <div className="grid h-64 place-items-center">
                  <motion.span
                    aria-label="Tirage en cours"
                    className="text-6xl"
                    animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    🎲
                  </motion.span>
                </div>
              )}
              {draw.isError && (
                <div className="grid h-64 place-items-center text-center text-muted">
                  <div>
                    <div className="mb-2 text-5xl">🤷</div>
                    Aucun plat ne correspond.
                    <br />
                    {fridgeMode
                      ? 'Essaie sans le filtre frigo ?'
                      : 'Essaie une autre catégorie ou un autre mood ?'}
                  </div>
                </div>
              )}
              {recipe && !draw.isPending && (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, rotate: -2, scale: 0.95 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                >
                  <RecipeVisual
                    emoji={recipe.emoji}
                    color={recipe.color}
                    imageUrl={recipe.imageUrl}
                    title={recipe.title}
                    className="h-40 rounded-3xl"
                    emojiClass="text-7xl"
                  />
                  <h3 className="mt-3 text-2xl font-semibold">{recipe.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {formatDuration(recipe.prepMinutes + recipe.cookMinutes)} · {recipe.cuisine}
                    {recipe.fridge &&
                      recipe.fridge.missing.length > 0 &&
                      ` · il manque ${recipe.fridge.missing.join(', ')}`}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="soft" onClick={() => draw.mutate()} disabled={draw.isPending}>
                <Dices size={18} /> Un autre !
              </Button>
              <Button
                disabled={!recipe || draw.isPending}
                onClick={() => {
                  if (!recipe) return;
                  onClose();
                  navigate(`/recette/${recipe.id}`);
                }}
              >
                C'est parti 🍽️
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
