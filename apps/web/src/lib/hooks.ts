import type { RecipeStateInput } from '@meal/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toaster';
import { api } from './api';

/** Rafraîchit tout ce qui dépend des recettes, de leur état ou du frigo. */
export function useInvalidateRecipes() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['recipes'] }),
      qc.invalidateQueries({ queryKey: ['recipe'] }),
      qc.invalidateQueries({ queryKey: ['meta'] }),
      qc.invalidateQueries({ queryKey: ['discover'] }),
      qc.invalidateQueries({ queryKey: ['plan'] }),
    ]);
}

export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: api.meta, staleTime: 60_000 });
}

export function useFridge() {
  return useQuery({ queryKey: ['fridge'], queryFn: api.fridge });
}

export function useSetRecipeState() {
  const invalidate = useInvalidateRecipes();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RecipeStateInput }) => api.setState(id, input),
    onSuccess: (_d, { input }) => {
      if (input.status === 'done') toast({ emoji: '✅', message: "Ajouté à « Je l'ai fait »" });
      else if (input.status === 'to_try') toast({ emoji: '📌', message: 'Gardé pour plus tard' });
      else if (input.status === 'not_for_me') toast({ emoji: '🙅', message: 'On ne te le proposera plus' });
      else if (input.favorite) toast({ emoji: '❤️', message: 'Ajouté aux favoris' });
      else if (input.rating) toast({ emoji: '⭐', message: `Noté ${input.rating}/5` });
      return invalidate();
    },
    onError: (e: Error) => toast({ emoji: '😕', message: e.message }),
  });
}

export function useCooked() {
  const invalidate = useInvalidateRecipes();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: number) => api.cooked(id),
    onSuccess: () => {
      toast({ emoji: '👩‍🍳', message: "Bravo chef ! C'est noté." });
      return invalidate();
    },
  });
}
