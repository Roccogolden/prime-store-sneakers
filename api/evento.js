// Contador anônimo do site para o painel do Robson. Sem cookie e sem dado pessoal: guarda só contagens por dia.
// O visitante único é um resumo (sha-256) de IP + navegador + um sal sorteado para cada dia e apagado em 2 dias:
// não dá para voltar ao IP nem seguir alguém de um dia para o outro.
import { bancoPronto, diaGoias, rodar } from './_lib/banco.js';
import { mesmaOrigem, resumo, sorteio, ipDe, lerCorpo } from './_lib/seguranca.js';

const VIDA = 60 * 60 * 24 * 400; // as contagens somem sozinhas em ~13 meses
const ROBO = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headlesschrome|python|curl|wget|^whatsapp/i;
const ORIGENS = new Set(['instagram', 'google', 'facebook', 'whatsapp', 'tiktok', 'qr', 'direto', 'outros']);
const ONDE = new Set(['detalhe', 'sacola', 'flutuante', 'fechamento', 'rodape', 'vazio']);

const vazio = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

function termoDaBusca(q) {
  const t = String(q || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} /-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return t.length >= 2 ? t : null;
}

export async function POST(request) {
  if (!bancoPronto() || !mesmaOrigem(request)) return vazio();
  if (ROBO.test(request.headers.get('user-agent') || '')) return vazio();
  const e = await lerCorpo(request);
  const dia = diaGoias();
  const k = (nome) => `ev:${dia}:${nome}`;
  const cmds = [];
  const id = /^p\d{3,4}$/.test(e.id) ? e.id : null;
  const num = /^\d{2}(\/\d{2})?$/.test(e.num) ? e.num : '';

  try {
    if (e.t === 'visita') {
      let [sal] = await rodar([['GET', `sal:${dia}`]]);
      if (!sal) {
        await rodar([['SET', `sal:${dia}`, sorteio(18), 'NX', 'EX', 172800]]);
        [sal] = await rodar([['GET', `sal:${dia}`]]);
      }
      const visitante = resumo(`${ipDe(request)}|${request.headers.get('user-agent') || ''}|${sal}`).slice(0, 24);
      const origem = ORIGENS.has(e.origem) ? e.origem : 'outros';
      cmds.push(['INCR', k('visitas')], ['PFADD', k('unicos'), visitante], ['HINCRBY', k('origem'), origem, 1]);
      cmds.push(['EXPIRE', k('visitas'), VIDA], ['EXPIRE', k('unicos'), VIDA], ['EXPIRE', k('origem'), VIDA]);
    } else if (e.t === 'tenis' && id) {
      cmds.push(['HINCRBY', k('tenis'), id, 1], ['EXPIRE', k('tenis'), VIDA]);
    } else if (e.t === 'whats') {
      // pedido de um tênis (com a numeração escolhida) ou chamada geral (botão flutuante, fechamento…)
      const campo = id ? `${id}|${num}` : `_${ONDE.has(e.onde) ? e.onde : 'flutuante'}`;
      cmds.push(['HINCRBY', k('whats'), campo, 1], ['EXPIRE', k('whats'), VIDA]);
    } else if (e.t === 'sacola') {
      const pares = Math.max(1, Math.min(20, Number(e.n) || 1));
      cmds.push(['INCR', k('sacolas')], ['INCRBY', k('pares'), pares], ['EXPIRE', k('sacolas'), VIDA], ['EXPIRE', k('pares'), VIDA]);
    } else if (e.t === 'busca0') {
      const termo = termoDaBusca(e.q);
      if (termo) cmds.push(['HINCRBY', k('busca0'), termo, 1], ['EXPIRE', k('busca0'), VIDA]);
    }
    if (cmds.length) await rodar(cmds);
  } catch (err) {
    console.error('evento', err);
  }
  return vazio();
}
