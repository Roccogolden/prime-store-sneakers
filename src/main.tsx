import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ligarRolagemSuave } from './lib/gsap';
import App from './App';
import './styles.css';

// A rolagem suave existe antes da abertura, que a pausa enquanto toca
ligarRolagemSuave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
