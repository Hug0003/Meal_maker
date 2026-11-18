import clsx from 'clsx';
import { useState } from 'react';

/** Illustration d'une recette : photo si elle existe, sinon un aplat coloré et un gros emoji. */
export function RecipeVisual({
  emoji,
  color,
  imageUrl,
  title,
  className,
  emojiClass = 'text-6xl',
}: {
  emoji: string;
  color: string;
  imageUrl?: string | null;
  title: string;
  className?: string;
  emojiClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={clsx(
        `tint-${color} blob-bg relative flex items-center justify-center overflow-hidden`,
        className,
      )}
    >
      {imageUrl && !broken ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          aria-hidden
          className={clsx('drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)] select-none', emojiClass)}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}
