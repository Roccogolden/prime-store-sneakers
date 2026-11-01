// Teste local do painel: serve o dist/ e responde /api/evento e /api/painel com as funções da Vercel, usando um
// banco de mentira na memória (os comandos do Redis que o painel usa) e um e-mail de mentira (o link sai no terminal).
// Uso: npm run build && node scripts/painel-local.mjs [porta] [--exemplo]   (conta de teste: teste@prime.local / senha-teste-123)
// --exemplo enche o banco de mentira com 44 dias de números INVENTADOS (só para ver os gráficos; nunca vai ao ar).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { instalarFalsos } from './banco-falso.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const PORTA = Number(process.argv.find((a) => /^\d+$/.test(a))) || 4180;

process.env.PAINEL_EMAIL ||= 'teste@prime.local';
process.env.PAINEL_SENHA ||= 'senha-teste-123';

instalarFalsos();
if (process.argv.includes('--exemplo')) await semearExemplo();

/** Números inventados de teste, até ontem (o que o navegador contar hoje soma por cima). */
async function semearExemplo() {
  const { diaGoias } = await import('../api/_lib/banco.js');
  const itens = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'catalogo.json'), 'utf8')).itens.slice(0, 60);
  let s = 7;
  const sorte = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const um = (lista, curva = 1) => lista[Math.floor(sorte() ** curva * lista.length)];
  const hoje = diaGoias();
  const cmds = [];
  for (let i = 44; i >= 1; i--) {
    const d = new Date(`${hoje}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const dia = d.toISOString().slice(0, 10);
    const k = (n) => `ev:${dia}:${n}`;
    const visitas = 18 + Math.round(sorte() * 22) + ([0, 6].includes(d.getUTCDay()) ? 14 : 0) + Math.round((44 - i) * 0.5);
    const unicos = Math.round(visitas * (0.7 + sorte() * 0.15));
    cmds.push(['INCRBY', k('visitas'), visitas], ['PFADD', k('unicos'), ...Array.from({ length: unicos }, (_, j) => `${dia}-${j}`)]);
    const ig = Math.round(visitas * 0.45), wa = Math.round(visitas * 0.2), go = Math.round(visitas * 0.1);
    cmds.push(['HINCRBY', k('origem'), 'instagram', ig], ['HINCRBY', k('origem'), 'whatsapp', wa], ['HINCRBY', k('origem'), 'google', go]);
    cmds.push(['HINCRBY', k('origem'), 'direto', visitas - ig - wa - go]);
    for (let v = 0; v < visitas * 1.6; v++) cmds.push(['HINCRBY', k('tenis'), um(itens, 2).id, 1]);
    const pedidos = Math.round(visitas * (0.08 + sorte() * 0.07));
    for (let p = 0; p < pedidos; p++) {
      const t = um(itens, 2.5);
      cmds.push(['HINCRBY', k('whats'), `${t.id}|${sorte() < 0.8 ? um(t.nums) : ''}`, 1]);
    }
    if (sorte() < 0.6) cmds.push(['HINCRBY', k('whats'), '_fechamento', 1]);
    if (sorte() < 0.4) cmds.push(['HINCRBY', k('whats'), '_sacola', 1], ['INCRBY', k('sacolas'), 1], ['INCRBY', k('pares'), 2 + Math.floor(sorte() * 3)]);
    if (sorte() < 0.3) cmds.push(['HINCRBY', k('busca0'), um(['bota de couro', 'tênis branco liso', 'chinelo', 'sapatênis azul', 'meia']), 1]);
    if (sorte() < 0.35) {
      const t = um(itens, 2);
      const venda = { id: `ex${i}`.padEnd(6, '0'), dia, tenis: t.id, num: t.nums[0], valor: um([189.9, 219.9, 249.9, 279.9]), obs: '', em: d.getTime() };
      cmds.push(['HSET', `vendas:${dia.slice(0, 7)}`, venda.id, JSON.stringify(venda)]);
    }
  }
  await globalThis.__bancoFalso(cmds);
  console.log(`banco de mentira com números de exemplo (inventados) de ${cmds.length} comandos`);
}

const { POST: evento } = await import('../api/evento.js');
const painel = await import('../api/painel.js');
const rotas = { '/api/evento': { POST: evento }, '/api/painel': painel };

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORTA}`);
    const rota = rotas[url.pathname];
    if (rota) {
      const fn = rota[req.method];
      if (!fn) return res.writeHead(405).end();
      const partes = [];
      for await (const p of req) partes.push(p);
      const pedido = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(partes) });
      const resp = await fn(pedido);
      const cab = {};
      // sem "Secure" no teste em http://localhost: o Safari (WebKit) recusa cookie seguro fora do https
      resp.headers.forEach((v, k) => (cab[k] = k === 'set-cookie' ? v.replace(/;\s*Secure/i, '') : v));
      res.writeHead(resp.status, cab);
      return res.end(Buffer.from(await resp.arrayBuffer()));
    }
    let arq = path.join(DIST, decodeURIComponent(url.pathname));
    if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
    if (!fs.existsSync(arq)) arq = path.join(DIST, '404.html');
    res.writeHead(arq.endsWith('404.html') ? 404 : 200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  })
  .listen(PORTA, () => console.log(`painel local em http://localhost:${PORTA}/painel/  (${process.env.PAINEL_EMAIL} / ${process.env.PAINEL_SENHA})`));
