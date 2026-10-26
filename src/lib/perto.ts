import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/** useLayoutEffect no navegador e useEffect na pré-renderização (lá ele não faz nada e só gera aviso). */
export const useEfeitoDeLayout = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

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

/**
 * Para as fotos abaixo da dobra: começa false também na pré-renderização (o HTML sai sem as <img>, e o navegador
 * não as baixa junto com a foto principal) e vira true quando a seção chega perto da tela.
 */
export function useFotosPerto(ref: RefObject<Element | null>, margem = '120%') {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (mostrar || !el) return;
    if (typeof IntersectionObserver === 'undefined') return setMostrar(true);
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setMostrar(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margem} 0px ${margem} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, mostrar, margem]);

  return mostrar;
}
