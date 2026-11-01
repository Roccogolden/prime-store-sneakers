// Medição anônima para o painel do Robson (/painel): visitas, tênis vistos, pedidos no WhatsApp, sacolas e buscas
// sem resultado. Sem cookie e sem dado pessoal; o servidor só soma contagens por dia (api/evento.js).
// Nunca atrapalha o site: sem servidor ou com erro, o evento simplesmente não conta.

type Evento =
  | { t: 'visita'; origem: string }
  | { t: 'tenis'; id: string }
  | { t: 'whats'; id?: string; num?: string; onde?: string }
  | { t: 'sacola'; n: number }
  | { t: 'busca0'; q: string };

/** Aparelho marcado no painel ("este aparelho não entra nas contas"): as visitas do próprio Robson não contam. */
export const CHAVE_NAO_CONTAR = 'prime-nao-contar';

function naoContar() {
  try {
    return localStorage.getItem(CHAVE_NAO_CONTAR) === '1';
  } catch {
    return false;
  }
}

export function medir(e: Evento) {
  if (typeof window === 'undefined' || naoContar()) return;
  try {
    const corpo = JSON.stringify(e);
    if (navigator.sendBeacon) navigator.sendBeacon('/api/evento', new Blob([corpo], { type: 'application/json' }));
    else void fetch('/api/evento', { method: 'POST', body: corpo, keepalive: true, headers: { 'content-type': 'application/json' } });
  } catch {
    /* sem medição */
  }
}

/** De onde veio a visita: ?utm_source= / ?origem= (links do kit de lançamento) ou o site que mandou para cá. */
export function origemDaVisita() {
  const p = new URLSearchParams(location.search);
  const marcada = (p.get('utm_source') || p.get('origem') || '').toLowerCase();
  const veio = document.referrer.toLowerCase();
  const de = (s: string) => marcada.includes(s) || veio.includes(s);
  if (marcada === 'qr' || marcada === 'cartao') return 'qr';
  if (de('instagram')) return 'instagram';
  if (de('whatsapp') || de('wa.me')) return 'whatsapp';
  if (de('google')) return 'google';
  if (de('facebook') || de('fb.')) return 'facebook';
  if (de('tiktok')) return 'tiktok';
  if (!veio || veio.includes(location.host)) return 'direto';
  return 'outros';
}

/**
 * Conta os toques nos links do WhatsApp. Cada link diz de onde é: data-onde (fechamento, rodapé…), data-tenis e
 * data-num (pedido de um tênis no detalhe) ou data-pares (a sacola inteira).
 */
export function medirCliquesNoWhatsapp() {
  document.addEventListener(
    'click',
    (ev) => {
      const a = (ev.target as Element | null)?.closest?.('a[href*="wa.me/"]') as HTMLAnchorElement | null;
      if (!a) return;
      const { tenis, num, onde, pares } = a.dataset;
      if (pares) medir({ t: 'sacola', n: Number(pares) || 1 });
      medir({ t: 'whats', id: tenis, num, onde: pares ? 'sacola' : onde });
    },
    { capture: true },
  );
}
