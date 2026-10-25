import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, Flip, ScrollTrigger, reduzMovimento, rolarPara } from '../lib/gsap';
import {
  atualizadoEm,
  dataCurta,
  filtrar,
  itens,
  marcas,
  modelosDaMarca,
  numeracoes,
  NUMERACOES_ADULTAS,
  slug,
  type Filtro,
  type Linha,
  type Tenis,
} from '../lib/catalogo';
import { loja, whatsappLink, mensagemGeral } from '../lib/loja';
import { CartaoTenis } from './CartaoTenis';
import { TituloSecao } from './Cadarco';
import { Trilho } from './Trilho';
import { IconeBusca, IconeFechar, IconeWhatsapp } from './Icones';

const POR_PAGINA = 24;

// Tamanhos adultos primeiro (são a maioria); os infantis vêm depois, separados
const ORDEM_NUMS = [...NUMERACOES_ADULTAS, ...numeracoes.filter((n) => !NUMERACOES_ADULTAS.includes(n))];
const PRIMEIRA_INFANTIL = ORDEM_NUMS[NUMERACOES_ADULTAS.length];

const LINHAS: { valor: Linha; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Tudo' },
  { valor: 'tenis', rotulo: 'Tênis' },
  { valor: 'chuteiras', rotulo: 'Chuteiras' },
  { valor: 'infantil', rotulo: 'Infantil' },
];

// Quem muda o filtro chama prepararFlip() antes, para os cartões que ficam deslizarem até o lugar novo.
let gradeAtual: HTMLElement | null = null;
let estadoFlip: Flip.FlipState | null = null;
export function prepararFlip() {
  if (!gradeAtual || reduzMovimento()) return;
  estadoFlip = Flip.getState(gradeAtual.querySelectorAll('.cartao'));
}

function contarPor(lista: Tenis[], chave: (t: Tenis) => string[]) {
  const mapa = new Map<string, number>();
  for (const t of lista) for (const k of chave(t)) mapa.set(k, (mapa.get(k) ?? 0) + 1);
  return mapa;
}

function passaLinha(t: Tenis, linha: Linha) {
  if (linha === 'chuteiras') return t.tipo === 'chuteira';
  if (linha === 'tenis') return t.tipo !== 'chuteira' && !t.infantil;
  if (linha === 'infantil') return t.infantil;
  return true;
}

interface Props {
  filtro: Filtro;
  lista: Tenis[];
  aoFiltrar: (parcial: Partial<Filtro>) => void;
  aoAbrir: (id: string) => void;
}

export function Catalogo({ filtro, lista, aoFiltrar, aoAbrir }: Props) {
  const raiz = useRef<HTMLElement>(null);
  const grade = useRef<HTMLUListElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState(filtro.busca);
  const [barraVisivel, setBarraVisivel] = useState(false);

  // "Ver mais" volta a 24 sempre que o filtro muda
  const chave = `${filtro.linha}|${filtro.marca}|${filtro.modelo}|${filtro.num}|${filtro.busca}`;
  const [pagina, setPagina] = useState({ chave, n: POR_PAGINA });
  const limite = pagina.chave === chave ? pagina.n : POR_PAGINA;
  const visiveis = lista.slice(0, limite);
  const anterior = useRef(limite);

  // Contagens de cada opção considerando os outros filtros
  const contagens = useMemo(() => {
    const semLinha = filtrar({ ...filtro, linha: 'todos' });
    const semMarca = filtrar({ ...filtro, marca: '', modelo: '' });
    const semModelo = filtrar({ ...filtro, modelo: '' });
    const semNum = filtrar({ ...filtro, num: '' });
    return {
      linhas: new Map(LINHAS.map((l) => [l.valor, semLinha.filter((t) => passaLinha(t, l.valor)).length])),
      marcas: contarPor(semMarca, (t) => [slug(t.marca)]),
      modelos: contarPor(semModelo, (t) => [slug(t.modelo)]),
      nums: contarPor(semNum, (t) => t.nums),
    };
  }, [filtro]);

  const modelos = filtro.marca ? modelosDaMarca(filtro.marca) : [];
  const nomeMarca = marcas.find((m) => m.slug === filtro.marca)?.nome;

  // Busca com pequena espera enquanto digita
  useEffect(() => setBusca(filtro.busca), [filtro.busca]);
  useEffect(() => {
    if (busca === filtro.busca) return;
    const id = setTimeout(() => aoFiltrar({ busca }), 220);
    return () => clearTimeout(id);
  }, [busca, filtro.busca, aoFiltrar]);

  useEffect(() => {
    gradeAtual = grade.current;
    return () => {
      gradeAtual = null;
    };
  }, []);

  // Filtro mudou: os cartões que ficam deslizam, os novos sobem
  useLayoutEffect(() => {
    const cartoes = grade.current!.querySelectorAll<HTMLElement>('.cartao');
    if (estadoFlip) {
      const estado = estadoFlip;
      estadoFlip = null;
      Flip.from(estado, {
        targets: cartoes,
        duration: 0.55,
        ease: 'power3.inOut',
        simple: true,
        prune: true,
        onEnter: (novos) =>
          gsap.fromTo(novos, { autoAlpha: 0, y: 28, rotation: -2 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.5, stagger: 0.025, delay: 0.1 }),
      });
    }
    ScrollTrigger.refresh();
  }, [chave]);

  // "Ver mais": só os cartões novos entram
  useLayoutEffect(() => {
    const antes = anterior.current;
    anterior.current = limite;
    if (limite <= antes || reduzMovimento() || pagina.chave !== chave) return;
    const novos = [...grade.current!.querySelectorAll<HTMLElement>('.cartao')].slice(antes);
    gsap.fromTo(novos, { autoAlpha: 0, y: 36, rotation: -2 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.55, stagger: 0.03 });
    ScrollTrigger.refresh();
  }, [limite, chave, pagina.chave]);

  // Entrada da primeira leva, em lotes, conforme aparece
  useGSAP(
    () => {
      if (reduzMovimento()) return;
      const cartoes = gsap.utils.toArray<HTMLElement>('.cartao', grade.current);
      gsap.set(cartoes, { autoAlpha: 0, y: 36, rotation: -2 });
      ScrollTrigger.batch(cartoes, {
        start: 'top 92%',
        once: true,
        onEnter: (lote) => gsap.to(lote, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.6, stagger: 0.05, overwrite: true }),
      });
    },
    { scope: raiz },
  );

  // Barra de resumo fixa enquanto os filtros estão fora da tela e a grade está nela
  useEffect(() => {
    let painelFora = false;
    let gradeDentro = false;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.target === painel.current) painelFora = !e.isIntersecting && e.boundingClientRect.top < 0;
          else gradeDentro = e.isIntersecting;
        }
        setBarraVisivel(painelFora && gradeDentro);
      },
      { rootMargin: '-72px 0px 0px 0px' },
    );
    io.observe(painel.current!);
    io.observe(grade.current!);
    return () => io.disconnect();
  }, []);

  const resumo = [
    filtro.linha !== 'todos' ? LINHAS.find((l) => l.valor === filtro.linha)?.rotulo : null,
    nomeMarca,
    filtro.modelo ? modelos.find((m) => m.slug === filtro.modelo)?.nome : null,
    filtro.num ? `nº ${filtro.num}` : null,
    filtro.busca ? `“${filtro.busca}”` : null,
  ].filter(Boolean);
  const temFiltro = resumo.length > 0;

  return (
    <section className="secao secao--catalogo" id="catalogo" ref={raiz} aria-labelledby="catalogo-titulo">
      <div className="secao__miolo">
        <TituloSecao
          id="catalogo-titulo"
          sub={
            <>
              {itens.length} modelos, do infantil ao 48. Fotos do catálogo atualizado em {dataCurta(atualizadoEm)}, com lançamentos toda semana.
            </>
          }
        >
          Catálogo completo
        </TituloSecao>

        <div className="filtros" ref={painel}>
          <label className="filtros__busca">
            <IconeBusca width={20} height={20} />
            <span className="visualmente-oculto">Buscar no catálogo</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar marca, modelo ou cor"
              autoComplete="off"
              enterKeyHint="search"
            />
            {busca ? (
              <button type="button" className="filtros__limpar-busca" onClick={() => setBusca('')} aria-label="Limpar busca">
                <IconeFechar width={18} height={18} />
              </button>
            ) : null}
          </label>

          <div className="filtros__linhas" role="group" aria-label="Linha">
            {LINHAS.map((l) => (
              <button
                key={l.valor}
                type="button"
                aria-pressed={filtro.linha === l.valor}
                onClick={() => aoFiltrar({ linha: l.valor })}
                disabled={!contagens.linhas.get(l.valor) && filtro.linha !== l.valor}
              >
                {l.rotulo} <small>{contagens.linhas.get(l.valor) ?? 0}</small>
              </button>
            ))}
          </div>

          <div className="filtros__grupo">
            <p className="filtros__rotulo" id="rot-marca">Marca</p>
            <Trilho rotulo="Marcas para filtrar" setas="pequenas" className="trilho--chips">
              <button type="button" className="chip" data-item aria-pressed={!filtro.marca} onClick={() => aoFiltrar({ marca: '', modelo: '' })}>
                Todas
              </button>
              {marcas.map((m) => {
                const n = contagens.marcas.get(m.slug) ?? 0;
                return (
                  <button
                    key={m.slug}
                    type="button"
                    className="chip"
                    data-item
                    aria-pressed={filtro.marca === m.slug}
                    disabled={n === 0 && filtro.marca !== m.slug}
                    onClick={() => aoFiltrar({ marca: filtro.marca === m.slug ? '' : m.slug, modelo: '' })}
                  >
                    {m.nome === 'Personagens' ? 'Personagens (infantil)' : m.nome} <small>{n}</small>
                  </button>
                );
              })}
            </Trilho>
          </div>

          {modelos.length > 1 ? (
            <div className="filtros__grupo">
              <p className="filtros__rotulo">Modelo {nomeMarca}</p>
              <Trilho rotulo={`Modelos ${nomeMarca ?? ''}`} setas="pequenas" className="trilho--chips" chave={filtro.marca}>
                <button type="button" className="chip" data-item aria-pressed={!filtro.modelo} onClick={() => aoFiltrar({ modelo: '' })}>
                  Todos
                </button>
                {modelos.map((m) => {
                  const n = contagens.modelos.get(m.slug) ?? 0;
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      className="chip"
                      data-item
                      aria-pressed={filtro.modelo === m.slug}
                      disabled={n === 0 && filtro.modelo !== m.slug}
                      onClick={() => aoFiltrar({ modelo: filtro.modelo === m.slug ? '' : m.slug })}
                    >
                      {m.nome} <small>{n}</small>
                    </button>
                  );
                })}
              </Trilho>
            </div>
          ) : null}

          <div className="filtros__grupo">
            <p className="filtros__rotulo">Numeração</p>
            <Trilho rotulo="Numerações" setas="pequenas" className="trilho--chips">
              <button type="button" className="chip" data-item aria-pressed={!filtro.num} onClick={() => aoFiltrar({ num: '' })}>
                Todas
              </button>
              {ORDEM_NUMS.map((n) => {
                const total = contagens.nums.get(n) ?? 0;
                const chip = (
                  <button
                    key={n}
                    type="button"
                    className="chip chip--num"
                    data-item
                    aria-pressed={filtro.num === n}
                    disabled={total === 0 && filtro.num !== n}
                    onClick={() => aoFiltrar({ num: filtro.num === n ? '' : n })}
                    aria-label={`Numeração ${n}: ${total} modelos`}
                  >
                    {n}
                  </button>
                );
                return n === PRIMEIRA_INFANTIL ? [
                  <span key="sep" className="filtros__sep" aria-hidden="true">
                    Infantil
                  </span>,
                  chip,
                ] : chip;
              })}
            </Trilho>
          </div>
        </div>

        <div className="resultado" aria-live="polite">
          <p>
            <strong>{lista.length}</strong> {lista.length === 1 ? 'modelo' : 'modelos'}
            {temFiltro ? <> · {resumo.join(' · ')}</> : null}
          </p>
          {temFiltro ? (
            <button
              type="button"
              className="link-ouro"
              onClick={() => {
                setBusca('');
                aoFiltrar({ linha: 'todos', marca: '', modelo: '', num: '', busca: '' });
              }}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <ul className="grade" ref={grade}>
          {visiveis.map((t, i) => (
            <CartaoTenis key={t.id} t={t} aoAbrir={aoAbrir} prioridade={i < 4} />
          ))}
        </ul>

        {lista.length === 0 ? (
          <div className="vazio">
            <p className="vazio__titulo">Nenhum modelo com esses filtros</p>
            <p>O estoque muda toda semana. Pergunte ao {loja.atendente}: às vezes o seu número chega antes de entrar no catálogo.</p>
            <div className="vazio__botoes">
              <button
                type="button"
                className="btn btn--contorno"
                onClick={() => {
                  setBusca('');
                  aoFiltrar({ linha: 'todos', marca: '', modelo: '', num: '', busca: '' });
                }}
              >
                Limpar filtros
              </button>
              <a className="btn btn--ouro" href={whatsappLink(mensagemGeral)} target="_blank" rel="noopener">
                <IconeWhatsapp width={18} height={18} /> Perguntar no WhatsApp
              </a>
            </div>
          </div>
        ) : null}

        {lista.length > limite ? (
          <div className="ver-mais">
            <button type="button" className="btn btn--contorno btn--grande" onClick={() => setPagina({ chave, n: limite + POR_PAGINA })}>
              Ver mais modelos <small>({lista.length - limite})</small>
            </button>
            <p>
              Mostrando {limite} de {lista.length}
            </p>
          </div>
        ) : null}
      </div>

      <div className={`barra-filtro${barraVisivel ? ' barra-filtro--visivel' : ''}`} aria-hidden={!barraVisivel}>
        <p>
          <strong>{lista.length}</strong> {temFiltro ? resumo.join(' · ') : 'modelos no catálogo'}
        </p>
        <button type="button" className="btn btn--ouro btn--pequeno" tabIndex={barraVisivel ? 0 : -1} onClick={() => rolarPara(painel.current!, -84)}>
          Filtrar
        </button>
      </div>
    </section>
  );
}
