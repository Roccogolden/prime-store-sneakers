import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { ligarRolagemSuave } from './lib/gsap';
import App from './App';
import './styles.css';

// A rolagem suave existe antes da abertura, que a pausa enquanto toca
ligarRolagemSuave();

// Primeira renderização em transição: o React a divide em fatias curtas e o celular não trava
// (a cortina da abertura já cobre a tela pelo CSS enquanto isso).
const raiz = createRoot(document.getElementById('root')!);
startTransition(() => {
  raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
