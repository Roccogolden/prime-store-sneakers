import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Painel } from './Painel';
import './painel.css';

createRoot(document.getElementById('painel')!).render(
  <StrictMode>
    <Painel />
  </StrictMode>,
);
