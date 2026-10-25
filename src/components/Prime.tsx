import { useRef } from 'react';
import { gsap, useGSAP, reduzMovimento } from '../lib/gsap';
import { usePerto } from '../lib/perto';
import { itens } from '../lib/catalogo';
import { loja } from '../lib/loja';
import { TituloSecao } from './Cadarco';

const PASSOS = [
  {
    titulo: 'Escolha no catálogo',
    texto: `Filtre por marca, modelo e numeração entre os ${itens.length} modelos e toque no tênis para ver a foto grande.`,
  },
  {
    titulo: 'Mande pelo WhatsApp',
    texto: 'A mensagem já sai pronta, com o modelo, a cor, a sua numeração e o link da foto.',
  },
  {
    titulo: `Combine com o ${loja.atendente}`,
    texto: 'Ele confirma se tem o seu número e combina com você o pagamento e a entrega.',
  },
];

/** A loja em poucas linhas e o passo a passo do pedido. Os passos são ilhós ligados pelo cadarço. */
export function Prime() {
  const raiz = useRef<HTMLElement>(null);
  const perto = usePerto(raiz);

  useGSAP(
    () => {
      if (!perto || reduzMovimento()) return;
      const q = gsap.utils.selector(raiz);
      const ilhos = q('.passo__ilho');
      const lacos = q('.passos__laco path');
      const textos = q('.passo__texto');
      gsap.set(ilhos, { scale: 0 });
      gsap.set(lacos, { drawSVG: '0%' });
      gsap.set(textos, { autoAlpha: 0, y: 16 });
      gsap.set(q('.prime__fatos li'), { autoAlpha: 0, y: 14 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: q('.passos')[0], start: 'top 80%', once: true } });
      ilhos.forEach((ilho, i) => {
        const t = i * 0.45;
        tl.to(ilho, { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, t).to(textos[i], { autoAlpha: 1, y: 0, duration: 0.5 }, t + 0.1);
        if (lacos[i]) tl.to(lacos[i], { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut' }, t + 0.2);
      });
      gsap.to(q('.prime__fatos li'), {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        scrollTrigger: { trigger: q('.prime__fatos')[0], start: 'top 88%', once: true },
      });
    },
    { scope: raiz, dependencies: [perto] },
  );

  return (
    <section className="secao secao--prime" id="prime" ref={raiz} aria-labelledby="prime-titulo">
      <div className="secao__miolo prime">
        <div className="prime__texto">
          <TituloSecao id="prime-titulo">A Prime Store</TituloSecao>
          <p className="prime__lead">
            Loja de tênis de {loja.cidade}. Os lançamentos chegam toda semana e o atendimento é direto com o {loja.atendente}, pelo WhatsApp.
          </p>
          <ul className="prime__fatos">
            <li>
              <strong>{loja.cidade} – {loja.uf}</strong>
              <span>Entrega para toda a região</span>
            </li>
            <li>
              <strong>Lançamentos</strong>
              <span>Modelos novos toda semana</span>
            </li>
            <li>
              <strong>Pagamento</strong>
              <span>Diversas formas, combinadas na conversa</span>
            </li>
          </ul>
        </div>

        <div className="prime__como">
          <h3 className="prime__subtitulo">Como pedir</h3>
          <ol className="passos">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="passo">
                <span className="passo__ilho" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="passo__texto">
                  <strong>{p.titulo}</strong>
                  <p>{p.texto}</p>
                </div>
                {i < PASSOS.length - 1 ? (
                  <svg className="passos__laco" viewBox="0 0 24 64" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M4 0 L20 21 L4 42 L20 64" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
