// Senha (scrypt, com sal), sessão (cookie HttpOnly assinado com HMAC) e respostas do painel.
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PARAMS = { N: 16384, r: 8, p: 1 };

export async function gerarHash(senha) {
  const sal = randomBytes(16);
  const h = await scrypt(String(senha).normalize('NFKC'), sal, 64, PARAMS);
  return `scrypt$${sal.toString('base64')}$${h.toString('base64')}`;
}

export async function conferirSenha(senha, guardado) {
  const [tipo, sal, hash] = String(guardado || '').split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const h = await scrypt(String(senha).normalize('NFKC'), Buffer.from(sal, 'base64'), 64, PARAMS);
  const esperado = Buffer.from(hash, 'base64');
  return esperado.length === h.length && timingSafeEqual(esperado, h);
}

/** Compara textos sem vazar o tamanho do acerto pelo tempo. */
export function iguais(a, b) {
  const x = createHash('sha256').update(String(a)).digest();
  const y = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(x, y);
}

export const resumo = (texto) => createHash('sha256').update(texto).digest('hex');
export const sorteio = (bytes = 32) => randomBytes(bytes).toString('base64url');

// Assinatura das sessões: PAINEL_SEGREDO, se existir; senão, derivada do token do banco (secreto também).
function segredo() {
  const base =
    process.env.PAINEL_SEGREDO ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    (globalThis.__bancoFalso ? 'so-no-teste-local' : '');
  if (!base) throw new Error('sem segredo para assinar a sessão');
  return createHash('sha256').update('prime-painel:' + base).digest();
}

export const COOKIE = 'prime_painel';
const DIAS_SESSAO = 30;

/** Sessão com a versão da conta: trocar a senha sobe a versão e derruba as sessões antigas. */
export function criarSessao(versao) {
  const dados = Buffer.from(JSON.stringify({ v: versao, exp: Date.now() + DIAS_SESSAO * 864e5 })).toString('base64url');
  const assinatura = createHmac('sha256', segredo()).update(dados).digest('base64url');
  return `${dados}.${assinatura}`;
}

export function lerSessao(valor) {
  if (!valor || !valor.includes('.')) return null;
  const [dados, assinatura] = valor.split('.');
  const recebida = Buffer.from(assinatura);
  const esperada = Buffer.from(createHmac('sha256', segredo()).update(dados).digest('base64url'));
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;
  try {
    const s = JSON.parse(Buffer.from(dados, 'base64url').toString('utf8'));
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function cookieDaSessao(valor) {
  return `${COOKIE}=${valor}; Path=/api/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS_SESSAO * 86400}`;
}
export const cookieApagado = `${COOKIE}=; Path=/api/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function lerCookie(request, nome) {
  const linha = request.headers.get('cookie') || '';
  for (const parte of linha.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return v.join('=');
  }
  return null;
}

export function json(dados, status = 200, cabecalhos = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cabecalhos },
  });
}

/** Pedido de escrita só da própria página (contra formulário de outro site). */
export function mesmaOrigem(request) {
  const origem = request.headers.get('origin');
  if (!origem) return true;
  try {
    return new URL(origem).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function ipDe(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

export async function lerCorpo(request) {
  try {
    const texto = await request.text();
    return texto.length > 4000 ? {} : JSON.parse(texto || '{}');
  } catch {
    return {};
  }
}
