import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './app/providers/query-provider';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
);
