// Painel do Robson: entrar, trocar senha por e-mail, conta, números do site e vendas. Uma função só (/api/painel
// com ?acao=…), para caber com folga no limite de funções do plano gratuito da Vercel.
//
// Primeiro acesso: a conta nasce do PAINEL_EMAIL e do PAINEL_SENHA (variáveis da Vercel). Depois disso as variáveis
// não valem mais: a senha fica só como resumo (scrypt) no banco, e o Robson troca e-mail e senha pelo próprio painel.
import { bancoPronto, diaGoias, emObjeto, rodar } from './_lib/banco.js';
import { emailPronto, enviarEmail } from './_lib/email.js';
import {
  COOKIE,
  conferirSenha,
  cookieApagado,
  cookieDaSessao,
  criarSessao,
  gerarHash,
  iguais,
  ipDe,
  json,
  lerCookie,
  lerCorpo,
  lerSessao,
  mesmaOrigem,
  resumo,
  sorteio,
} from './_lib/seguranca.js';

const CONTA = 'painel:conta';
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const TENIS = /^p\d{3,4}$/;
const NUM = /^\d{2}(\/\d{2})?$/;
const emailValido = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
const normalizarEmail = (e) => String(e || '').trim().toLowerCase();

function mapa(lista) {
  const o = {};
  if (Array.isArray(lista)) for (let k = 0; k < lista.length; k += 2) o[lista[k]] = lista[k + 1];
  return o;
}

async function lerConta() {
  const [lista] = await rodar([['HGETALL', CONTA]]);
  const c = mapa(lista);
  return c.email ? { email: c.email, senha: c.senha, versao: Number(c.versao) || 1 } : null;
}

async function gravarConta(conta) {
  await rodar([['HSET', CONTA, 'email', conta.email, 'senha', conta.senha, 'versao', conta.versao]]);
}

async function contaDaSessao(request) {
  const s = lerSessao(lerCookie(request, COOKIE));
  if (!s) return null;
  const conta = await lerConta();
  return conta && conta.versao === s.v ? conta : null;
}

/** true quando passou do limite de tentativas na janela. */
async function estourou(nome, request, max, segundos) {
  const chave = `limite:${nome}:${resumo(ipDe(request)).slice(0, 16)}`;
  // a janela nasce com prazo (SET NX EX) e o INCR conta dentro dela: a chave nunca fica sem vencer
  const [, n] = await rodar([['SET', chave, 0, 'EX', segundos, 'NX'], ['INCR', chave]]);
  return Number(n) > max;
}

function somarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function listaDias(de, ate) {
  const dias = [];
  for (let d = de; d <= ate && dias.length < 400; d = somarDias(d, 1)) dias.push(d);
  return dias.slice(-120);
}

function emailDeSenha(link) {
  const texto = `Para criar uma senha nova no painel da Prime Store, abra este link (vale por 1 hora e uma vez só):\n\n${link}\n\nSe não foi você que pediu, ignore este e-mail: a senha atual continua valendo.`;
  const html = `<div style="font-family:Arial,sans-serif;background:#0b0b0c;color:#f6f2ea;padding:32px">
<p style="font-size:20px;font-weight:bold;margin:0 0 6px">PRIME <span style="color:#f3b932">STORE</span></p>
<p style="color:#b3ada2;margin:0 0 24px">Painel da loja</p>
<p>Para criar uma senha nova, toque no botão. O link vale por 1 hora e uma vez só.</p>
<p style="margin:28px 0"><a href="${link}" style="background:#f3b932;color:#171104;padding:14px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Criar senha nova</a></p>
<p style="color:#8f897f;font-size:13px">Se não foi você que pediu, ignore este e-mail: a senha atual continua valendo.</p></div>`;
  return { texto, html };
}

async function dados(p) {
  const hoje = diaGoias();
  const ate = DIA.test(p.get('ate')) && p.get('ate') <= hoje ? p.get('ate') : hoje;
  const de = DIA.test(p.get('de')) && p.get('de') <= ate ? p.get('de') : somarDias(ate, -29);
  const dias = listaDias(de, ate);
  const POR_DIA = 8;
  const cmds = [];
  for (const d of dias) {
    const k = (n) => `ev:${d}:${n}`;
    cmds.push(['GET', k('visitas')], ['PFCOUNT', k('unicos')], ['HGETALL', k('origem')], ['HGETALL', k('tenis')]);
    cmds.push(['HGETALL', k('whats')], ['HGETALL', k('busca0')], ['GET', k('sacolas')], ['GET', k('pares')]);
  }
  cmds.push(['PFCOUNT', ...dias.map((d) => `ev:${d}:unicos`)]);
  const meses = [...new Set(dias.map((d) => d.slice(0, 7)))];
  for (const m of meses) cmds.push(['HGETALL', `vendas:${m}`]);
  const r = await rodar(cmds);

  const somar = (alvo, o) => {
    for (const [c, n] of Object.entries(o)) alvo[c] = (alvo[c] || 0) + n;
  };
  const origens = {}, vistos = {}, whats = {}, buscas = {};
  const porDia = [];
  let sacolas = 0, pares = 0;
  dias.forEach((d, i) => {
    const b = i * POR_DIA;
    const w = emObjeto(r[b + 4]);
    somar(origens, emObjeto(r[b + 2]));
    somar(vistos, emObjeto(r[b + 3]));
    somar(whats, w);
    somar(buscas, emObjeto(r[b + 5]));
    sacolas += Number(r[b + 6]) || 0;
    pares += Number(r[b + 7]) || 0;
    const pedidos = Object.values(w).reduce((a, n) => a + n, 0);
    porDia.push({ dia: d, visitas: Number(r[b]) || 0, unicos: Number(r[b + 1]) || 0, pedidos });
  });
  const visitantes = Number(r[dias.length * POR_DIA]) || 0;
  const vendas = [];
  meses.forEach((_, i) => {
    for (const v of Object.values(mapa(r[dias.length * POR_DIA + 1 + i]))) {
      try {
        const venda = JSON.parse(v);
        if (venda.dia >= de && venda.dia <= ate) vendas.push(venda);
      } catch {
        /* registro estragado: fica de fora */
      }
    }
  });
  vendas.sort((a, b) => (a.dia === b.dia ? b.em - a.em : a.dia < b.dia ? 1 : -1));

  const pedidosTenis = {};
  let pedidosGerais = 0;
  for (const [campo, n] of Object.entries(whats)) {
    if (campo.startsWith('_')) {
      pedidosGerais += n;
      continue;
    }
    const [id, num] = campo.split('|');
    const p = (pedidosTenis[id] ||= { id, n: 0, nums: {} });
    p.n += n;
    if (num) p.nums[num] = (p.nums[num] || 0) + n;
  }
  const top = (o, max) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, max);
  const pedidos = porDia.reduce((a, d) => a + d.pedidos, 0);

  return {
    de,
    ate,
    porDia,
    totais: {
      visitas: porDia.reduce((a, d) => a + d.visitas, 0),
      visitantes,
      pedidos,
      pedidosGerais,
      sacolas,
      pares,
      vendas: vendas.length,
      valor: vendas.reduce((a, v) => a + (Number(v.valor) || 0), 0),
    },
    origens: top(origens, 10),
    tenisVistos: top(vistos, 12).map(([id, n]) => ({ id, n })),
    tenisPedidos: Object.values(pedidosTenis).sort((a, b) => b.n - a.n).slice(0, 12),
    buscas: top(buscas, 15).map(([termo, n]) => ({ termo, n })),
    vendas,
  };
}

async function tratar(request) {
  if (!bancoPronto()) return json({ erro: 'nao-configurado' }, 503);
  if (request.method !== 'GET' && !mesmaOrigem(request)) return json({ erro: 'origem' }, 403);
  const p = new URL(request.url).searchParams;
  const acao = p.get('acao');
  const corpo = request.method === 'POST' ? await lerCorpo(request) : {};

  switch (acao) {
    case 'eu': {
      // sempre 200 (sem sessão: conta null), para o navegador não acusar erro no console a cada visita à entrada
      const conta = await contaDaSessao(request);
      return json({ conta: conta ? { email: conta.email, emailPronto: emailPronto() } : null });
    }

    case 'entrar': {
      if (request.method !== 'POST') break;
      if (await estourou('entrar', request, 10, 900)) return json({ erro: 'muitas-tentativas' }, 429);
      const email = normalizarEmail(corpo.email);
      const senha = String(corpo.senha || '');
      let conta = await lerConta();
      if (!conta) {
        const inicialEmail = normalizarEmail(process.env.PAINEL_EMAIL);
        const inicialSenha = process.env.PAINEL_SENHA || '';
        if (!inicialEmail || !inicialSenha) return json({ erro: 'sem-conta' }, 503);
        const ok = iguais(email, inicialEmail) & iguais(senha, inicialSenha);
        if (!ok) return json({ erro: 'dados-errados' }, 401);
        conta = { email: inicialEmail, senha: await gerarHash(inicialSenha), versao: 1 };
        await gravarConta(conta);
      } else {
        const okEmail = iguais(email, conta.email);
        const okSenha = await conferirSenha(senha, conta.senha); // sempre confere, para o tempo não entregar o e-mail
        if (!okEmail || !okSenha) return json({ erro: 'dados-errados' }, 401);
      }
      return json({ email: conta.email, emailPronto: emailPronto() }, 200, { 'set-cookie': cookieDaSessao(criarSessao(conta.versao)) });
    }

    case 'sair':
      return json({ ok: true }, 200, { 'set-cookie': cookieApagado });

    case 'esqueci': {
      if (request.method !== 'POST') break;
      if (await estourou('esqueci', request, 5, 3600)) return json({ erro: 'muitas-tentativas' }, 429);
      if (!emailPronto()) return json({ erro: 'sem-email' }, 503);
      const email = normalizarEmail(corpo.email);
      let conta = await lerConta();
      if (!conta && email && iguais(email, normalizarEmail(process.env.PAINEL_EMAIL))) {
        // ainda ninguém entrou: a conta nasce com uma senha sorteada, e o link do e-mail cria a de verdade
        conta = { email, senha: await gerarHash(sorteio()), versao: 1 };
        await gravarConta(conta);
      }
      if (conta && iguais(email, conta.email)) {
        const token = sorteio(32);
        await rodar([['SET', `redefinir:${resumo(token)}`, '1', 'EX', 3600]]);
        const link = `${new URL(request.url).origin}/painel/?redefinir=${token}`;
        await enviarEmail({ para: conta.email, assunto: 'Prime Store · criar senha nova do painel', ...emailDeSenha(link) });
      }
      // a mesma resposta sempre: não conta para ninguém se o e-mail é o da conta
      return json({ ok: true });
    }

    case 'redefinir': {
      if (request.method !== 'POST') break;
      if (await estourou('redefinir', request, 10, 3600)) return json({ erro: 'muitas-tentativas' }, 429);
      const senha = String(corpo.senha || '');
      if (senha.length < 8) return json({ erro: 'senha-curta' }, 400);
      const [valido] = await rodar([['GETDEL', `redefinir:${resumo(String(corpo.token || ''))}`]]);
      const conta = valido ? await lerConta() : null;
      if (!conta) return json({ erro: 'link-vencido' }, 400);
      conta.senha = await gerarHash(senha);
      conta.versao += 1; // derruba as sessões abertas com a senha antiga
      await gravarConta(conta);
      return json({ email: conta.email, emailPronto: emailPronto() }, 200, { 'set-cookie': cookieDaSessao(criarSessao(conta.versao)) });
    }

    case 'conta': {
      if (request.method !== 'POST') break;
      const conta = await contaDaSessao(request);
      if (!conta) return json({ erro: 'sem-sessao' }, 401);
      if (await estourou('conta', request, 10, 900)) return json({ erro: 'muitas-tentativas' }, 429);
      if (!(await conferirSenha(String(corpo.senhaAtual || ''), conta.senha))) return json({ erro: 'senha-atual' }, 401);
      if (corpo.email !== undefined) {
        const email = normalizarEmail(corpo.email);
        if (!emailValido(email)) return json({ erro: 'email-invalido' }, 400);
        conta.email = email;
      }
      if (corpo.senhaNova) {
        if (String(corpo.senhaNova).length < 8) return json({ erro: 'senha-curta' }, 400);
        conta.senha = await gerarHash(String(corpo.senhaNova));
        conta.versao += 1;
      }
      await gravarConta(conta);
      return json({ email: conta.email, emailPronto: emailPronto() }, 200, { 'set-cookie': cookieDaSessao(criarSessao(conta.versao)) });
    }

    case 'dados': {
      if (!(await contaDaSessao(request))) return json({ erro: 'sem-sessao' }, 401);
      return json(await dados(p));
    }

    case 'venda': {
      if (!(await contaDaSessao(request))) return json({ erro: 'sem-sessao' }, 401);
      if (request.method === 'POST') {
        // um tênis do catálogo (p123) ou, vendido fora do site, só a descrição na observação
        const tenis = corpo.tenis ? String(corpo.tenis) : '';
        const obs = String(corpo.obs || '').trim().slice(0, 120);
        if (tenis ? !TENIS.test(tenis) : !obs) return json({ erro: 'tenis' }, 400);
        const dia = DIA.test(corpo.dia) && corpo.dia <= diaGoias() ? corpo.dia : diaGoias();
        const bruto = corpo.valor === '' || corpo.valor == null ? null : Number(String(corpo.valor).replace(/\./g, '').replace(',', '.'));
        const valor = bruto === null ? null : Math.round(bruto * 100) / 100;
        if (valor !== null && !(valor >= 0 && valor < 100000)) return json({ erro: 'valor' }, 400);
        const venda = { id: sorteio(6), dia, tenis, num: NUM.test(corpo.num) ? corpo.num : '', valor, obs, em: Date.now() };
        await rodar([['HSET', `vendas:${dia.slice(0, 7)}`, venda.id, JSON.stringify(venda)]]);
        return json(venda);
      }
      if (request.method === 'DELETE') {
        const id = p.get('id');
        const mes = p.get('mes');
        if (!/^[\w-]{6,12}$/.test(id || '') || !/^\d{4}-\d{2}$/.test(mes || '')) return json({ erro: 'venda' }, 400);
        await rodar([['HDEL', `vendas:${mes}`, id]]);
        return json({ ok: true });
      }
      break;
    }
  }
  return json({ erro: 'acao' }, 400);
}

async function seguro(request) {
  try {
    return await tratar(request);
  } catch (err) {
    console.error('painel', err);
    return json({ erro: 'falha' }, 500);
  }
}

export const GET = seguro;
export const POST = seguro;
export const DELETE = seguro;
