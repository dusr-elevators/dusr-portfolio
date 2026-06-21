import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import App from './App.tsx';
import {getLangFromPath} from './lib/lang.ts';
import './index.css';

const rootEl = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App initialLang={getLangFromPath(window.location.pathname)} />
  </StrictMode>
);

// In production the markup is prerendered (see prerender.js), so hydrate it.
// In dev the container is empty, so mount from scratch.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}
