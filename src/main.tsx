import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ligarRolagemSuave } from './lib/gsap';
import { medir, medirCliquesNoWhatsapp, origemDaVisita } from './lib/medir';
import App from './App';
import './styles.css';

// A rolagem suave existe antes da abertura, que a pausa enquanto toca
ligarRolagemSuave();

// Contagem anônima para o painel do Robson (uma visita por carregamento da página)
medir({ t: 'visita', origem: origemDaVisita() });
medirCliquesNoWhatsapp();

const el = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// O HTML vem pré-renderizado no estado inicial. Sem filtros nem tênis no endereço, o React só "hidrata" a página;
// com eles, renderiza de novo por cima. Parâmetros de origem (?origem=, ?utm_*) não mudam o estado: hidrata também.
// Em transição: o trabalho é dividido em fatias e o celular não trava.
const ESTADO_NA_URL = ['linha', 'marca', 'modelo', 'num', 'q', 'm'];
const comEstado = ESTADO_NA_URL.some((k) => new URLSearchParams(window.location.search).has(k));
startTransition(() => {
  if (el.hasChildNodes() && !comEstado) hydrateRoot(el, app);
  else createRoot(el).render(app);
});
