import { useCallback, useEffect, useState } from 'react';

/** Lecture/écriture localStorage tolérante (navigation privée, stockage bloqué…). */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignoré */
  }
  window.dispatchEvent(new CustomEvent('meal:storage', { detail: key }));
}

/** État persistant partagé entre composants (synchronisé via un événement). */
export function usePersistentState<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback));
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) setValue(readStorage(key, fallback));
    };
    window.addEventListener('meal:storage', onChange);
    return () => window.removeEventListener('meal:storage', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((v: T) => writeStorage(key, v), [key]);
  return [value, set];
}
