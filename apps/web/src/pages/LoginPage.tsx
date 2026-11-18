import { useState } from 'react';
import { Button } from '../components/ui';
import { api } from '../lib/api';

/** Écran affiché uniquement si APP_PASSWORD est défini côté serveur. */
export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <form
        className="w-full max-w-sm rounded-[2rem] bg-surface p-8 text-center shadow-xl ring-1 ring-line"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          try {
            await api.login(password);
            onSuccess();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <img src="/icon.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-3xl font-semibold">Meal Maker</h1>
        <p className="mt-1 mb-6 text-muted">Ton carnet de recettes perso 🍳</p>
        <label className="block text-left">
          <span className="mb-1 block font-bold">Mot de passe</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 font-semibold outline-none focus:border-tomato"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 font-bold text-tomato">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-5 w-full py-3" disabled={loading || !password}>
          Entrer
        </Button>
      </form>
    </div>
  );
}
