import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP, reduzMovimento } from '../lib/gsap';
import { usePerto } from '../lib/perto';

/**
 * Assinatura da marca: o cadarço dourado.
 * Abertura: o laço da caixa do tênis se desfaz e a tampa sobe (Abertura.tsx). Ao longo: este marcador entra
 * antes de cada título. Fechamento: o laço se amarra em volta do botão do WhatsApp.
 */

const ILHOS_TITULO = [6, 26, 46, 66].flatMap((x) => [
  [x, 3],
  [x, 17],
]);

/** Marcador de seção: quatro pares de ilhós com o cadarço cruzado. Desenha uma vez ao aparecer. */
export function MarcadorCadarco() {
  const ref = useRef<SVGSVGElement>(null);
  const perto = usePerto(ref);

  useGSAP(
    () => {
      if (!perto || reduzMovimento()) return;
      const svg = ref.current!;
      const ilhos = svg.querySelectorAll('circle');
      const lacos = svg.querySelectorAll('path');
      gsap.set(ilhos, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(lacos, { drawSVG: '0%' });
      gsap
        .timeline({ scrollTrigger: { trigger: svg, start: 'top 90%', once: true } })
        .to(ilhos, { scale: 1, duration: 0.3, stagger: 0.03, ease: 'back.out(2.4)' })
        .to(lacos, { drawSVG: '100%', duration: 0.7, stagger: 0.12, ease: 'power2.inOut' }, 0.12);
    },
    { scope: ref, dependencies: [perto] },
  );

  return (
    <svg ref={ref} className="marcador-cadarco" viewBox="0 0 72 20" aria-hidden="true">
      <path d="M6 3 L26 17 L46 3 L66 17" />
      <path d="M6 17 L26 3 L46 17 L66 3" />
      {ILHOS_TITULO.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" />
      ))}
    </svg>
  );
}

export function TituloSecao({ id, children, sub }: { id?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="titulo-secao">
      <MarcadorCadarco />
      <h2 id={id}>{children}</h2>
      {sub ? <p className="titulo-secao__sub">{sub}</p> : null}
    </header>
  );
}

/**
 * Laço em volta do botão principal. O traço contorna o botão (forma de pílula)
 * e termina num laço no canto de cima; o botão "aperta" quando o laço fecha.
 */
export function LacoNoBotao({ children }: { children: ReactNode }) {
  const caixa = useRef<HTMLSpanElement>(null);
  const perto = usePerto(caixa);

  useGSAP(
    () => {
      if (!perto) return;
      const el = caixa.current!;
      const svg = el.querySelector('svg')!;
      const contorno = svg.querySelector<SVGPathElement>('.laco-botao__contorno')!;
      const posicao = svg.querySelector<SVGGElement>('.laco-botao__pos')!;
      const laco = svg.querySelector<SVGGElement>('.laco-botao__laco')!;
      const botao = el.querySelector<HTMLElement>('.btn')!;
      const folga = 12;

      function desenhar() {
        const w = botao.offsetWidth + folga * 2;
        const h = botao.offsetHeight + folga * 2;
        const r = h / 2;
        const x0 = w * 0.78; // o laço fica no alto, à direita
        svg.setAttribute('viewBox', `0 0 ${w} ${h + 26}`);
        svg.style.width = `${w}px`;
        svg.style.height = `${h + 26}px`;
        const t = 26; // espaço acima para o laço
        contorno.setAttribute(
          'd',
          `M${x0} ${t} H${w - r} A${r} ${r} 0 0 1 ${w - r} ${t + h} H${r} A${r} ${r} 0 0 1 ${r} ${t} H${x0 + 2}`,
        );
        posicao.setAttribute('transform', `translate(${x0} ${t})`);
        svg.style.visibility = 'visible';
      }
      desenhar();
      const ro = new ResizeObserver(desenhar);
      ro.observe(botao);

      if (!reduzMovimento()) {
        gsap.set(contorno, { drawSVG: '0%' });
        gsap.set(laco, { scale: 0, transformOrigin: '50% 100%' });
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: 'top 78%', once: true }, delay: 0.3 })
          .to(contorno, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut' })
          .to(laco, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, '-=0.15')
          .to(botao, { scaleX: 0.95, scaleY: 1.04, duration: 0.14, ease: 'power2.in' }, '<')
          .to(botao, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' });
      }
      return () => ro.disconnect();
    },
    { scope: caixa, dependencies: [perto] },
  );

  return (
    <span ref={caixa} className="laco-botao">
      <svg className="laco-botao__svg" aria-hidden="true">
        <path className="laco-botao__contorno" />
        <g className="laco-botao__pos">
          <g className="laco-botao__laco">
            <path d="M0 0 C-14 -20 -34 -14 -26 -4 C-20 3 -8 2 0 0" />
            <path d="M0 0 C14 -20 34 -14 26 -4 C20 3 8 2 0 0" />
            <path d="M0 0 C-4 6 -9 10 -16 13" />
            <path d="M0 0 C4 6 9 10 16 13" />
          </g>
        </g>
      </svg>
      {children}
    </span>
  );
}
