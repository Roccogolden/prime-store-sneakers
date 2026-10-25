import { useRef, useState, type ReactNode } from 'react';
import { gsap, useGSAP, Draggable, reduzMovimento } from '../lib/gsap';
import { IconeAnterior, IconeProximo } from './Icones';

interface Props {
  children: ReactNode;
  rotulo: string;
  className?: string;
  /** Setas grandes ao lado do título (true) ou pequenas nas pontas (false). */
  setas?: 'grandes' | 'pequenas' | 'nenhuma';
  /** Muda quando o conteúdo muda, para recalcular os limites. */
  chave?: string | number;
}

/**
 * Faixa arrastável com inércia (GSAP Draggable + Inertia), setas e foco pelo teclado.
 * O clique nos itens só vale quando não houve arrasto.
 */
export function Trilho({ children, rotulo, className = '', setas = 'grandes', chave }: Props) {
  const janela = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const drag = useRef<Draggable | null>(null);
  const [pontas, setPontas] = useState({ inicio: true, fim: false });

  useGSAP(
    (_, contextSafe) => {
      const j = janela.current!;
      const f = faixa.current!;
      gsap.set(f, { x: 0 });

      const atualizar = () => {
        const min = Math.min(0, j.clientWidth - f.scrollWidth);
        const x = Number(gsap.getProperty(f, 'x'));
        setPontas({ inicio: x >= -2, fim: x <= min + 2 });
      };

      const d = Draggable.create(f, {
        type: 'x',
        bounds: j,
        inertia: true,
        edgeResistance: 0.85,
        dragClickables: true,
        minimumMovement: 6,
        zIndexBoost: false,
        allowNativeTouchScrolling: true,
        onDrag: atualizar,
        onThrowUpdate: atualizar,
        onThrowComplete: atualizar,
        onRelease: atualizar,
      })[0];
      drag.current = d;
      atualizar();

      const ro = new ResizeObserver(() => {
        d.applyBounds(j);
        atualizar();
      });
      ro.observe(j);
      ro.observe(f);

      // Foco pelo teclado traz o item para dentro da janela
      const aoFocar = contextSafe!((e: FocusEvent) => {
        const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-item]') ?? (e.target as HTMLElement);
        if (!f.contains(alvo) || alvo === f) return;
        const x = Number(gsap.getProperty(f, 'x'));
        const esq = alvo.offsetLeft + x;
        const dir = esq + alvo.offsetWidth;
        let novo = x;
        if (esq < 0) novo = x - esq + 8;
        else if (dir > j.clientWidth) novo = x - (dir - j.clientWidth) - 8;
        if (novo !== x) mover(novo);
      });
      f.addEventListener('focusin', aoFocar);

      return () => {
        ro.disconnect();
        f.removeEventListener('focusin', aoFocar);
        d.kill();
      };
    },
    { scope: janela, dependencies: [chave], revertOnUpdate: true },
  );

  function mover(alvo: number) {
    const j = janela.current!;
    const f = faixa.current!;
    const min = Math.min(0, j.clientWidth - f.scrollWidth);
    const x = gsap.utils.clamp(min, 0, alvo);
    gsap.to(f, {
      x,
      duration: reduzMovimento() ? 0 : 0.7,
      ease: 'power3.out',
      onUpdate: () => drag.current?.update(),
      onComplete: () => setPontas({ inicio: x >= -2, fim: x <= min + 2 }),
    });
  }

  function passo(dir: number) {
    const j = janela.current!;
    const x = Number(gsap.getProperty(faixa.current!, 'x'));
    mover(x - dir * j.clientWidth * 0.8);
  }

  const botoes =
    setas === 'nenhuma' ? null : (
      <div className={`trilho__setas trilho__setas--${setas}`}>
        <button type="button" className="btn-redondo" onClick={() => passo(-1)} disabled={pontas.inicio} aria-label={`Voltar ${rotulo}`}>
          <IconeAnterior width={18} height={18} />
        </button>
        <button type="button" className="btn-redondo" onClick={() => passo(1)} disabled={pontas.fim} aria-label={`Avançar ${rotulo}`}>
          <IconeProximo width={18} height={18} />
        </button>
      </div>
    );

  return (
    <div className={`trilho ${className}`} data-inicio={pontas.inicio} data-fim={pontas.fim}>
      {setas === 'grandes' ? botoes : null}
      <div className="trilho__janela" ref={janela} role="region" aria-label={rotulo}>
        <div className="trilho__faixa" ref={faixa}>
          {children}
        </div>
      </div>
      {setas === 'pequenas' ? botoes : null}
    </div>
  );
}
