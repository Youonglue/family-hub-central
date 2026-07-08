import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import './styles.css';

// Initialize the data fetcher (QueryClient)
const queryClient = new QueryClient();

// Initialize the Router
const router = createRouter({
  routeTree,
  context: { queryClient },
});

// Mount the app to the 'root' div in index.html
const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);
root.render(<RouterProvider router={router} />);
