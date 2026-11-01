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
