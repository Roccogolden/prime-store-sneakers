import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, Draggable, InertiaPlugin, DrawSVGPlugin);

// Identidade de movimento: entradas com power3.out, três durações (rápida, padrão, lenta).
gsap.defaults({ ease: 'power3.out', duration: 0.5 });
export const DUR = { rapida: 0.25, padrao: 0.5, lenta: 0.9 };

export const reduzMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ehCelular = () => window.matchMedia('(max-width: 767px)').matches;
export const temMouse = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis: Lenis | null = null;

/** Rolagem suave sincronizada com o ScrollTrigger. Sem efeito com "reduzir movimento". */
export function ligarRolagemSuave() {
  if (lenis || reduzMovimento()) return;
  lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(rafLenis);
  gsap.ticker.lagSmoothing(0);
}

function rafLenis(t: number) {
  lenis?.raf(t * 1000);
}

export function desligarRolagemSuave() {
  if (!lenis) return;
  gsap.ticker.remove(rafLenis);
  lenis.destroy();
  lenis = null;
}

export function pausarRolagem(pausar: boolean) {
  if (!lenis) return;
  if (pausar) lenis.stop();
  else lenis.start();
}

/** Rola até um elemento descontando o cabeçalho fixo. */
export function rolarPara(alvo: string | HTMLElement, deslocamento = -76) {
  const el = typeof alvo === 'string' ? document.querySelector<HTMLElement>(alvo) : alvo;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: deslocamento, duration: 1.1 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + deslocamento;
    window.scrollTo({ top: y, behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }
}

export { gsap, ScrollTrigger, Flip, Draggable, InertiaPlugin, DrawSVGPlugin, useGSAP };
