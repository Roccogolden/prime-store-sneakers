import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, useGSAP, reduzMovimento, ehCelular, travarPagina } from '../lib/gsap';
import {
  atualizadoEm,
  dataCurta,
  descricaoAlt,
  fotoPadrao,
  fundoDesfocado,
  itens,
  linkDoTenis,
  mensagemDoTenis,
  nomeCompleto,
  porId,
  srcset,
  type Tenis,
} from '../lib/catalogo';
import { loja, whatsappLink } from '../lib/loja';
import { IconeAnterior, IconeBusca, IconeCerto, IconeCompartilhar, IconeFechar, IconeProximo, IconeSacola, IconeWhatsapp } from './Icones';
import { Trilho } from './Trilho';

interface Props {
  id: string;
  /** Lista em que as setas navegam (a filtrada, se o tênis estiver nela). */
  sequencia: Tenis[];
  numPreferida: string;
  aoTrocar: (id: string) => void;
  aoFechar: () => void;
  /** Numeração guardada na sacola, se este tênis estiver nela ('' = a combinar); null se não estiver. */
  numNaSacola: string | null;
  totalSacola: number;
  sacolaCheia: boolean;
  aoAlternarSacola: (id: string, num: string) => void;
  aoDefinirNumSacola: (id: string, num: string) => void;
  aoAbrirSacola: () => void;
}

export function Detalhe({
  id,
  sequencia,
  numPreferida,
  aoTrocar,
  aoFechar,
  numNaSacola,
  totalSacola,
  sacolaCheia,
  aoAlternarSacola,
  aoDefinirNumSacola,
  aoAbrirSacola,
}: Props) {
  const t = porId.get(id)!;
  const raiz = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLImageElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const iconeSacola = useRef<HTMLSpanElement>(null);
  const saindo = useRef(false);
  const naSacola = numNaSacola !== null;
  const [num, setNum] = useState(numNaSacola ?? (t.nums.includes(numPreferida) ? numPreferida : t.nums.length === 1 ? t.nums[0] : ''));
  const [aviso, setAviso] = useState('');

  const lista = sequencia.some((x) => x.id === id) ? sequencia : itens;
  const pos = lista.findIndex((x) => x.id === id);
  const anteriorT = lista[(pos - 1 + lista.length) % lista.length];
  const proximoT = lista[(pos + 1) % lista.length];
  const parecidos = itens.filter((x) => x.id !== id && x.marca === t.marca && x.modelo === t.modelo).slice(0, 10);

  // Ao trocar de tênis, a numeração escolhida continua se ele tiver; se ele já está na sacola, vale a de lá
  useEffect(() => {
    setNum(
      (atual) =>
        numNaSacola ?? (t.nums.includes(atual) ? atual : t.nums.includes(numPreferida) ? numPreferida : t.nums.length === 1 ? t.nums[0] : ''),
    );
  }, [t, numPreferida, numNaSacola]);

  function escolherNum(n: string) {
    const nova = num === n ? '' : n;
    setNum(nova);
    if (naSacola) aoDefinirNumSacola(t.id, nova);
  }

  // Entrada: no celular sobe como gaveta; no computador cresce no centro
  const { contextSafe } = useGSAP(
    () => {
      fechar.current?.focus({ preventScroll: true });
      if (reduzMovimento()) return;
      gsap.from(raiz.current!.querySelector('.detalhe__fundo'), { autoAlpha: 0, duration: 0.3, ease: 'power1.out' });
      if (ehCelular()) gsap.from(painel.current, { yPercent: 100, duration: 0.55, ease: 'power4.out' });
      else gsap.from(painel.current, { y: 36, scale: 0.96, autoAlpha: 0, duration: 0.45, ease: 'power3.out' });
    },
    { scope: raiz },
  );

  useEffect(() => travarPagina(), []);

  // Troca de foto com uma passagem curta
  useLayoutEffect(() => {
    if (reduzMovimento() || !foto.current) return;
    gsap.fromTo(foto.current, { autoAlpha: 0.2, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    painel.current?.querySelector('.detalhe__rolagem')?.scrollTo({ top: 0 });
  }, [id]);

  function sair() {
    if (saindo.current) return;
    saindo.current = true;
    if (reduzMovimento()) return aoFechar();
    const tl = gsap.timeline({ onComplete: aoFechar });
    tl.to(raiz.current!.querySelector('.detalhe__fundo'), { autoAlpha: 0, duration: 0.25 }, 0);
    if (ehCelular()) tl.to(painel.current, { yPercent: 100, duration: 0.35, ease: 'power3.in' }, 0);
    else tl.to(painel.current, { y: 24, scale: 0.97, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0);
  }

  // Teclado: Esc fecha, setas trocam, Tab fica dentro da janela
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        sair();
      } else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) aoTrocar(anteriorT.id);
      else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) aoTrocar(proximoT.id);
      else if (e.key === 'Tab') {
        const focaveis = painel.current!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  // Deslizar a foto troca de tênis; tocar (ou clicar) amplia, e com a foto ampliada o dedo/mouse passeia por ela
  const toque = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  useEffect(() => setZoom(false), [id]);

  function mirar(e: React.PointerEvent) {
    const el = zoomRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    el.style.transformOrigin = `${x}% ${y}%`;
  }

  function alternarZoom(ligar: boolean, e?: React.PointerEvent) {
    if (ligar && e) mirar(e);
    else if (zoomRef.current) zoomRef.current.style.transformOrigin = '50% 50%';
    setZoom(ligar);
  }

  // O ícone troca (sacola → certo) com um pulo curto
  const alternarSacola = contextSafe(() => {
    aoAlternarSacola(t.id, num);
    if (reduzMovimento() || !iconeSacola.current) return;
    gsap.fromTo(iconeSacola.current, { scale: 0.4, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
  });

  async function compartilhar() {
    const url = linkDoTenis(t);
    const dados = { title: `${nomeCompleto(t)} · ${loja.nome}`, text: `${nomeCompleto(t)}, ${t.cor.toLowerCase()}`, url };
    try {
      if (navigator.share) {
        await navigator.share(dados);
        return;
      }
      await navigator.clipboard.writeText(url);
      setAviso('Link copiado');
    } catch {
      /* compartilhamento cancelado */
    }
    setTimeout(() => setAviso(''), 2200);
  }

  const marca = t.marca === 'Personagens' ? 'Infantil' : t.marca;

  return (
    <div className="detalhe" ref={raiz}>
      <div className="detalhe__fundo" onClick={sair} aria-hidden="true" />
      <div className="detalhe__painel" ref={painel} role="dialog" aria-modal="true" aria-labelledby="detalhe-titulo">
        <div className="detalhe__topo">
          <span className="detalhe__contador">
            {pos + 1} de {lista.length}
          </span>
          <button type="button" className="btn-redondo" ref={fechar} onClick={sair} aria-label="Fechar">
            <IconeFechar width={20} height={20} />
          </button>
        </div>
        <div className="detalhe__rolagem" data-lenis-prevent>
          <figure
            className={`detalhe__foto${zoom ? ' detalhe__foto--zoom' : ''}`}
            style={{ background: fundoDesfocado(t) }}
            onPointerDown={(e) => {
              toque.current = { x: e.clientX, y: e.clientY };
              if (zoom && e.pointerType !== 'mouse') mirar(e);
            }}
            onPointerMove={(e) => {
              if (zoom && (e.pointerType === 'mouse' || toque.current)) mirar(e);
            }}
            onPointerUp={(e) => {
              const ini = toque.current;
              toque.current = null;
              if (!ini || (e.target as HTMLElement).closest('button')) return;
              const dx = e.clientX - ini.x;
              const dy = e.clientY - ini.y;
              if (!zoom && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) aoTrocar(dx < 0 ? proximoT.id : anteriorT.id);
              else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) alternarZoom(!zoom, e);
            }}
          >
            <div className="detalhe__zoom" ref={zoomRef}>
              <img
                ref={foto}
                key={t.id}
                src={fotoPadrao(t, 720)}
                srcSet={srcset(t)}
                sizes="(max-width: 899px) 100vw, 560px"
                width={t.w}
                height={t.h}
                alt={descricaoAlt(t)}
                draggable={false}
              />
            </div>
            <button type="button" className="detalhe__ampliar" onClick={() => alternarZoom(!zoom)} aria-pressed={zoom}>
              <IconeBusca width={16} height={16} /> {zoom ? 'Voltar ao normal' : 'Ampliar'}
            </button>
            <button type="button" className="btn-redondo detalhe__seta detalhe__seta--ant" onClick={() => aoTrocar(anteriorT.id)} aria-label="Tênis anterior">
              <IconeAnterior width={20} height={20} />
            </button>
            <button type="button" className="btn-redondo detalhe__seta detalhe__seta--prox" onClick={() => aoTrocar(proximoT.id)} aria-label="Próximo tênis">
              <IconeProximo width={20} height={20} />
            </button>
          </figure>

          <div className="detalhe__info">
            <p className="detalhe__marca">{marca}</p>
            <h2 id="detalhe-titulo" className="detalhe__titulo">
              {t.modelo}
            </h2>
            <p className="detalhe__cor">{t.cor}</p>

            <fieldset className="detalhe__nums">
              <legend>Numerações no catálogo</legend>
              <div className="detalhe__chips">
                {t.nums.map((n) => (
                  <button key={n} type="button" className="chip chip--num" aria-pressed={num === n} onClick={() => escolherNum(n)}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="detalhe__dica">{num ? `Numeração ${num} vai na mensagem.` : 'Toque na sua numeração para ela ir na mensagem.'}</p>
            </fieldset>

            <div className="detalhe__acao">
              <a className="btn btn--ouro btn--grande btn--bloco" href={whatsappLink(mensagemDoTenis(t, num || undefined))} target="_blank" rel="noopener">
                <IconeWhatsapp width={20} height={20} /> Pedir no WhatsApp
              </a>
            </div>
            <div className="detalhe__botoes">
              <button
                type="button"
                className={`btn btn--contorno${naSacola ? ' btn--marcado' : ''}`}
                aria-pressed={naSacola}
                disabled={!naSacola && sacolaCheia}
                onClick={alternarSacola}
              >
                <span className="detalhe__icone-sacola" ref={iconeSacola}>
                  {naSacola ? <IconeCerto width={18} height={18} /> : <IconeSacola width={18} height={18} />}
                </span>
                {naSacola ? 'Na sacola' : 'Pôr na sacola'}
              </button>
              <button type="button" className="btn btn--contorno" onClick={compartilhar}>
                <IconeCompartilhar width={18} height={18} /> {aviso || 'Compartilhar'}
              </button>
            </div>
            {totalSacola > 0 ? (
              <p className="detalhe__sacola">
                {totalSacola === 1 ? '1 par na sacola' : `${totalSacola} pares na sacola`}
                {' · '}
                <button type="button" className="link-ouro" onClick={aoAbrirSacola}>
                  Ver a sacola
                </button>
              </p>
            ) : null}

            <p className="detalhe__nota">
              Foto e numerações do catálogo de {dataCurta(atualizadoEm)}. O {loja.atendente} confirma a disponibilidade, o pagamento e a entrega na conversa.
            </p>

            {parecidos.length ? (
              <div className="detalhe__parecidos">
                <p className="filtros__rotulo">Mais {nomeCompleto(t)}</p>
                <Trilho rotulo="Modelos parecidos" setas="pequenas" className="trilho--parecidos" chave={t.id}>
                  {parecidos.map((p) => (
                    <button key={p.id} type="button" className="mini" data-item onClick={() => aoTrocar(p.id)} aria-label={`Ver ${descricaoAlt(p)}`}>
                      <span className="mini__foto" style={{ background: p.bg }}>
                        <img src={fotoPadrao(p, 400)} width={p.w} height={p.h} alt="" loading="lazy" draggable={false} />
                      </span>
                      <span className="mini__cor">{p.cor}</span>
                    </button>
                  ))}
                </Trilho>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
