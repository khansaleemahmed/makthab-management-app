import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n';
import { applyLocale } from './i18n';
import { queryClient } from './lib/queryClient';
import { useUiStore } from './store/uiStore';

// Apply persisted UI preferences before first paint.
const { locale, theme } = useUiStore.getState();
applyLocale(locale);
document.documentElement.classList.toggle('dark', theme === 'dark');

// Keep the <html> dark class in sync with the store.
useUiStore.subscribe((state) => {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
