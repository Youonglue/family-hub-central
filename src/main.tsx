// src/main.tsx
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import './styles.css';

// Automatic Stale Cache Buster: Unregisters old service workers & purges stale caches
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });

  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

// Initialize the data fetcher (QueryClient)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds fresh cache
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize the Router
const router = createRouter({
  routeTree,
  context: { queryClient },
});

// Register router types for TanStack Router safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Mount the app to the 'root' div in index.html
const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

root.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
