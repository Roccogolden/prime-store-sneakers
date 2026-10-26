import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/** HTML da página no estado inicial, gravado no index.html pelo scripts/prerender.mjs. */
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
