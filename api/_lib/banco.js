// Banco do painel: Upstash Redis pela API REST (sem dependência). A Vercel cria as variáveis ao ligar o banco ao
// projeto (Storage → Upstash for Redis): KV_REST_API_URL e KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_URL/_TOKEN).
// Nos testes locais (scripts/painel-local.mjs) um banco de mentira entra por globalThis.__bancoFalso.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function bancoPronto() {
  return Boolean(globalThis.__bancoFalso || (url() && token()));
}

/**
 * Vários comandos numa ida só (pipeline).
 * @param {(string|number)[][]} comandos ex.: [['INCR', 'a'], ['GET', 'b']]
 * @returns {Promise<unknown[]>} o resultado de cada comando, na mesma ordem
 */
export async function rodar(comandos) {
  if (globalThis.__bancoFalso) return globalThis.__bancoFalso(comandos);
  const r = await fetch(`${url()}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: JSON.stringify(comandos.map((c) => c.map(String))),
  });
  if (!r.ok) throw new Error(`banco respondeu ${r.status}`);
  const respostas = await r.json();
  return respostas.map((x) => {
    if (x.error) throw new Error(`banco: ${x.error}`);
    return x.result;
  });
}

/** HGETALL vem como lista [campo, valor, campo, valor…]: vira objeto com os valores em número. */
export function emObjeto(lista) {
  const o = {};
  if (Array.isArray(lista)) for (let k = 0; k < lista.length; k += 2) o[lista[k]] = Number(lista[k + 1]) || 0;
  return o;
}

/** Dia de hoje (ou de uma data) em Goiás, AAAA-MM-DD. */
export function diaGoias(data = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(data);
}
