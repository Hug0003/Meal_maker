import type { RecipeDetail } from '@meal/shared';
import { detectTimers, formatQuantity, scaleQuantity } from '@meal/shared';
import { ChevronLeft, ChevronRight, ListChecks, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Timer } from './Timer';
import { Button } from './ui';

/** Mode cuisine : une étape à la fois, en grand, écran maintenu allumé. */
export function CookMode({
  recipe,
  servings,
  onClose,
  onFinish,
}: {
  recipe: RecipeDetail;
  servings: number;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const total = recipe.steps.length;

  // Garde l'écran allumé pendant qu'on cuisine (si le navigateur le permet).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined);
    document.body.style.overflow = 'hidden';
    return () => {
      lock?.release().catch(() => undefined);
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(total - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, total]);

  const timers = detectTimers(recipe.steps[step] ?? '');
  const last = step === total - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Mode cuisine : ${recipe.title}`}
      className={`tint-${recipe.color} fixed inset-0 z-50 flex flex-col bg-bg`}
    >
      <div className="blob-bg h-2" style={{ width: `${((step + 1) / total) * 100}%` }} />
      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">
            Étape {step + 1} / {total}
          </p>
          <h2 className="truncate text-lg font-semibold">
            {recipe.emoji} {recipe.title}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="soft"
            onClick={() => setShowIngredients((v) => !v)}
            aria-expanded={showIngredients}
          >
            <ListChecks size={18} /> <span className="hidden sm:inline">Ingrédients</span>
          </Button>
          <button
            onClick={onClose}
            aria-label="Quitter le mode cuisine"
            className="rounded-full p-2.5 hover:bg-surface-2"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="mx-auto flex max-w-3xl flex-1 flex-col justify-center overflow-y-auto px-6"
          >
            <span className="blob-bg mb-6 grid h-16 w-16 place-items-center rounded-full font-display text-3xl font-semibold text-white">
              {step + 1}
            </span>
            <p className="text-2xl leading-relaxed font-semibold md:text-4xl md:leading-snug">
              {recipe.steps[step]}
            </p>
            {timers.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {timers.map((t, i) => (
                  <Timer key={`${step}-${i}`} label={t.label} seconds={t.seconds} large />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {showIngredients && (
          <aside className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-line bg-surface p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">
              Pour {servings} personne{servings > 1 ? 's' : ''}
            </h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex gap-2">
                  <span className="min-w-16 font-bold">
                    {formatQuantity(scaleQuantity(ing.quantity, recipe.servings, servings))} {ing.unit ?? ''}
                  </span>
                  <span>
                    {ing.name}
                    {ing.note && <span className="text-muted"> ({ing.note})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <footer className="grid grid-cols-2 gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
        <Button
          variant="soft"
          className="py-4 text-base"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft /> Précédente
        </Button>
        {last ? (
          <Button className="py-4 text-base" onClick={onFinish}>
            Terminé ! 🎉
          </Button>
        ) : (
          <Button className="py-4 text-base" onClick={() => setStep((s) => s + 1)}>
            Suivante <ChevronRight />
          </Button>
        )}
      </footer>
    </div>
  );
}
