import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { diaDaSemana, diaMes } from './datas';

// Gráfico de barras de uma série só (uma cor, sem legenda: o título diz o que é). Barras finas com a ponta
// arredondada (4 px) presas na base, 2 px entre elas, grade discreta, dica ao passar o mouse ou tocar, setas do
// teclado e a mesma informação em tabela.

export interface Serie {
  rotulo: string;
  unidade: (n: number) => string;
}

export interface Ponto {
  dia: string;
  valor: number;
  extra?: number;
}

interface Props {
  titulo: string;
  pontos: Ponto[];
  principal: Serie;
  /** segunda informação do dia, só na dica e na tabela (não vira outra série no desenho) */
  extra?: Serie;
  resumo?: ReactNode;
  /** largura fixa (relatório impresso): sem medir a tela, sem dica e sem tabela */
  larguraFixa?: number;
}

const ALTURA = 184;
const TOPO = 12;
const BASE = 26;
const ESQ = 36;

function passoBonito(max: number) {
  if (max <= 4) return 1;
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / pot;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pot;
}

function barra(x: number, y: number, w: number, base: number) {
  const r = Math.min(4, w / 2, base - y);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

export function Barras({ titulo, pontos, principal, extra, resumo, larguraFixa }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const largura = larguraFixa ?? medida;

  useLayoutEffect(() => {
    if (larguraFixa || tabela) return;
    const el = caixa.current!;
    const medir = () => setMedida(el.clientWidth);
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    medir();
    return () => ro.disconnect();
  }, [larguraFixa, tabela]);

  // no celular a dica fica até tocar fora do gráfico
  useEffect(() => {
    if (ativo === null) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAtivo(null);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [ativo]);

  const n = pontos.length;
  const max = Math.max(0, ...pontos.map((p) => p.valor));
  const passo = passoBonito(max);
  const teto = max === 0 ? 4 : passo * Math.ceil(max / passo);
  const marcas: number[] = [];
  for (let v = 0; v <= teto; v += passo) marcas.push(v);

  const plotW = Math.max(0, largura - ESQ);
  const plotH = ALTURA - TOPO - BASE;
  const fatia = n ? plotW / n : 0;
  const larg = Math.max(2, Math.min(28, fatia - 2));
  const base = TOPO + plotH;
  const y = (v: number) => base - (v / teto) * plotH;
  const cadaRotulo = Math.max(1, Math.ceil(44 / Math.max(fatia, 1)));
  const interativo = !larguraFixa;

  const escolher = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - ESQ) / fatia);
    setAtivo(i >= 0 && i < n ? i : null);
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setAtivo((a) => Math.min(n - 1, a === null ? n - 1 : a + 1));
    else if (e.key === 'ArrowLeft') setAtivo((a) => Math.max(0, a === null ? n - 1 : a - 1));
    else if (e.key === 'Home') setAtivo(0);
    else if (e.key === 'End') setAtivo(n - 1);
    else if (e.key === 'Escape') setAtivo(null);
    else return;
    e.preventDefault();
  };

  const total = pontos.reduce((a, p) => a + p.valor, 0);
  const descricao = `${titulo}: ${principal.unidade(total)} no período${max ? `, no máximo ${max} num dia` : ''}.`;
  const p = ativo === null ? null : pontos[ativo];

  return (
    <section className="pn-cartao pn-grafico">
      <div className="pn-cartao__topo">
        <div>
          <h2>{titulo}</h2>
          {resumo && <p className="pn-cartao__nota">{resumo}</p>}
        </div>
        {interativo && (
          <button type="button" className="pn-link" aria-pressed={tabela} onClick={() => setTabela((t) => !t)}>
            {tabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        )}
      </div>

      {tabela ? (
        <div className="pn-tabela-rolagem">
          <table className="pn-tabela">
            <caption className="vh">{titulo}</caption>
            <thead>
              <tr>
                <th scope="col">Dia</th>
                <th scope="col">{principal.rotulo}</th>
                {extra && <th scope="col">{extra.rotulo}</th>}
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((d) => (
                <tr key={d.dia}>
                  <th scope="row">
                    {diaDaSemana(d.dia)}, {diaMes(d.dia)}
                  </th>
                  <td>{d.valor}</td>
                  {extra && <td>{d.extra ?? 0}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={caixa}
          className="pn-grafico__caixa"
          tabIndex={interativo ? 0 : undefined}
          aria-label={interativo ? `${descricao} Use as setas para ver cada dia.` : undefined}
          onKeyDown={interativo ? teclas : undefined}
          onBlur={interativo ? () => setAtivo(null) : undefined}
        >
          {largura > 0 && (
            <svg
              width={largura}
              height={ALTURA}
              viewBox={`0 0 ${largura} ${ALTURA}`}
              role="img"
              aria-label={descricao}
              onPointerMove={interativo ? escolher : undefined}
              onPointerDown={interativo ? escolher : undefined}
              onPointerLeave={interativo ? (e) => e.pointerType === 'mouse' && setAtivo(null) : undefined}
            >
              {ativo !== null && <rect className="pn-grafico__faixa" x={ESQ + ativo * fatia} y={TOPO} width={fatia} height={plotH} rx={6} />}
              {marcas.map((v) => (
                <g key={v}>
                  <line className={v === 0 ? 'pn-grafico__eixo' : 'pn-grafico__grade'} x1={ESQ} x2={largura} y1={y(v)} y2={y(v)} />
                  <text className="pn-grafico__rotulo" x={ESQ - 8} y={y(v)} dy="0.32em" textAnchor="end">
                    {v.toLocaleString('pt-BR')}
                  </text>
                </g>
              ))}
              {pontos.map((d, i) =>
                d.valor > 0 ? (
                  <path
                    key={d.dia}
                    className="pn-grafico__barra"
                    data-apagada={ativo !== null && ativo !== i ? '' : undefined}
                    d={barra(ESQ + i * fatia + (fatia - larg) / 2, y(d.valor), larg, base)}
                  />
                ) : null,
              )}
              {pontos.map((d, i) =>
                (n - 1 - i) % cadaRotulo === 0 ? (
                  <text
                    key={`r${d.dia}`}
                    className="pn-grafico__rotulo"
                    x={Math.min(ESQ + i * fatia + fatia / 2, largura - 16)}
                    y={ALTURA - 7}
                    textAnchor="middle"
                  >
                    {diaMes(d.dia)}
                  </text>
                ) : null,
              )}
            </svg>
          )}
          {p && (
            <div className="pn-dica" style={{ left: Math.min(Math.max(ESQ + ativo! * fatia + fatia / 2, 74), largura - 74) }}>
              <strong>
                {diaDaSemana(p.dia)}, {diaMes(p.dia)}
              </strong>
              <span>{principal.unidade(p.valor)}</span>
              {extra && <span className="pn-dica__extra">{extra.unidade(p.extra ?? 0)}</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
