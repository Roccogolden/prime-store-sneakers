// E-mail do painel (link para trocar a senha) pela API da Resend (sem dependência).
// A integração da Resend na Vercel cria RESEND_API_KEY e RESEND_EMAIL_DOMAIN (primestoresneakers.com): o remetente é
// painel@<domínio>. Enquanto o domínio não é confirmado na Resend (registros de DNS na Hostinger), ela recusa esse
// remetente; aí vai pelo remetente de teste dela, que só entrega no e-mail do dono da conta Resend.
// PAINEL_REMETENTE (opcional) troca o remetente.

const REMETENTE_TESTE = 'Prime Store <onboarding@resend.dev>';

export function emailPronto() {
  return Boolean(globalThis.__emailFalso || process.env.RESEND_API_KEY);
}

function remetente() {
  if (process.env.PAINEL_REMETENTE) return process.env.PAINEL_REMETENTE;
  const dominio = process.env.RESEND_EMAIL_DOMAIN;
  return dominio ? `Prime Store <painel@${dominio}>` : REMETENTE_TESTE;
}

export async function enviarEmail({ para, assunto, html, texto }) {
  if (globalThis.__emailFalso) return globalThis.__emailFalso({ para, assunto, html, texto });
  const mandar = (from) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [para], subject: assunto, html, text: texto }),
    });
  let r = await mandar(remetente());
  // domínio ainda não confirmado na Resend (403/422): tenta o remetente de teste
  if (!r.ok && (r.status === 403 || r.status === 422) && remetente() !== REMETENTE_TESTE) r = await mandar(REMETENTE_TESTE);
  if (!r.ok) throw new Error(`e-mail não saiu (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

/**
 * Situação do domínio de e-mail no Resend e os registros de DNS que ele pede (públicos: vão no DNS da Hostinger).
 * verificar = true pede ao Resend para conferir os registros agora. A chave nunca sai do servidor.
 */
export async function dominioDoEmail({ verificar = false } = {}) {
  const nome = process.env.RESEND_EMAIL_DOMAIN || (globalThis.__emailFalso ? 'primestoresneakers.com' : '');
  if (globalThis.__emailFalso) {
    return {
      dominio: nome,
      status: 'pending',
      registros: [
        { registro: 'DKIM', tipo: 'TXT', nome: 'resend._domainkey', valor: 'p=CHAVE-DE-TESTE', prioridade: null, status: 'not_started' },
        { registro: 'SPF', tipo: 'MX', nome: 'send', valor: 'feedback-smtp.sa-east-1.amazonses.com', prioridade: 10, status: 'not_started' },
        { registro: 'SPF', tipo: 'TXT', nome: 'send', valor: 'v=spf1 include:amazonses.com ~all', prioridade: null, status: 'not_started' },
      ],
    };
  }
  if (!process.env.RESEND_API_KEY || !nome) return null;
  const resend = async (caminho, metodo = 'GET') => {
    const r = await fetch(`https://api.resend.com${caminho}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`resend ${r.status}: ${JSON.stringify(corpo).slice(0, 200)}`);
    return corpo;
  };
  const lista = await resend('/domains');
  const achado = (lista.data || []).find((d) => d.name === nome);
  if (!achado) return { dominio: nome, status: 'nao-encontrado', registros: [] };
  if (verificar) await resend(`/domains/${achado.id}/verify`, 'POST');
  const d = await resend(`/domains/${achado.id}`);
  return {
    dominio: d.name,
    status: d.status,
    registros: (d.records || []).map((r) => ({
      registro: r.record,
      tipo: r.type,
      nome: r.name,
      valor: r.value,
      prioridade: r.priority ?? null,
      status: r.status,
    })),
  };
}
