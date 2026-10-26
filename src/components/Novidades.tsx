import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, reduzMovimento } from '../lib/gsap';
import { descricaoAlt, diaMes, fotoPadrao, novidades, srcset } from '../lib/catalogo';
import { useFotosPerto, usePerto } from '../lib/perto';
import { TituloSecao } from './Cadarco';
import { Trilho } from './Trilho';

/** Os modelos que entraram por último no catálogo do fornecedor, com o dia em que entraram. */
export function Novidades({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const raiz = useRef<HTMLElement>(null);
  const perto = usePerto(raiz);
  const fotos = useFotosPerto(raiz);

  useGSAP(
    () => {
      if (!perto || reduzMovimento()) return;
      const cartoes = gsap.utils.toArray<HTMLElement>('.novo', raiz.current);
      gsap.set(cartoes, { autoAlpha: 0, x: 70, rotation: 1.5 });
      ScrollTrigger.create({
        trigger: raiz.current!.querySelector('.trilho'),
        start: 'top 85%',
        once: true,
        onEnter: () => gsap.to(cartoes, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }),
      });
    },
    { scope: raiz, dependencies: [perto] },
  );

  if (!novidades.length) return null;

  return (
    <section className="secao secao--novidades" ref={raiz} aria-labelledby="novidades-titulo">
      <div className="secao__miolo">
        <TituloSecao id="novidades-titulo" sub="Os modelos que entraram por último no catálogo, do mais novo para o mais antigo.">
          Chegaram agora
        </TituloSecao>
      </div>
      <Trilho rotulo="Novidades" className="trilho--novidades">
        {novidades.map((t) => (
          <button key={t.id} type="button" className="novo" data-item onClick={() => aoAbrir(t.id)} aria-label={`Ver ${descricaoAlt(t)}`}>
            <span className="novo__foto" style={{ background: t.bg }}>
              {fotos ? (
                <img
                  src={fotoPadrao(t, 400)}
                  srcSet={srcset(t)}
                  sizes="(max-width: 767px) 66vw, 300px"
                  width={t.w}
                  height={t.h}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
              ) : null}
              {t.desde ? <span className="novo__data">Entrou em {diaMes(t.desde)}</span> : null}
            </span>
            <span className="novo__marca">{t.marca === 'Personagens' ? 'Infantil' : t.marca}</span>
            <span className="novo__modelo">{t.modelo}</span>
            <span className="novo__cor">{t.cor}</span>
          </button>
        ))}
      </Trilho>
    </section>
  );
}
