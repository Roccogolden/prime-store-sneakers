import { fotoPadrao, nomeCompleto, porId } from '../lib/catalogo';
import type { Dados, Venda } from './api';
import { Barras } from './Barras';
import { brl, dataBr, diaDaSemana, diaMes, plural } from './datas';

// Resumo do período: os números grandes, visitas e chamadas por dia, os tênis que mais pedem e veem, de onde vêm as
// visitas e o que procuraram sem achar. O mesmo componente monta o relatório impresso (impresso = true).

const ORIGENS: Record<string, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  qr: 'Cartão (QR code)',
  direto: 'Direto',
  outros: 'Outros sites',
};

const LARGURA_IMPRESSA = 640; // cabe no A4 com as margens; o SVG ainda se ajusta à largura da folha

function Numero({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota: string; destaque?: boolean }) {
  return (
    <div className={destaque ? 'pn-numero pn-numero--destaque' : 'pn-numero'}>
      <p className="pn-numero__rotulo">{rotulo}</p>
      <p className="pn-numero__valor">{valor}</p>
      <p className="pn-numero__nota">{nota}</p>
    </div>
  );
}

export function Miniatura({ id, ja }: { id: string; ja?: boolean }) {
  const t = id ? porId.get(id) : undefined;
  if (!t) return <span className="pn-mini pn-mini--vazia" aria-hidden="true" />;
  return <img className="pn-mini" src={fotoPadrao(t, 120)} alt="" width={56} height={56} loading={ja ? 'eager' : 'lazy'} decoding="async" />;
}

export function nomeDoTenis(id: string) {
  const t = porId.get(id);
  return t ? nomeCompleto(t) : 'Tênis que saiu do catálogo';
}

function numeracoesPedidas(nums: Record<string, number>) {
  const lista = Object.entries(nums).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!lista.length) return 'sem numeração escolhida';
  return `Nº ${lista.map(([num, n]) => (n > 1 ? `${num} (${n})` : num)).join(' · ')}`;
}

function ListaTenis({
  titulo,
  nota,
  itens,
  contar,
  vazio,
  impresso,
}: {
  titulo: string;
  nota: string;
  itens: { id: string; n: number; nums?: Record<string, number> }[];
  contar: (n: number) => string;
  vazio: string;
  impresso?: boolean;
}) {
  const lista = impresso ? itens.slice(0, 8) : itens;
  return (
    <section className="pn-cartao">
      <div className="pn-cartao__topo">
        <div>
          <h2>{titulo}</h2>
          <p className="pn-cartao__nota">{nota}</p>
        </div>
      </div>
      {lista.length === 0 ? (
        <p className="pn-vazio">{vazio}</p>
      ) : (
        <ol className="pn-tenis">
          {lista.map((i) => {
            const t = porId.get(i.id);
            const conteudo = (
              <>
                <Miniatura id={i.id} ja={impresso} />
                <span className="pn-tenis__info">
                  <strong>{nomeDoTenis(i.id)}</strong>
                  <span>{t ? t.cor : i.id}</span>
                  {i.nums && <span className="pn-tenis__nums">{numeracoesPedidas(i.nums)}</span>}
                </span>
                <span className="pn-tenis__n">{contar(i.n)}</span>
              </>
            );
            return (
              <li key={i.id}>
                {t && !impresso ? (
                  <a className="pn-tenis__linha" href={`/?m=${i.id}`} target="_blank" rel="noopener" title="Abrir no site">
                    {conteudo}
                  </a>
                ) : (
                  <div className="pn-tenis__linha">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ListaBarras({ titulo, nota, itens, vazio, rodape }: { titulo: string; nota: string; itens: { nome: string; n: number; extra?: string }[]; vazio: string; rodape?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <section className="pn-cartao">
      <div className="pn-cartao__topo">
        <div>
          <h2>{titulo}</h2>
          <p className="pn-cartao__nota">{nota}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <p className="pn-vazio">{vazio}</p>
      ) : (
        <ul className="pn-barras">
          {itens.map((i) => (
            <li key={i.nome}>
              <span className="pn-barras__nome">{i.nome}</span>
              <span className="pn-barras__n">
                {i.n.toLocaleString('pt-BR')}
                {i.extra && <small> {i.extra}</small>}
              </span>
              <span className="pn-barras__trilho" aria-hidden="true">
                <i style={{ width: `${Math.max(2, (i.n / max) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {rodape && <p className="pn-cartao__rodape">{rodape}</p>}
    </section>
  );
}

export function TabelaVendas({ vendas }: { vendas: Venda[] }) {
  const total = vendas.reduce((a, v) => a + (v.valor ?? 0), 0);
  return (
    <section className="pn-cartao">
      <div className="pn-cartao__topo">
        <div>
          <h2>Vendas anotadas</h2>
          <p className="pn-cartao__nota">
            {plural(vendas.length, 'venda', 'vendas')}
            {total > 0 && ` · ${brl(total)}`}
          </p>
        </div>
      </div>
      {vendas.length === 0 ? (
        <p className="pn-vazio">Nenhuma venda anotada neste período.</p>
      ) : (
        <table className="pn-tabela pn-tabela--vendas">
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">O que saiu</th>
              <th scope="col">Nº</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id}>
                <td>{dataBr(v.dia)}</td>
                <td>
                  {v.tenis ? nomeDoTenis(v.tenis) : v.obs}
                  {v.tenis && v.obs && <small> · {v.obs}</small>}
                </td>
                <td>{v.num || '—'}</td>
                <td>{v.valor === null ? '—' : brl(v.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function Resumo({ dados, impresso }: { dados: Dados; impresso?: boolean }) {
  const t = dados.totais;
  const largura = impresso ? LARGURA_IMPRESSA : undefined;
  const porCem = t.visitantes ? Math.round((t.pedidos / t.visitantes) * 100) : 0;
  const melhor = dados.porDia.reduce<(typeof dados.porDia)[number] | null>((m, d) => (d.visitas > (m?.visitas ?? 0) ? d : m), null);
  const melhorPedidos = dados.porDia.reduce<(typeof dados.porDia)[number] | null>((m, d) => (d.pedidos > (m?.pedidos ?? 0) ? d : m), null);
  const totalOrigens = dados.origens.reduce((a, [, n]) => a + n, 0);

  return (
    <div className="pn-resumo">
      <section aria-label="Números do período" className="pn-numeros">
        <Numero
          destaque
          rotulo="Chamadas no WhatsApp"
          valor={t.pedidos.toLocaleString('pt-BR')}
          nota={t.visitantes ? `${porCem} para cada 100 visitantes` : 'toques nos botões do WhatsApp'}
        />
        <Numero rotulo="Visitas" valor={t.visitas.toLocaleString('pt-BR')} nota="vezes que o site foi aberto" />
        <Numero rotulo="Visitantes" valor={t.visitantes.toLocaleString('pt-BR')} nota="cada pessoa conta 1 vez por dia" />
        <Numero rotulo="Sacolas enviadas" valor={t.sacolas.toLocaleString('pt-BR')} nota={t.sacolas ? plural(t.pares, 'par', 'pares') + ' no total' : 'vários pares numa mensagem'} />
        <Numero rotulo="Vendas anotadas" valor={t.vendas.toLocaleString('pt-BR')} nota={t.valor ? brl(t.valor) : impresso ? 'anotadas no painel' : 'anote na aba Vendas'} />
      </section>

      {t.visitas === 0 && t.pedidos === 0 && (
        <p className="pn-aviso">Ainda não há visitas contadas neste período. A contagem começa quando o painel é ligado ao banco de dados.</p>
      )}

      <Barras
        titulo="Visitas por dia"
        larguraFixa={largura}
        pontos={dados.porDia.map((d) => ({ dia: d.dia, valor: d.visitas, extra: d.unicos }))}
        principal={{ rotulo: 'Visitas', unidade: (n) => plural(n, 'visita', 'visitas') }}
        extra={{ rotulo: 'Visitantes', unidade: (n) => plural(n, 'visitante', 'visitantes') }}
        resumo={melhor ? `Melhor dia: ${diaDaSemana(melhor.dia)}, ${diaMes(melhor.dia)}, com ${plural(melhor.visitas, 'visita', 'visitas')}` : 'Nenhuma visita contada ainda'}
      />
      <Barras
        titulo="Chamadas no WhatsApp por dia"
        larguraFixa={largura}
        pontos={dados.porDia.map((d) => ({ dia: d.dia, valor: d.pedidos }))}
        principal={{ rotulo: 'Chamadas', unidade: (n) => plural(n, 'chamada', 'chamadas') }}
        resumo={
          t.pedidos
            ? `${plural(t.pedidos - t.pedidosGerais, 'pedido', 'pedidos')} de um tênis · ${plural(t.pedidosGerais, 'chamada geral', 'chamadas gerais')}${melhorPedidos ? ` · melhor dia ${diaMes(melhorPedidos.dia)}` : ''}`
            : 'Nenhuma chamada contada ainda'
        }
      />

      <div className="pn-duas">
        <ListaTenis
          titulo="Mais pedidos no WhatsApp"
          nota="Tênis que as pessoas mandaram para você, com as numerações pedidas"
          itens={dados.tenisPedidos}
          contar={(n) => plural(n, 'pedido', 'pedidos')}
          vazio="Nenhum pedido de tênis neste período."
          impresso={impresso}
        />
        <ListaTenis
          titulo="Mais vistos no site"
          nota="Tênis que as pessoas abriram para ver de perto"
          itens={dados.tenisVistos}
          contar={(n) => plural(n, 'vez', 'vezes')}
          vazio="Nenhum tênis aberto neste período."
          impresso={impresso}
        />
      </div>

      <div className="pn-duas">
        <ListaBarras
          titulo="De onde vêm as visitas"
          nota="Pelo link ou pelo site que trouxe a pessoa"
          itens={dados.origens.map(([o, n]) => ({ nome: ORIGENS[o] ?? o, n, extra: totalOrigens ? `(${Math.round((n / totalOrigens) * 100)}%)` : undefined }))}
          vazio="Nenhuma visita contada neste período."
          rodape="Direto: link digitado, salvo ou aberto por um aplicativo que não diz de onde veio. Os links do kit de divulgação já dizem a origem (WhatsApp, Instagram e o cartão com QR code)."
        />
        <ListaBarras
          titulo="Procuraram e não acharam"
          nota="Buscas do catálogo que não deram nenhum tênis"
          itens={(impresso ? dados.buscas.slice(0, 10) : dados.buscas).map((b) => ({ nome: `“${b.termo}”`, n: b.n }))}
          vazio="Nenhuma busca sem resultado neste período."
          rodape="Pode ser um modelo que falta no catálogo ou que está nele com outro nome."
        />
      </div>

      {impresso && <TabelaVendas vendas={dados.vendas} />}
    </div>
  );
}
