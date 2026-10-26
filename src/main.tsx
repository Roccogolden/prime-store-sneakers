import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ligarRolagemSuave } from './lib/gsap';
import App from './App';
import './styles.css';

// A rolagem suave existe antes da abertura, que a pausa enquanto toca
ligarRolagemSuave();

const el = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// O HTML vem pré-renderizado no estado inicial. Sem filtros nem tênis no endereço, o React só "hidrata" a página;
// com eles, renderiza de novo por cima. Em transição: o trabalho é dividido em fatias e o celular não trava.
startTransition(() => {
  if (el.hasChildNodes() && !window.location.search) hydrateRoot(el, app);
  else createRoot(el).render(app);
});
