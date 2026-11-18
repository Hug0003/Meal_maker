import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Chip({
  active,
  children,
  className,
  tint,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition',
        tint && `tint-${tint}`,
        active
          ? 'border-transparent bg-(--c,var(--color-ink)) text-white shadow-sm'
          : 'border-line bg-surface text-ink hover:border-(--c,var(--color-muted))',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger';

export function buttonClasses(variant: Variant = 'primary', className?: string) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition active:scale-[0.97] disabled:opacity-50',
    variant === 'primary' && 'bg-tomato text-white shadow-[0_4px_0_0_rgb(0_0_0/0.12)] hover:brightness-105',
    variant === 'soft' && 'bg-surface-2 text-ink hover:brightness-95',
    variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-ink',
    variant === 'danger' && 'bg-berry/10 text-berry hover:bg-berry/20',
    className,
  );
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function PageHeader({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold md:text-4xl">
          <span aria-hidden className="text-4xl md:text-5xl">
            {emoji}
          </span>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-blob border-2 border-dashed border-line px-6 py-12 text-center">
      <div aria-hidden className="mb-3 text-5xl">
        {emoji}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-muted">{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-muted">
      <span aria-hidden className="inline-block animate-bounce text-2xl">
        🍳
      </span>
      {label}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-blob bg-surface-2" />
      ))}
    </div>
  );
}
