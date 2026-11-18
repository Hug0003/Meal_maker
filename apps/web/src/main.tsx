import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, type Theme } from './lib/prefs';
import { readStorage } from './lib/storage';
import './styles/index.css';

applyTheme(readStorage<Theme>('mm:theme', 'system'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
