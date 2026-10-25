import { useEffect, useState } from 'react';
import { loja, mensagemGeral, whatsappLink } from '../lib/loja';
import { IconeWhatsapp } from './Icones';

/**
 * Botão flutuante do WhatsApp. Aparece depois do topo (onde já há botões) e some com o detalhe aberto.
 * O rótulo "Fale com o Robson" se mostra sozinho uma vez por sessão.
 */
export function BotaoWhatsapp({ escondido }: { escondido: boolean }) {
  const [depoisDoTopo, setDepoisDoTopo] = useState(false);
  const [noFechamento, setNoFechamento] = useState(false);
  const [rotulo, setRotulo] = useState(false);

  useEffect(() => {
    const aoRolar = () => setDepoisDoTopo(window.scrollY > window.innerHeight * 0.85);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // Some enquanto o botão grande do fechamento está na tela (um WhatsApp por vez)
  useEffect(() => {
    const alvo = document.querySelector('.fechamento__botoes');
    if (!alvo) return;
    const io = new IntersectionObserver(([e]) => setNoFechamento(e.isIntersecting));
    io.observe(alvo);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!depoisDoTopo) return;
    let visto = false;
    try {
      visto = sessionStorage.getItem('rotulo-whats') === '1';
      sessionStorage.setItem('rotulo-whats', '1');
    } catch {
      /* armazenamento indisponível */
    }
    if (visto) return;
    const a = setTimeout(() => setRotulo(true), 2500);
    const b = setTimeout(() => setRotulo(false), 9500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [depoisDoTopo]);

  const visivel = depoisDoTopo && !escondido && !noFechamento;

  return (
    <a
      className={`flutuante${visivel ? ' flutuante--visivel' : ''}${rotulo ? ' flutuante--rotulo' : ''}`}
      href={whatsappLink(mensagemGeral)}
      target="_blank"
      rel="noopener"
      aria-label={`Falar com o ${loja.atendente} no WhatsApp`}
      tabIndex={visivel ? 0 : -1}
      aria-hidden={!visivel}
    >
      <span className="flutuante__rotulo" aria-hidden="true">
        Fale com o {loja.atendente}
      </span>
      <span className="flutuante__icone">
        <IconeWhatsapp width={28} height={28} />
      </span>
    </a>
  );
}
