// E-mail do painel (link para trocar a senha) pela API da Resend (sem dependência).
// RESEND_API_KEY: chave da conta na resend.com. PAINEL_REMETENTE: "Prime Store <painel@primestoresneakers.com>"
// depois de verificar o domínio na Resend; até lá, o remetente de teste deles só entrega no e-mail do dono da conta.

export function emailPronto() {
  return Boolean(globalThis.__emailFalso || process.env.RESEND_API_KEY);
}

export async function enviarEmail({ para, assunto, html, texto }) {
  if (globalThis.__emailFalso) return globalThis.__emailFalso({ para, assunto, html, texto });
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.PAINEL_REMETENTE || 'Prime Store <onboarding@resend.dev>',
      to: [para],
      subject: assunto,
      html,
      text: texto,
    }),
  });
  if (!r.ok) throw new Error(`e-mail não saiu (${r.status}): ${(await r.text()).slice(0, 200)}`);
}
