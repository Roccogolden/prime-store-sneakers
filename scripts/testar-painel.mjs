// Teste da API do painel com o banco e o e-mail de mentira: node scripts/testar-painel.mjs
import assert from 'node:assert/strict';
import { instalarFalsos } from './banco-falso.mjs';

process.env.PAINEL_EMAIL = 'robson@teste.com';
process.env.PAINEL_SENHA = 'senha-inicial-123';
let ultimoEmail = null;
instalarFalsos((m) => (ultimoEmail = m));

const { POST: evento } = await import('../api/evento.js');
const painel = await import('../api/painel.js');

const BASE = 'https://primestoresneakers.com';
const NAVEGADOR = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
let passou = 0;
const ok = (nome) => (passou++, console.log('ok -', nome));

function pedido(caminho, { metodo = 'GET', corpo, cookie, ip = '1.1.1.1', ua = NAVEGADOR, origem = BASE } = {}) {
  const headers = { 'user-agent': ua, 'x-forwarded-for': ip, origin: origem };
  if (cookie) headers.cookie = cookie;
  return new Request(BASE + caminho, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
}
const api = (acao, opcoes = {}, extra = '') => painel[opcoes.metodo || 'GET'](pedido(`/api/painel?acao=${acao}${extra}`, opcoes));
const cookieDe = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

// ---- contador do site ----
for (const [ip, origem] of [['10.0.0.1', 'instagram'], ['10.0.0.2', 'google'], ['10.0.0.1', 'instagram']]) {
  assert.equal((await evento(pedido('/api/evento', { metodo: 'POST', ip, corpo: { t: 'visita', origem } }))).status, 204);
}
await evento(pedido('/api/evento', { metodo: 'POST', ua: 'Googlebot/2.1', corpo: { t: 'visita', origem: 'google' } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'tenis', id: 'p121' } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'tenis', id: 'p121' } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'whats', id: 'p121', num: '42' } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'whats', onde: 'fechamento' } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'sacola', n: 3 } }));
await evento(pedido('/api/evento', { metodo: 'POST', corpo: { t: 'busca0', q: '  Jordan 4!! ' } }));
await evento(pedido('/api/evento', { metodo: 'POST', origem: 'https://outro-site.com', corpo: { t: 'visita' } }));
ok('contador grava sem erro (robô e outro site ignorados)');

// ---- entrar ----
assert.equal((await (await api('eu')).json()).conta, null);
assert.equal((await api('entrar', { metodo: 'POST', corpo: { email: 'robson@teste.com', senha: 'errada' } })).status, 401);
let r = await api('entrar', { metodo: 'POST', corpo: { email: ' Robson@Teste.com ', senha: 'senha-inicial-123' } });
assert.equal(r.status, 200);
let cookie = cookieDe(r);
assert.match(r.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
assert.equal((await (await api('eu', { cookie })).json()).conta.email, 'robson@teste.com');
ok('primeiro acesso com as variáveis cria a conta e abre a sessão (cookie HttpOnly)');

// ---- dados ----
const d = await (await api('dados', { cookie })).json();
assert.equal(d.totais.visitas, 3);
assert.equal(d.totais.visitantes, 2);
assert.equal(d.totais.pedidos, 2);
assert.equal(d.totais.pedidosGerais, 1);
assert.equal(d.totais.sacolas, 1);
assert.equal(d.totais.pares, 3);
assert.deepEqual(d.tenisVistos[0], { id: 'p121', n: 2 });
assert.deepEqual(d.tenisPedidos[0], { id: 'p121', n: 1, nums: { 42: 1 } });
assert.deepEqual(d.buscas[0], { termo: 'jordan 4', n: 1 });
assert.deepEqual(d.origens[0], ['instagram', 2]);
ok('dados do período batem com o que o site contou');

// ---- vendas ----
r = await api('venda', { metodo: 'POST', cookie, corpo: { tenis: 'p121', num: '42', valor: '259,90' } });
const venda = await r.json();
assert.equal(venda.valor, 259.9);
let d2 = await (await api('dados', { cookie })).json();
assert.equal(d2.totais.vendas, 1);
assert.equal(d2.totais.valor, 259.9);
assert.equal((await api('venda', { metodo: 'DELETE', cookie }, `&id=${venda.id}&mes=${venda.dia.slice(0, 7)}`)).status, 200);
d2 = await (await api('dados', { cookie })).json();
assert.equal(d2.totais.vendas, 0);
assert.equal((await api('venda', { metodo: 'POST', corpo: { tenis: 'p121' } })).status, 401);
// vendido fora do site: sem tênis, com a descrição; sem nenhum dos dois, não grava
r = await api('venda', { metodo: 'POST', cookie, corpo: { tenis: '', obs: '  Chinelo slide preto  ', valor: '' } });
const fora = await r.json();
assert.equal(r.status, 200);
assert.equal(fora.tenis, '');
assert.equal(fora.obs, 'Chinelo slide preto');
assert.equal(fora.valor, null);
assert.equal((await api('venda', { metodo: 'POST', cookie, corpo: { tenis: '', obs: '   ' } })).status, 400);
assert.equal((await api('venda', { metodo: 'POST', cookie, corpo: { tenis: 'x1', obs: 'algo' } })).status, 400);
assert.equal((await api('venda', { metodo: 'DELETE', cookie }, `&id=${fora.id}&mes=${fora.dia.slice(0, 7)}`)).status, 200);
ok('venda registrada, somada e apagada; fora do catálogo só com descrição; sem sessão não grava');

// ---- esqueci a senha ----
r = await api('esqueci', { metodo: 'POST', corpo: { email: 'outro@x.com' } });
assert.equal(r.status, 200);
assert.equal(ultimoEmail, null);
r = await api('esqueci', { metodo: 'POST', corpo: { email: 'robson@teste.com' } });
assert.equal(r.status, 200);
assert.ok(ultimoEmail?.texto.includes('/painel/?redefinir='));
const token = ultimoEmail.texto.match(/redefinir=([\w-]+)/)[1];
assert.equal((await api('redefinir', { metodo: 'POST', corpo: { token, senha: 'curta' } })).status, 400);
r = await api('redefinir', { metodo: 'POST', corpo: { token, senha: 'senha-nova-456' } });
assert.equal(r.status, 200);
const cookieNovo = cookieDe(r);
assert.equal((await (await api('eu', { cookie })).json()).conta, null, 'a sessão antiga cai quando a senha muda');
assert.notEqual((await (await api('eu', { cookie: cookieNovo })).json()).conta, null);
assert.equal((await api('redefinir', { metodo: 'POST', corpo: { token, senha: 'outra-senha-789' } })).status, 400, 'link só vale uma vez');
ok('esqueci a senha: e-mail só para a conta, link vale uma vez, sessão antiga cai');
cookie = cookieNovo;

// ---- conta ----
assert.equal((await api('conta', { metodo: 'POST', cookie, corpo: { senhaAtual: 'errada', email: 'robson@loja.com' } })).status, 401);
r = await api('conta', { metodo: 'POST', cookie, corpo: { senhaAtual: 'senha-nova-456', email: 'robson@loja.com' } });
assert.equal((await r.json()).email, 'robson@loja.com');
assert.equal((await api('entrar', { metodo: 'POST', ip: '2.2.2.2', corpo: { email: 'robson@loja.com', senha: 'senha-nova-456' } })).status, 200);
assert.equal((await api('entrar', { metodo: 'POST', ip: '2.2.2.2', corpo: { email: 'robson@teste.com', senha: 'senha-inicial-123' } })).status, 401, 'variáveis não valem mais');
ok('troca de e-mail pede a senha atual; as variáveis não valem depois do primeiro acesso');

// ---- proteções ----
for (let k = 0; k < 10; k++) await api('entrar', { metodo: 'POST', ip: '9.9.9.9', corpo: { email: 'x@x.com', senha: 'x' } });
assert.equal((await api('entrar', { metodo: 'POST', ip: '9.9.9.9', corpo: { email: 'robson@loja.com', senha: 'senha-nova-456' } })).status, 429);
assert.equal((await api('entrar', { metodo: 'POST', origem: 'https://golpe.com', corpo: {} })).status, 403);
ok('limite de tentativas (429) e pedido de outro site barrado (403)');

console.log(`\n${passou} grupos de teste passaram`);
