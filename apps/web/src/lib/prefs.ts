import type { MoodId } from '@meal/shared';
import { usePersistentState } from './storage';

const today = () => new Date().toISOString().slice(0, 10);

/** Le mood du jour est mémorisé… pour la journée seulement. */
export function useMood(): [MoodId[], (m: MoodId[]) => void] {
  const [stored, setStored] = usePersistentState<{ day: string; moods: MoodId[] } | null>('mm:mood', null);
  const moods = stored && stored.day === today() ? stored.moods : [];
  return [moods, (m) => setStored(m.length ? { day: today(), moods: m } : null)];
}

/** Mode « avec mon frigo » activé sur le catalogue et le tirage aléatoire. */
export function useFridgeMode() {
  return usePersistentState<boolean>('mm:fridge-mode', false);
}

export type Theme = 'system' | 'light' | 'dark';

export function useTheme() {
  return usePersistentState<Theme>('mm:theme', 'system');
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17131F' : '#FF6150');
}
