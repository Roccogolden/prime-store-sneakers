import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, reduzMovimento } from '../lib/gsap';
import { usePerto } from '../lib/perto';
import { marcas, porId, srcset, fotoPadrao, totalChuteiras, totalInfantil, type Linha } from '../lib/catalogo';
import { TituloSecao } from './Cadarco';
import { Trilho } from './Trilho';

/** Foto que representa cada marca na faixa (escolhida entre as mais nítidas do catálogo). */
const CAPAS: Record<string, string> = {
  nike: 'p045',
  adidas: 'p184',
  'new-balance': 'p082',
  mizuno: 'p142',
  puma: 'p001',
  'louis-vuitton': 'p067',
  fila: 'p093',
  'hugo-boss': 'p183',
  lacoste: 'p361',
  oakley: 'p323',
  olympikus: 'p202',
  headers: 'p577',
  umbro: 'p040',
  vans: 'p060',
  prada: 'p472',
  converse: 'p400',
};

const COLECOES: { linha: Linha; nome: string; total: number; capa: string }[] = [
  { linha: 'chuteiras', nome: 'Chuteiras', total: totalChuteiras, capa: 'p330' },
  { linha: 'infantil', nome: 'Infantil', total: totalInfantil, capa: 'p406' },
];

function Cartao({ capa, nome, total, onClick }: { capa: string; nome: string; total: number; onClick: () => void }) {
  const t = porId.get(capa)!;
  return (
    <button type="button" className="marca-cartao" data-item onClick={onClick} aria-label={`${nome}: ${total} modelos`}>
      <span className="marca-cartao__foto" style={{ background: t.bg }}>
        <img src={fotoPadrao(t, 400)} srcSet={srcset(t)} sizes="(max-width: 767px) 62vw, 280px" width={t.w} height={t.h} alt="" loading="lazy" draggable={false} />
      </span>
      <span className="marca-cartao__nome">{nome}</span>
      <span className="marca-cartao__total">{total} modelos</span>
    </button>
  );
}

interface Props {
  aoEscolherMarca: (marca: string) => void;
  aoEscolherLinha: (linha: Linha) => void;
}

export function Marcas({ aoEscolherMarca, aoEscolherLinha }: Props) {
  const raiz = useRef<HTMLElement>(null);
  const lista = marcas.filter((m) => CAPAS[m.slug]);
  const perto = usePerto(raiz);

  useGSAP(
    () => {
      if (!perto || reduzMovimento()) return;
      const cartoes = gsap.utils.toArray<HTMLElement>('.marca-cartao', raiz.current);
      gsap.set(cartoes, { autoAlpha: 0, x: 60, rotation: 2 });
      ScrollTrigger.create({
        trigger: raiz.current!.querySelector('.trilho'),
        start: 'top 85%',
        once: true,
        onEnter: () =>
          gsap.to(cartoes, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }),
      });
    },
    { scope: raiz, dependencies: [perto] },
  );

  return (
    <section className="secao secao--marcas" id="marcas" ref={raiz} aria-labelledby="marcas-titulo">
      <div className="secao__miolo">
        <TituloSecao id="marcas-titulo" sub="Toque na marca e o catálogo já abre filtrado.">
          Escolha pela marca
        </TituloSecao>
      </div>
      <Trilho rotulo="Marcas" className="trilho--marcas">
        {lista.map((m) => (
          <Cartao key={m.slug} capa={CAPAS[m.slug]} nome={m.nome} total={m.total} onClick={() => aoEscolherMarca(m.slug)} />
        ))}
        {COLECOES.map((c) => (
          <Cartao key={c.linha} capa={c.capa} nome={c.nome} total={c.total} onClick={() => aoEscolherLinha(c.linha)} />
        ))}
      </Trilho>
    </section>
  );
}
