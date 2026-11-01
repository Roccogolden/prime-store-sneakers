// Banco de mentira na memória com os comandos do Redis que o painel usa (para testes locais, sem a Upstash).
const dados = new Map(); // chave → string | Map (hash) | Set (contagem de únicos)
const vence = new Map();
const vivo = (k) => {
  if (vence.has(k) && vence.get(k) < Date.now()) {
    dados.delete(k);
    vence.delete(k);
  }
  return dados.get(k);
};
function comando([nome, ...a]) {
  const c = String(nome).toUpperCase();
  switch (c) {
    case 'GET':
      return typeof vivo(a[0]) === 'string' ? vivo(a[0]) : null;
    case 'SET': {
      if (a.includes('NX') && vivo(a[0]) !== undefined) return null;
      dados.set(a[0], String(a[1]));
      const ex = a.indexOf('EX');
      if (ex > 0) vence.set(a[0], Date.now() + Number(a[ex + 1]) * 1000);
      return 'OK';
    }
    case 'GETDEL': {
      const v = typeof vivo(a[0]) === 'string' ? vivo(a[0]) : null;
      dados.delete(a[0]);
      return v;
    }
    case 'INCR':
    case 'INCRBY': {
      const v = (Number(vivo(a[0])) || 0) + (c === 'INCR' ? 1 : Number(a[1]));
      dados.set(a[0], String(v));
      return v;
    }
    case 'EXPIRE':
      vence.set(a[0], Date.now() + Number(a[1]) * 1000);
      return 1;
    case 'PFADD': {
      const s = vivo(a[0]) instanceof Set ? vivo(a[0]) : new Set();
      const antes = s.size;
      a.slice(1).forEach((x) => s.add(x));
      dados.set(a[0], s);
      return s.size > antes ? 1 : 0;
    }
    case 'PFCOUNT': {
      const u = new Set();
      a.forEach((k) => vivo(k) instanceof Set && vivo(k).forEach((x) => u.add(x)));
      return u.size;
    }
    case 'HINCRBY': {
      const h = vivo(a[0]) instanceof Map ? vivo(a[0]) : new Map();
      const v = (Number(h.get(a[1])) || 0) + Number(a[2]);
      h.set(a[1], String(v));
      dados.set(a[0], h);
      return v;
    }
    case 'HSET': {
      const h = vivo(a[0]) instanceof Map ? vivo(a[0]) : new Map();
      for (let k = 1; k < a.length; k += 2) h.set(String(a[k]), String(a[k + 1]));
      dados.set(a[0], h);
      return (a.length - 1) / 2;
    }
    case 'HDEL': {
      const h = vivo(a[0]);
      return h instanceof Map && h.delete(a[1]) ? 1 : 0;
    }
    case 'HGETALL': {
      const h = vivo(a[0]);
      return h instanceof Map ? [...h.entries()].flat() : [];
    }
    default:
      throw new Error(`comando ${c} não existe no banco de mentira`);
  }
}

/** Liga o banco e o e-mail de mentira. `aoEnviar` recebe cada e-mail (o padrão imprime no terminal). */
export function instalarFalsos(aoEnviar) {
  dados.clear();
  vence.clear();
  globalThis.__bancoFalso = async (cmds) => cmds.map(comando);
  globalThis.__emailFalso = async (m) => (aoEnviar ? aoEnviar(m) : console.log(`\n[e-mail para ${m.para}] ${m.assunto}\n${m.texto}\n`));
}
