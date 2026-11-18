import clsx from 'clsx';
import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* pas de son disponible */
  }
}

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

/** Minuteur détecté dans une étape (« 20 min ») : un clic pour lancer, sonnerie à la fin. */
export function Timer({ label, seconds, large }: { label: string; seconds: number; large?: boolean }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const interval = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    interval.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          beep();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval.current);
  }, [running]);

  const done = left === 0;
  const started = left !== seconds;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-bold',
        large ? 'px-4 py-2 text-lg' : 'px-2.5 py-1 text-sm',
        done ? 'animate-pulse bg-tomato text-white' : running ? 'bg-mango text-ink' : 'bg-mango/20 text-ink',
      )}
    >
      <TimerIcon size={large ? 20 : 14} />
      {started || running ? fmt(left) : label}
      <button
        type="button"
        onClick={() => (done ? setLeft(seconds) : setRunning((r) => !r))}
        aria-label={
          done ? 'Réinitialiser le minuteur' : running ? 'Mettre en pause' : `Lancer un minuteur de ${label}`
        }
        className="ml-1 rounded-full p-0.5 hover:bg-black/10"
      >
        {done ? (
          <RotateCcw size={large ? 18 : 14} />
        ) : running ? (
          <Pause size={large ? 18 : 14} />
        ) : (
          <Play size={large ? 18 : 14} />
        )}
      </button>
      {started && !running && !done && (
        <button
          type="button"
          onClick={() => setLeft(seconds)}
          aria-label="Réinitialiser"
          className="rounded-full p-0.5 hover:bg-black/10"
        >
          <RotateCcw size={large ? 18 : 14} />
        </button>
      )}
    </span>
  );
}
