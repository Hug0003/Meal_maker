import {
  CARD_COLORS,
  CATEGORIES,
  DIETS,
  MOODS,
  SEASONS,
  recipeInputSchema,
  type RecipeDetail,
  type RecipeInput,
} from '@meal/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IngredientInput } from '../components/IngredientInput';
import { RecipeVisual } from '../components/RecipeVisual';
import { useToast } from '../components/Toaster';
import { Button, Chip, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useInvalidateRecipes, useMeta } from '../lib/hooks';

const EMOJIS = [
  '🍽️',
  '🍝',
  '🍲',
  '🥘',
  '🍛',
  '🍜',
  '🥗',
  '🍕',
  '🌮',
  '🍔',
  '🥩',
  '🍗',
  '🐟',
  '🦐',
  '🥚',
  '🧀',
  '🥦',
  '🥕',
  '🍆',
  '🎃',
  '🍄',
  '🥔',
  '🍚',
  '🥟',
  '🥧',
  '🍰',
  '🍫',
  '🍪',
  '🥞',
  '🍓',
  '🍋',
  '🥑',
  '🌶️',
  '🥥',
  '🍵',
  '🥤',
];

interface IngRow {
  key: number;
  name: string;
  quantity: string;
  unit: string;
  note: string;
  optional: boolean;
}

let rowKey = 1;
const emptyRow = (): IngRow => ({
  key: rowKey++,
  name: '',
  quantity: '',
  unit: '',
  note: '',
  optional: false,
});

function fromRecipe(r?: RecipeDetail) {
  return {
    title: r?.title ?? '',
    description: r?.description ?? '',
    emoji: r?.emoji ?? '🍽️',
    color: r?.color ?? 'mango',
    imageUrl: r?.imageUrl ?? null,
    category: r?.category ?? 'plat',
    cuisine: r?.cuisine ?? 'française',
    moods: r?.moods ?? [],
    diets: r?.diets ?? [],
    seasons: r?.seasons ?? [],
    prepMinutes: r?.prepMinutes ?? 15,
    cookMinutes: r?.cookMinutes ?? 20,
    servings: r?.servings ?? 4,
    difficulty: r?.difficulty ?? 1,
    cost: r?.cost ?? 1,
    tips: r?.tips ?? '',
    ingredients: r?.ingredients.map((i) => ({
      key: rowKey++,
      name: i.name,
      quantity: i.quantity != null ? String(Math.round(i.quantity * 100) / 100) : '',
      unit: i.unit ?? '',
      note: i.note ?? '',
      optional: i.optional,
    })) ?? [emptyRow(), emptyRow(), emptyRow()],
    steps: r?.steps.length ? r.steps : [''],
  };
}

export function EditorPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const query = useQuery({ queryKey: ['recipe', id], queryFn: () => api.recipe(id!), enabled: id !== null });
  if (id !== null && query.isPending) return <Spinner />;
  return <Editor key={query.data?.id ?? 'new'} recipe={query.data} />;
}

function Editor({ recipe }: { recipe?: RecipeDetail }) {
  const [form, setForm] = useState(() => fromRecipe(recipe));
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const invalidate = useInvalidateRecipes();
  const meta = useMeta();
  const isCatalog = recipe && recipe.source !== 'perso';

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const toggle = <K extends 'moods' | 'diets' | 'seasons'>(key: K, v: string) =>
    setForm((f) => {
      const list = f[key] as string[];
      return { ...f, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });
  const setIng = (key: number, patch: Partial<IngRow>) =>
    set(
      'ingredients',
      form.ingredients.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  const move = <T,>(list: T[], i: number, d: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    return next;
  };

  const save = useMutation({
    mutationFn: (input: RecipeInput) =>
      recipe ? api.updateRecipe(recipe.id, input) : api.createRecipe(input),
    onSuccess: async (saved) => {
      await invalidate();
      toast({
        emoji: '💾',
        message: saved.original && !recipe?.original ? 'Ta version est enregistrée' : 'Recette enregistrée',
      });
      navigate(`/recette/${saved.id}`, { replace: true });
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = recipeInputSchema.safeParse({
      ...form,
      tips: form.tips || null,
      ingredients: form.ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name,
          quantity: i.quantity ? Number(i.quantity.replace(',', '.')) || null : null,
          unit: i.unit || null,
          note: i.note || null,
          optional: i.optional,
        })),
      steps: form.steps.map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field =
        { title: 'Le titre', ingredients: 'Les ingrédients', steps: 'Les étapes', cuisine: 'La cuisine' }[
          String(issue.path[0])
        ] ?? String(issue.path[0]);
      setError(
        `${field} : ${issue.message === 'Required' ? 'obligatoire' : issue.message.includes('at least') ? 'au moins un élément ou quelques caractères' : issue.message}`,
      );
      return;
    }
    save.mutate(parsed.data);
  };

  const fieldBase =
    'rounded-2xl border-2 border-line bg-surface px-3.5 py-2.5 font-semibold outline-none focus:border-tomato';
  const field = `w-full ${fieldBase}`;

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl">
      <PageHeader
        emoji="✏️"
        title={recipe ? 'Modifier la recette' : 'Nouvelle recette'}
        subtitle={
          isCatalog
            ? 'Tes changements créent « ta version » de cette recette. L’originale reste disponible et tu pourras y revenir à tout moment.'
            : 'Ta recette rejoindra le catalogue et toutes les fonctionnalités (frigo, découverte, planning…).'
        }
      />

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <RecipeVisual
            emoji={form.emoji}
            color={form.color}
            imageUrl={form.imageUrl}
            title={form.title}
            className="h-44 rounded-3xl"
            emojiClass="text-7xl"
          />
          <p className="mt-3 mb-1 text-xs font-extrabold text-muted uppercase">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Couleur ${c}`}
                aria-pressed={form.color === c}
                onClick={() => set('color', c)}
                className={`tint-${c} blob-bg h-8 w-8 rounded-full ring-offset-2 ring-offset-bg ${form.color === c ? 'ring-3 ring-ink' : ''}`}
              />
            ))}
          </div>
          <p className="mt-3 mb-1 text-xs font-extrabold text-muted uppercase">Emoji</p>
          <div className="grid grid-cols-6 gap-1">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                aria-label={`Emoji ${em}`}
                aria-pressed={form.emoji === em}
                onClick={() => set('emoji', em)}
                className={`rounded-lg p-1 text-xl ${form.emoji === em ? 'bg-tomato/15' : 'hover:bg-surface-2'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-bold">Titre</span>
            <input
              className={field}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="Le gratin de mamie"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">Description</span>
            <textarea
              className={field}
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
              placeholder="En une phrase, pourquoi on l'aime ?"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-bold">Catégorie</span>
              <select
                className={field}
                value={form.category}
                onChange={(e) => set('category', e.target.value as typeof form.category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold">Cuisine</span>
              <input
                className={field}
                list="cuisines"
                value={form.cuisine}
                onChange={(e) => set('cuisine', e.target.value)}
                required
              />
              <datalist id="cuisines">
                {meta.data?.cuisines.map((c) => (
                  <option key={c.id} value={c.id} />
                ))}
              </datalist>
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold">Personnes</span>
              <input
                className={field}
                type="number"
                min={1}
                max={50}
                value={form.servings}
                onChange={(e) => set('servings', Number(e.target.value))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold">Prépa (min)</span>
              <input
                className={field}
                type="number"
                min={0}
                max={2000}
                value={form.prepMinutes}
                onChange={(e) => set('prepMinutes', Number(e.target.value))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-bold">Cuisson (min)</span>
              <input
                className={field}
                type="number"
                min={0}
                max={2000}
                value={form.cookMinutes}
                onChange={(e) => set('cookMinutes', Number(e.target.value))}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-sm font-bold">Niveau</span>
                <select
                  className={field}
                  value={form.difficulty}
                  onChange={(e) => set('difficulty', Number(e.target.value))}
                >
                  <option value={1}>Facile</option>
                  <option value={2}>Moyen</option>
                  <option value={3}>Chef</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-bold">Coût</span>
                <select
                  className={field}
                  value={form.cost}
                  onChange={(e) => set('cost', Number(e.target.value))}
                >
                  <option value={1}>€</option>
                  <option value={2}>€€</option>
                  <option value={3}>€€€</option>
                </select>
              </label>
            </div>
          </div>
          <TagRow label="Moods">
            {MOODS.map((m) => (
              <Chip
                key={m.id}
                tint={m.color}
                active={form.moods.includes(m.id)}
                onClick={() => toggle('moods', m.id)}
              >
                {m.emoji} {m.label}
              </Chip>
            ))}
          </TagRow>
          <TagRow label="Régimes">
            {DIETS.map((d) => (
              <Chip
                key={d.id}
                tint="mint"
                active={form.diets.includes(d.id)}
                onClick={() => toggle('diets', d.id)}
              >
                {d.emoji} {d.label}
              </Chip>
            ))}
          </TagRow>
          <TagRow label="Saisons (aucune = toute l'année)">
            {SEASONS.map((s) => (
              <Chip
                key={s.id}
                tint="lime"
                active={form.seasons.includes(s.id)}
                onClick={() => toggle('seasons', s.id)}
              >
                {s.emoji} {s.label}
              </Chip>
            ))}
          </TagRow>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="ing-title">
        <h2 id="ing-title" className="mb-3 text-2xl font-semibold">
          Ingrédients
        </h2>
        <div className="space-y-2">
          {form.ingredients.map((row, i) => (
            // Mobile : nom + actions sur une ligne, quantité/unité/précision dessous. Ordinateur : tout sur une ligne.
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2 ring-1 ring-line sm:flex-nowrap"
            >
              <input
                aria-label="Quantité"
                inputMode="decimal"
                className={`${fieldBase} order-3 w-20 sm:order-1`}
                value={row.quantity}
                onChange={(e) => setIng(row.key, { quantity: e.target.value })}
                placeholder="200"
              />
              <input
                aria-label="Unité"
                className={`${fieldBase} order-3 w-24 sm:order-2`}
                value={row.unit}
                onChange={(e) => setIng(row.key, { unit: e.target.value })}
                placeholder="g"
              />
              <IngredientInput
                className="order-1 min-w-0 flex-1 sm:order-3"
                label="Nom de l'ingrédient"
                value={row.name}
                onChange={(v) => setIng(row.key, { name: v })}
                onPick={(v) => setIng(row.key, { name: v })}
                clearOnPick={false}
                placeholder="farine"
              />
              <input
                aria-label="Précision"
                className={`${fieldBase} order-3 min-w-0 flex-1 sm:order-4 sm:w-40 sm:flex-none`}
                value={row.note}
                onChange={(e) => setIng(row.key, { note: e.target.value })}
                placeholder="précision"
              />
              <div className="order-2 flex items-center sm:order-5">
                <label
                  className="flex items-center gap-1 px-1 text-xs font-bold text-muted"
                  title="Facultatif"
                >
                  <input
                    type="checkbox"
                    checked={row.optional}
                    onChange={(e) => setIng(row.key, { optional: e.target.checked })}
                  />{' '}
                  opt.
                </label>
                <button
                  type="button"
                  aria-label="Monter"
                  disabled={i === 0}
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"
                  onClick={() => set('ingredients', move(form.ingredients, i, -1))}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Supprimer l'ingrédient"
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-tomato"
                  onClick={() =>
                    set(
                      'ingredients',
                      form.ingredients.filter((r) => r.key !== row.key),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div aria-hidden className="order-2 h-0 basis-full sm:hidden" />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="soft"
          className="mt-3"
          onClick={() => set('ingredients', [...form.ingredients, emptyRow()])}
        >
          <Plus size={16} /> Ajouter un ingrédient
        </Button>
      </section>

      <section className="mt-8" aria-labelledby="steps-edit-title">
        <h2 id="steps-edit-title" className="mb-3 text-2xl font-semibold">
          Étapes
        </h2>
        <ol className="space-y-2">
          {form.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tomato font-display font-semibold text-white">
                {i + 1}
              </span>
              <textarea
                aria-label={`Étape ${i + 1}`}
                className={field}
                rows={2}
                value={s}
                onChange={(e) =>
                  set(
                    'steps',
                    form.steps.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder="Décris l'étape… (« 20 min » ajoute automatiquement un minuteur)"
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Monter l'étape"
                  disabled={i === 0}
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"
                  onClick={() => set('steps', move(form.steps, i, -1))}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Descendre l'étape"
                  disabled={i === form.steps.length - 1}
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"
                  onClick={() => set('steps', move(form.steps, i, 1))}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Supprimer l'étape"
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-tomato"
                  onClick={() =>
                    set(
                      'steps',
                      form.steps.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="soft"
          className="mt-3"
          onClick={() => set('steps', [...form.steps, ''])}
        >
          <Plus size={16} /> Ajouter une étape
        </Button>
      </section>

      <label className="mt-8 block">
        <span className="mb-1 block text-2xl font-semibold">💡 Astuce</span>
        <textarea
          className={field}
          rows={2}
          value={form.tips}
          onChange={(e) => set('tips', e.target.value)}
          placeholder="Facultatif"
        />
      </label>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-tomato/10 px-4 py-3 font-bold text-tomato">
          {error}
        </p>
      )}
      <div className="sticky bottom-20 mt-8 flex justify-end gap-3 rounded-full bg-bg/90 py-3 backdrop-blur md:bottom-4">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Annuler
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : isCatalog ? 'Enregistrer ma version' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

function TagRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
