import { MOODS, type MoodId } from '@meal/shared';
import { useMood } from '../lib/prefs';
import { Chip } from './ui';

/** Pastilles « mood du jour » : combinables, mémorisées pour la journée. */
export function MoodBar() {
  const [moods, setMoods] = useMood();
  const toggle = (id: MoodId) =>
    setMoods(moods.includes(id) ? moods.filter((m) => m !== id) : [...moods, id]);
  return (
    <div
      role="group"
      aria-label="Mood du jour"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {MOODS.map((m) => (
        <Chip key={m.id} tint={m.color} active={moods.includes(m.id)} onClick={() => toggle(m.id)}>
          <span aria-hidden>{m.emoji}</span> {m.label}
        </Chip>
      ))}
      {moods.length > 0 && (
        <button
          className="shrink-0 px-2 text-sm font-bold text-muted underline-offset-2 hover:underline"
          onClick={() => setMoods([])}
        >
          Effacer
        </button>
      )}
    </div>
  );
}
