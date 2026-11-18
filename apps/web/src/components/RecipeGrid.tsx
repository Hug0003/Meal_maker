import type { RecipeCard as Card } from '@meal/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { api, type QueryParams } from '../lib/api';
import { RecipeCard } from './RecipeCard';
import { Button, EmptyState, SkeletonGrid } from './ui';

export function CardGrid({ recipes }: { recipes: Card[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}

/** Grille paginée qui charge la suite quand on arrive en bas. */
export function RecipeGrid({
  params,
  empty,
  onTotal,
}: {
  params: QueryParams;
  empty: ReactNode;
  onTotal?: (n: number) => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ['recipes', params],
    queryFn: ({ pageParam }) => api.recipes({ ...params, page: pageParam, pageSize: 24 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: (prev) => prev,
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const total = query.data?.pages[0]?.total;

  useEffect(() => {
    if (total !== undefined) onTotal?.(total);
  }, [total, onTotal]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      },
      { rootMargin: '600px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [query]);

  if (query.isPending) return <SkeletonGrid />;
  if (query.isError) return <EmptyState emoji="😵" title="Oups, impossible de charger les recettes" />;
  const recipes = query.data.pages.flatMap((p) => p.items);
  if (!recipes.length) return <>{empty}</>;

  return (
    <div className={query.isFetching && !query.isFetchingNextPage ? 'opacity-70 transition' : 'transition'}>
      <CardGrid recipes={recipes} />
      <div ref={sentinel} className="flex justify-center py-8">
        {query.hasNextPage && (
          <Button variant="soft" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? 'Chargement…' : 'Voir plus de recettes'}
          </Button>
        )}
      </div>
    </div>
  );
}
