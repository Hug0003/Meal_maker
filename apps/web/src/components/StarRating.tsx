import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useState } from 'react';

/** Note sur 5 : un clic sur l'étoile déjà choisie efface la note. */
export function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const px = size === 'sm' ? 14 : size === 'lg' ? 30 : 20;
  if (!onChange) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        aria-label={value ? `${value} sur 5` : 'Pas encore noté'}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={px} className={n <= shown ? 'fill-mango text-mango' : 'text-line'} />
        ))}
      </span>
    );
  }
  return (
    <div
      role="radiogroup"
      aria-label="Ma note"
      className="inline-flex items-center"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className="rounded-lg p-0.5 transition hover:scale-110"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(value === n ? null : n)}
        >
          <Star
            size={px}
            className={clsx(n <= shown ? 'fill-mango text-mango' : 'text-line', 'transition')}
          />
        </button>
      ))}
    </div>
  );
}
