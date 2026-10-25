import { useEffect, useState, type RefObject } from 'react';

/**
 * Vira true (e fica) quando o elemento chega a menos de `margem` da parte de baixo da tela.
 * As animações abaixo da dobra só são montadas nesse momento: a abertura da página fica sem
 * as medições de layout delas (era o que travava o celular no Lighthouse).
 */
export function usePerto(ref: RefObject<Element | null>, margem = '75%') {
  const [perto, setPerto] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (perto || !el) return;
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setPerto(true);
          io.disconnect();
        }
      },
      { rootMargin: `0px 0px ${margem} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, perto, margem]);

  return perto;
}
