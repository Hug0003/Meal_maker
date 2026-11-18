import clsx from 'clsx';
import {
  BookHeart,
  CalendarDays,
  ChefHat,
  Compass,
  Dices,
  Monitor,
  Moon,
  PlusCircle,
  Refrigerator,
  ShoppingBasket,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useFridge, useMeta } from '../lib/hooks';
import { applyTheme, useTheme, type Theme } from '../lib/prefs';
import { SurpriseDialog } from './SurpriseDialog';

const NAV = [
  { to: '/', label: 'Recettes', icon: ChefHat, end: true },
  { to: '/frigo', label: 'Mon frigo', icon: Refrigerator },
  { to: '/decouverte', label: 'Découverte', icon: Compass },
  { to: '/mes-plats', label: 'Mes plats', icon: BookHeart },
  { to: '/planning', label: 'Planning', icon: CalendarDays },
  { to: '/courses', label: 'Courses', icon: ShoppingBasket },
];

function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(theme);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const label = { system: 'Thème automatique', light: 'Thème clair', dark: 'Thème sombre' }[theme];
  const Icon = { system: Monitor, light: Sun, dark: Moon }[theme];
  return (
    <button
      onClick={() => setTheme(next[theme])}
      title={label}
      aria-label={`${label} (changer)`}
      className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-2 hover:text-ink"
    >
      <Icon size={18} />
      {!compact && label}
    </button>
  );
}

export function Layout() {
  const [surprise, setSurprise] = useState(false);
  const location = useLocation();
  const fridge = useFridge();
  const meta = useMeta();
  const fridgeCount = fridge.data?.length ?? 0;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh md:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-5 md:flex">
        <NavLink to="/" className="mb-8 flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="h-10 w-10" />
          <span className="font-display text-2xl font-semibold">Meal Maker</span>
        </NavLink>
        <button
          onClick={() => setSurprise(true)}
          className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-mango to-tomato px-4 py-3 font-extrabold text-white shadow-[0_4px_0_0_rgb(0_0_0/0.12)] transition hover:-translate-y-0.5"
        >
          <Dices size={20} /> Surprends-moi
        </button>
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 font-bold transition',
                  isActive ? 'bg-tomato/12 text-tomato' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icon size={20} />
              {label}
              {to === '/frigo' && fridgeCount > 0 && (
                <span className="ml-auto rounded-full bg-mint px-2 text-xs text-white">{fridgeCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/recette/nouvelle"
          className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2.5 font-bold text-muted hover:bg-surface-2 hover:text-ink"
        >
          <PlusCircle size={20} /> Nouvelle recette
        </NavLink>
        <div className="mt-auto space-y-2">
          {meta.data && (
            <p className="px-3 text-xs text-muted">
              {meta.data.total} recettes · {meta.data.stats.done} déjà faites
            </p>
          )}
          <ThemeToggle />
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur md:hidden">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-semibold">Meal Maker</span>
        </NavLink>
        <div className="flex items-center">
          <NavLink to="/planning" aria-label="Planning" className="rounded-full p-2 text-muted">
            <CalendarDays size={20} />
          </NavLink>
          <NavLink to="/courses" aria-label="Courses" className="rounded-full p-2 text-muted">
            <ShoppingBasket size={20} />
          </NavLink>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
        <Outlet context={{ openSurprise: () => setSurprise(true) }} />
      </main>

      {/* Navigation basse (mobile) */}
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-line bg-surface/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        {[NAV[0], NAV[1]].map(({ to, label, icon: Icon, end }) => (
          <MobileLink
            key={to}
            to={to}
            label={label}
            end={end}
            Icon={Icon}
            badge={to === '/frigo' ? fridgeCount : 0}
          />
        ))}
        <button
          onClick={() => setSurprise(true)}
          aria-label="Surprends-moi : plat aléatoire"
          className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-mango to-tomato text-white shadow-lg ring-4 ring-bg"
        >
          <Dices size={26} />
        </button>
        {[NAV[2], NAV[3]].map(({ to, label, icon: Icon }) => (
          <MobileLink key={to} to={to} label={label} Icon={Icon} />
        ))}
      </nav>

      <SurpriseDialog open={surprise} onClose={() => setSurprise(false)} />
    </div>
  );
}

function MobileLink({
  to,
  label,
  Icon,
  end,
  badge = 0,
}: {
  to: string;
  label: string;
  Icon: typeof ChefHat;
  end?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'relative flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold',
          isActive ? 'text-tomato' : 'text-muted',
        )
      }
    >
      <Icon size={22} />
      {label}
      {badge > 0 && (
        <span className="absolute top-0 right-1/4 rounded-full bg-mint px-1.5 text-[10px] text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
