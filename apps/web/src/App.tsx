import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createBrowserRouter, Link, RouterProvider } from 'react-router';
import { Layout } from './components/Layout';
import { Toaster } from './components/Toaster';
import { EmptyState, Spinner } from './components/ui';
import { AUTH_EVENT, api } from './lib/api';
import { DiscoverPage } from './pages/DiscoverPage';
import { EditorPage } from './pages/EditorPage';
import { FridgePage } from './pages/FridgePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyRecipesPage } from './pages/MyRecipesPage';
import { PlanningPage } from './pages/PlanningPage';
import { RecipePage } from './pages/RecipePage';
import { ShoppingPage } from './pages/ShoppingPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'frigo', element: <FridgePage /> },
      { path: 'decouverte', element: <DiscoverPage /> },
      { path: 'mes-plats', element: <MyRecipesPage /> },
      { path: 'planning', element: <PlanningPage /> },
      { path: 'courses', element: <ShoppingPage /> },
      { path: 'recette/nouvelle', element: <EditorPage /> },
      { path: 'recette/:id', element: <RecipePage /> },
      { path: 'recette/:id/modifier', element: <EditorPage /> },
      {
        path: '*',
        element: (
          <EmptyState emoji="🍽️" title="Cette page n'est pas au menu">
            <Link to="/" className="font-bold text-tomato underline">
              Retour aux recettes
            </Link>
          </EmptyState>
        ),
      },
    ],
  },
]);

export function App() {
  const qc = useQueryClient();
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.authStatus, retry: 1 });

  useEffect(() => {
    const onAuth = () => void qc.invalidateQueries({ queryKey: ['auth'] });
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, [qc]);

  if (auth.isPending) return <Spinner />;
  if (auth.data && auth.data.required && !auth.data.authenticated) {
    return <LoginPage onSuccess={() => qc.invalidateQueries()} />;
  }
  return (
    <Toaster>
      <RouterProvider router={router} />
    </Toaster>
  );
}
