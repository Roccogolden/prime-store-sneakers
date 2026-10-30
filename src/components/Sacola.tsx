import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, reduzMovimento, ehCelular, travarPagina } from '../lib/gsap';
import { descricaoAlt, fotoPadrao, porId } from '../lib/catalogo';
import { loja, whatsappLink } from '../lib/loja';
import { mensagemDaSacola, type ItemSacola } from '../lib/sacola';
import { IconeFechar, IconeWhatsapp } from './Icones';

interface Props {
  itens: ItemSacola[];
  aoRemover: (id: string) => void;
  aoDefinirNum: (id: string, num: string) => void;
  aoLimpar: () => void;
  aoFechar: () => void;
  aoVerCatalogo: () => void;
}

/** Gaveta com os pares separados. O botão final manda tudo numa mensagem só para o WhatsApp do Robson. */
export function Sacola({ itens, aoRemover, aoDefinirNum, aoLimpar, aoFechar, aoVerCatalogo }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const saindo = useRef(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const n = itens.length;

  // Entrada: no celular sobe como gaveta (igual ao detalhe do tênis); no computador entra pela direita
  const { contextSafe } = useGSAP(
    () => {
      fechar.current?.focus({ preventScroll: true });
      if (reduzMovimento()) return;
      const q = gsap.utils.selector(raiz);
      gsap.from(q('.sacola__fundo'), { autoAlpha: 0, duration: 0.3, ease: 'power1.out' });
      if (ehCelular()) gsap.from(painel.current, { yPercent: 100, duration: 0.55, ease: 'power4.out' });
      else gsap.from(painel.current, { xPercent: 100, duration: 0.5, ease: 'power4.out' });
      gsap.from(q('.sacola__item, .sacola__vazia, .sacola__pe'), { y: 18, autoAlpha: 0, duration: 0.4, stagger: 0.04, delay: 0.12 });
    },
    { scope: raiz },
  );

  // Trava a página atrás da gaveta; ao fechar, o foco volta para quem abriu a sacola
  // (aberta de dentro do detalhe, que já saiu, ele vai para o botão da sacola no topo)
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const soltar = travarPagina();
    return () => {
      soltar();
      const volta = antes?.isConnected ? antes : document.querySelector<HTMLElement>('.cabecalho__sacola');
      volta?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!confirmarLimpar) return;
    const t = setTimeout(() => setConfirmarLimpar(false), 3500);
    return () => clearTimeout(t);
  }, [confirmarLimpar]);

  const sair = contextSafe((depois?: () => void) => {
    if (saindo.current) return;
    saindo.current = true;
    const fim = () => {
      aoFechar();
      depois?.();
    };
    if (reduzMovimento()) return fim();
    const tl = gsap.timeline({ onComplete: fim });
    tl.to(raiz.current!.querySelector('.sacola__fundo'), { autoAlpha: 0, duration: 0.25 }, 0);
    if (ehCelular()) tl.to(painel.current, { yPercent: 100, duration: 0.35, ease: 'power3.in' }, 0);
    else tl.to(painel.current, { xPercent: 100, duration: 0.32, ease: 'power3.in' }, 0);
  });

  // O par sai recolhendo para o lado; a lista fecha o espaço junto
  const tirar = contextSafe((id: string, li: HTMLElement) => {
    if (reduzMovimento()) return aoRemover(id);
    gsap
      .timeline({ onComplete: () => aoRemover(id) })
      .to(li, { x: 40, autoAlpha: 0, duration: 0.22, ease: 'power2.in' })
      .to(li, { height: 0, paddingTop: 0, paddingBottom: 0, borderBottomWidth: 0, duration: 0.25, ease: 'power2.inOut' });
  });

  // Teclado: Esc fecha e Tab fica dentro da gaveta
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        sair();
      } else if (e.key === 'Tab') {
        const focaveis = painel.current!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select');
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

  return (
    <div className="sacola" ref={raiz}>
      <div className="sacola__fundo" onClick={() => sair()} aria-hidden="true" />
      <div className="sacola__painel" ref={painel} role="dialog" aria-modal="true" aria-labelledby="sacola-titulo">
        <div className="sacola__topo">
          <h2 id="sacola-titulo">
            Sua sacola <small>{n === 1 ? '1 par' : `${n} pares`}</small>
          </h2>
          <button type="button" className="btn-redondo" ref={fechar} onClick={() => sair()} aria-label="Fechar a sacola">
            <IconeFechar width={20} height={20} />
          </button>
        </div>

        {n === 0 ? (
          <div className="sacola__vazia">
            <p className="sacola__vazia-titulo">A sacola está vazia</p>
            <p>Abra um tênis do catálogo e toque em “Pôr na sacola” para separar quantos pares quiser.</p>
            <button type="button" className="btn btn--contorno" onClick={() => sair(aoVerCatalogo)}>
              Ver o catálogo
            </button>
          </div>
        ) : (
          <ul className="sacola__lista" data-lenis-prevent>
            {itens.map((it) => {
              const t = porId.get(it.id);
              if (!t) return null;
              const marca = t.marca === 'Personagens' ? 'Infantil' : t.marca;
              return (
                <li key={it.id} className="sacola__item">
                  <span className="sacola__foto" style={{ background: t.bg }}>
                    <img src={fotoPadrao(t, 400)} width={t.w} height={t.h} alt="" loading="lazy" draggable={false} />
                  </span>
                  <div className="sacola__dados">
                    <p className="sacola__marca">{marca}</p>
                    <p className="sacola__nome">{t.modelo}</p>
                    <p className="sacola__cor">{t.cor}</p>
                    <label className="sacola__num">
                      <span>Numeração</span>
                      <select value={it.num} onChange={(e) => aoDefinirNum(it.id, e.target.value)}>
                        <option value="">a combinar</option>
                        {t.nums.map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn-redondo sacola__tirar"
                    aria-label={`Tirar da sacola: ${descricaoAlt(t)}`}
                    onClick={(e) => tirar(it.id, e.currentTarget.closest('li')!)}
                  >
                    <IconeFechar width={16} height={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {n > 0 ? (
          <div className="sacola__pe">
            <p className="sacola__nota">
              Sem pagamento no site: o {loja.atendente} confirma numeração, valor e entrega na conversa.
            </p>
            <a className="btn btn--ouro btn--grande btn--bloco" href={whatsappLink(mensagemDaSacola(itens))} target="_blank" rel="noopener">
              <IconeWhatsapp width={20} height={20} /> Enviar para o {loja.atendente}
            </a>
            <button
              type="button"
              className="link-ouro sacola__limpar"
              onClick={() => {
                if (!confirmarLimpar) return setConfirmarLimpar(true);
                setConfirmarLimpar(false);
                aoLimpar();
              }}
            >
              {confirmarLimpar ? 'Toque de novo para esvaziar' : 'Esvaziar a sacola'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
