import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, pausarRolagem } from '../lib/gsap';
import { CadarcoAbertura } from './Cadarco';

export const EVENTO_ABERTURA_SAINDO = 'prime:abertura-saindo';

function sinalizarSaida() {
  (window as unknown as { __aberturaSaiu?: boolean }).__aberturaSaiu = true;
  window.dispatchEvent(new Event(EVENTO_ABERTURA_SAINDO));
}

/**
 * Abertura: o cadarço cruza os ilhós de baixo para cima e dá o laço; o nome entra e a cortina sobe.
 * Completa (~2,9 s) na primeira visita da sessão, curta (~0,8 s) ao recarregar, nenhuma com "reduzir movimento".
 * O <head> decide (classes has-intro e intro-curta) e solta a página sozinho em 7 s se o JS falhar.
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
      const curta = html.classList.contains('intro-curta');
      const el = raiz.current!;
      const q = gsap.utils.selector(el);
      pausarRolagem(true);

      const EVENTOS = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
      const pular = () => {
        tl.timeScale(5);
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

      const ilhos = q('.abertura__ilhos circle');
      const [barra, zigA, zigB] = q('.abertura__lacos path');
      const laco = q('.abertura__laco path');
      const nome = q('.abertura__nome');

      if (curta) {
        gsap.set([barra, zigA, zigB, ...laco.slice(0, 2)], { drawSVG: '100%' });
        gsap.set(laco.slice(2), { drawSVG: '0%' });
        tl.from(el.querySelector('.abertura__cadarco'), { scale: 0.92, autoAlpha: 0, duration: 0.3 })
          .to(laco.slice(2), { drawSVG: '100%', duration: 0.3, stagger: 0.04 }, 0.1)
          .from(nome, { autoAlpha: 0, y: 10, duration: 0.3 }, 0.15);
      } else {
        gsap.set([barra, zigA, zigB, ...laco], { drawSVG: '0%' });
        gsap.set(ilhos, { scale: 0, transformOrigin: '50% 50%' });
        tl.to(ilhos, { scale: 1, duration: 0.35, stagger: { each: 0.035, from: 'end' }, ease: 'back.out(2.6)' })
          .to(barra, { drawSVG: '100%', duration: 0.28, ease: 'power2.inOut' }, 0.3)
          .to([zigA, zigB], { drawSVG: '100%', duration: 0.95, ease: 'power2.inOut' }, 0.5)
          .to(laco.slice(0, 2), { drawSVG: '100%', duration: 0.22, ease: 'power1.out' }, 1.4)
          .to(laco.slice(2, 4), { drawSVG: '100%', duration: 0.45, ease: 'elastic.out(1, 0.55)', stagger: 0.05 }, 1.58)
          .to(laco.slice(4), { drawSVG: '100%', duration: 0.3, ease: 'power2.out', stagger: 0.05 }, 1.72)
          .from(nome, { autoAlpha: 0, y: 14, letterSpacing: '0.6em', duration: 0.6 }, 1.75);
      }

      tl.addLabel('sobe', curta ? 0.5 : 2.35)
        .call(sinalizarSaida, undefined, 'sobe')
        .to(el, { yPercent: -100, duration: curta ? 0.55 : 0.8, ease: 'power4.inOut' }, 'sobe');

      EVENTOS.forEach((ev) => window.addEventListener(ev, pular, { passive: true }));

      const fontes = document.fonts?.load ? document.fonts.load('800 40px "Archivo"') : Promise.resolve();
      let vivo = true;
      Promise.race([fontes, new Promise((r) => setTimeout(r, 1200))]).then(() => {
        if (vivo) tl.play();
      });

      return () => {
        vivo = false;
        soltar();
        pausarRolagem(false);
      };
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className="abertura" aria-hidden="true">
      <div className="abertura__centro">
        <CadarcoAbertura />
        <p className="abertura__nome">
          PRIME <span>STORE</span>
        </p>
      </div>
    </div>
  );
}
