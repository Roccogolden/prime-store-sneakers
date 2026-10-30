import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, pausarRolagem } from '../lib/gsap';

export const EVENTO_ABERTURA_SAINDO = 'prime:abertura-saindo';

function sinalizarSaida() {
  (window as unknown as { __aberturaSaiu?: boolean }).__aberturaSaiu = true;
  window.dispatchEvent(new Event(EVENTO_ABERTURA_SAINDO));
}

/**
 * Abertura "a caixa do tênis": a tampa preta com o nome impresso, amarrada com o cadarço dourado, já vem no HTML
 * (aparece antes do JS, com um reflexo de luz passando por ela). Quando o JS chega, o laço aperta, se desfaz, o
 * cadarço é puxado para fora da tela, uma fresta de luz acende na borda e a tampa sobe: a loja está lá dentro.
 * Fecha com o laço que se amarra no botão do WhatsApp no fim da página (Cadarco.tsx).
 * Completa (~2,2 s) na primeira visita da sessão, curta (~0,9 s) ao recarregar ou quando o JS chega depois de 1,8 s
 * (internet lenta: a caixa já ficou na tela enquanto carregava), nenhuma com "reduzir movimento"
 * ou link de tênis (?m=). O <head> decide (classes has-intro e intro-curta) e solta a página sozinho em 7 s se o
 * JS falhar; quando o JS assume, esse prazo é cancelado para não cortar a animação no meio.
 */
export function Abertura() {
  const raiz = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const html = document.documentElement;
      if (!html.classList.contains('has-intro')) {
        sinalizarSaida();
        return;
      }
      clearTimeout((window as unknown as { __soltarAbertura?: number }).__soltarAbertura);
      // Internet lenta: quem já ficou olhando a caixa enquanto a página carregava não precisa do show inteiro
      const curta = html.classList.contains('intro-curta') || performance.now() > 1800;
      const q = gsap.utils.selector(raiz);
      pausarRolagem(true);

      const tampa = q('.abertura__tampa')[0];
      const caixa = q('.abertura__caixa')[0];
      const laco = q('.abertura__laco')[0];
      const fita = q('.abertura__fita')[0];
      const alcas = q('.abertura__alca');
      const fresta = q('.abertura__fresta')[0];
      const reflexo = q('.abertura__reflexo')[0];

      const EVENTOS = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
      const pular = () => {
        tl.timeScale(6);
        soltar();
      };
      const soltar = () => EVENTOS.forEach((ev) => window.removeEventListener(ev, pular));

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          soltar();
          html.classList.remove('has-intro', 'intro-curta');
          pausarRolagem(false);
          ScrollTrigger.refresh();
        },
      });

      // a tampa sobe pela borda da frente (a de baixo), girando em volta da de trás
      gsap.set(tampa, { transformPerspective: 1400, transformOrigin: '50% 0%' });
      // o cadarço sai inteiro para a direita: o laço vai junto com a fita
      const puxar = () => window.innerWidth * 1.08;

      if (curta) {
        tl.to([fita, laco], { x: puxar, duration: 0.4, ease: 'power3.in' }, 0).addLabel('abre', 0.25);
      } else {
        // 1. alguém segura a ponta: o laço aperta (antecipação)
        tl.to(laco, { scale: 0.9, duration: 0.28, ease: 'power2.in' }, 0.25)
          // 2. as alças se desfazem para dentro do nó
          .to(alcas, { drawSVG: '0% 0%', duration: 0.4, ease: 'power2.in', stagger: 0.07 }, 0.5)
          // 3. o cadarço é puxado para fora, acelerando; a fita afina com a velocidade
          .to([fita, laco], { x: puxar, duration: 0.6, ease: 'power3.in' }, 0.88)
          .to(fita, { scaleY: 0.6, duration: 0.6, ease: 'power3.in' }, 0.88)
          .to(reflexo, { autoAlpha: 0, duration: 0.4 }, 0.9)
          // 4. a fresta: a luz de dentro da caixa acende na borda enquanto o cadarço ainda sai
          .to(fresta, { autoAlpha: 1, duration: 0.28, ease: 'power2.out' }, 1.18)
          .addLabel('abre', 1.4);
      }

      // 5. a tampa levanta e sai; a loja aparece dentro da caixa, cujas bordas somem em seguida
      tl.call(sinalizarSaida, undefined, 'abre')
        .to(tampa, { scale: 1.03, duration: 0.22, ease: 'power2.out' }, 'abre')
        .to(tampa, { yPercent: -112, rotationX: 9, duration: curta ? 0.6 : 0.72, ease: 'power2.in' }, curta ? 'abre' : 'abre+=0.06')
        .to(caixa, { autoAlpha: 0, duration: 0.55, ease: 'power1.inOut' }, curta ? 'abre+=0.35' : 'abre+=0.5');

      EVENTOS.forEach((ev) => window.addEventListener(ev, pular, { passive: true }));
      tl.play();

      return () => {
        soltar();
        pausarRolagem(false);
      };
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className="abertura" aria-hidden="true">
      <div className="abertura__caixa" />
      <div className="abertura__tampa">
        <div className="abertura__face">
          <i className="abertura__reflexo" />
          <i className="abertura__fresta" />
          <p className="abertura__nome">
            <span className="abertura__prime">PRIME</span>
            <span className="abertura__store">STORE</span>
          </p>
          <i className="abertura__fita" />
          <svg className="abertura__laco" viewBox="-80 -50 160 100">
            <defs>
              <linearGradient id="abertura-ouro" gradientUnits="userSpaceOnUse" x1="0" y1="-44" x2="0" y2="50">
                <stop offset="0" stopColor="#ffd877" />
                <stop offset="0.55" stopColor="#f3b932" />
                <stop offset="1" stopColor="#c98f1c" />
              </linearGradient>
            </defs>
            <path className="abertura__ponta" d="M-2 2 C-10 16 -18 30 -30 44" />
            <path className="abertura__ponta" d="M2 2 C12 14 22 28 36 40" />
            <path className="abertura__agulheta" d="M-30 44 L-36 52" />
            <path className="abertura__agulheta" d="M36 40 L43 47" />
            <path className="abertura__alca" d="M0 0 C-14 -26 -50 -40 -64 -24 C-76 -10 -56 8 -30 4 C-16 2 -6 1 0 0" />
            <path className="abertura__alca" d="M0 0 C14 -26 50 -40 64 -24 C76 -10 56 8 30 4 C16 2 6 1 0 0" />
            <rect className="abertura__no" x="-9" y="-8" width="18" height="16" rx="7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
