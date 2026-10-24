import { LangProvider } from './lib/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { App } from './App';
import { applyTheme, storedTheme } from './lib/theme';
import './index.css';

applyTheme(storedTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <LangProvider>
        <App />
      </LangProvider>
    </TooltipProvider>
  </StrictMode>,
);
