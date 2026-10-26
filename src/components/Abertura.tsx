import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, pausarRolagem } from '../lib/gsap';
import { CadarcoAbertura } from './Cadarco';

export const EVENTO_ABERTURA_SAINDO = 'prime:abertura-saindo';

function sinalizarSaida() {
  (window as unknown as { __aberturaSaiu?: boolean }).__aberturaSaiu = true;
  window.dispatchEvent(new Event(EVENTO_ABERTURA_SAINDO));
}

const PRIME = ['P', 'R', 'I', 'M', 'E'];
/** Raio dos anéis no viewBox 0 0 200 200 do emblema. */
const R_EXT = 96;
const R_INT = 89;

/**
 * Abertura "o ilhós se abre": um brilho dourado acende, dois anéis finos se desenham (a moldura da logo,
 * o ilhós do tênis), o cadarço cruza e dá o laço lá dentro e o nome sobe letra por letra. No fim, um furo
 * redondo nasce no anel e cresce até revelar o site, com os anéis acompanhando a borda do furo.
 * Completa (~3,4 s) na primeira visita da sessão, curta (~0,8 s) ao recarregar, nenhuma com "reduzir movimento".
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

      const centro = q('.abertura__centro')[0];
      const emblema = q('.abertura__emblema')[0];
      const [anelExt, anelInt] = q('.abertura__aneis circle') as unknown as SVGCircleElement[];
      const ilhos = q('.abertura__ilhos circle');
      const [barra, zigA, zigB] = q('.abertura__lacos path');
      const laco = q('.abertura__laco path');
      const letras = q('.abertura__letra');
      const store = q('.abertura__store');
      const regua = q('.abertura__regua');
      const brilho = q('.abertura__brilho');

      // O furo: máscara radial na própria cortina, centrada no emblema
      const furo = { r: 0 };
      let cx = 0, cy = 0, r0 = 1, rMax = 1, unidade = 1;
      const medir = () => {
        const b = emblema.getBoundingClientRect();
        cx = b.left + b.width / 2;
        cy = b.top + b.height / 2;
        unidade = b.width / 200; // px por unidade do viewBox
        r0 = R_INT * unidade;
        rMax = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 4;
      };
      const pintarFuro = () => {
        const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${furo.r}px, #000 ${furo.r + 1.5}px)`;
        el.style.setProperty('-webkit-mask-image', m);
        el.style.setProperty('mask-image', m);
        // os anéis vão junto com a borda do furo, logo do lado de fora
        anelInt.setAttribute('r', String((furo.r + 3) / unidade));
        anelExt.setAttribute('r', String((furo.r + 3) / unidade + (R_EXT - R_INT)));
      };

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
          el.style.removeProperty('-webkit-mask-image');
          el.style.removeProperty('mask-image');
          pausarRolagem(false);
          ScrollTrigger.refresh();
        },
      });

      if (curta) {
        gsap.set(brilho, { autoAlpha: 1 });
        gsap.set([anelExt, anelInt, barra, zigA, zigB, ...laco], { drawSVG: '100%' });
      } else {
        gsap.set(brilho, { autoAlpha: 0, scale: 0.85 });
        gsap.set(anelExt, { drawSVG: '0%', rotation: -90, transformOrigin: '50% 50%' });
        gsap.set(anelInt, { drawSVG: '50% 50%', rotation: -90, transformOrigin: '50% 50%' });
        gsap.set([barra, zigA, zigB, ...laco], { drawSVG: '0%' });
        gsap.set(ilhos, { scale: 0, transformOrigin: '50% 50%' });
        gsap.set(letras, { yPercent: 115 });
        gsap.set(store, { autoAlpha: 0, letterSpacing: '1.1em' });
        gsap.set(regua, { scaleX: 0 });

        tl.to(brilho, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'sine.inOut' }, 0)
          .to(anelExt, { drawSVG: '100%', duration: 0.95, ease: 'power2.inOut' }, 0.05)
          .to(anelInt, { drawSVG: '0% 100%', duration: 0.85, ease: 'power2.inOut' }, 0.25)
          .to(ilhos, { scale: 1, duration: 0.35, stagger: { each: 0.035, from: 'end' }, ease: 'back.out(2.6)' }, 0.5)
          .to(barra, { drawSVG: '100%', duration: 0.26, ease: 'power2.inOut' }, 0.72)
          .to([zigA, zigB], { drawSVG: '100%', duration: 0.85, ease: 'power2.inOut' }, 0.88)
          .to(laco.slice(0, 2), { drawSVG: '100%', duration: 0.2, ease: 'power1.out' }, 1.68)
          .to(laco.slice(2, 4), { drawSVG: '100%', duration: 0.45, ease: 'elastic.out(1, 0.55)', stagger: 0.05 }, 1.84)
          .to(laco.slice(4), { drawSVG: '100%', duration: 0.3, ease: 'power2.out', stagger: 0.05 }, 1.96)
          .to(letras, { yPercent: 0, duration: 0.75, ease: 'expo.out', stagger: 0.045 }, 1.55)
          .to(store, { autoAlpha: 1, letterSpacing: '0.44em', duration: 0.75 }, 1.9)
          .to(regua, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 2.0);
      }

      tl.addLabel('abre', curta ? 0.12 : 2.45)
        .call(
          () => {
            medir();
            // o tracejado do DrawSVG tem o comprimento do anel original: traço contínuo para ele poder crescer
            for (const a of [anelExt, anelInt]) {
              a.style.strokeDasharray = 'none';
              a.style.strokeDashoffset = '0';
            }
            furo.r = r0 * 0.94;
            pintarFuro();
            sinalizarSaida();
          },
          undefined,
          'abre',
        )
        .to(furo, { r: () => rMax, duration: curta ? 0.7 : 0.95, ease: 'power3.inOut', onUpdate: pintarFuro }, 'abre')
        .to(q('.abertura__cadarco, .abertura__nome'), { autoAlpha: 0, scale: 1.1, duration: 0.4, ease: 'power2.in' }, 'abre')
        .to(brilho, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 'abre')
        .to([anelExt, anelInt], { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, curta ? 'abre+=0.45' : 'abre+=0.7');

      gsap.set(centro, { visibility: 'visible' });
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
      <div className="abertura__brilho" />
      <div className="abertura__centro">
        <div className="abertura__emblema">
          <svg className="abertura__aneis" viewBox="0 0 200 200">
            <circle className="abertura__anel" cx="100" cy="100" r={R_EXT} />
            <circle className="abertura__anel abertura__anel--interno" cx="100" cy="100" r={R_INT} />
          </svg>
          <CadarcoAbertura />
        </div>
        <p className="abertura__nome">
          <span className="abertura__prime">
            {PRIME.map((l, i) => (
              <span key={i} className="abertura__letra">
                {l}
              </span>
            ))}
          </span>
          <span className="abertura__store">STORE</span>
          <i className="abertura__regua" />
        </p>
      </div>
    </div>
  );
}
