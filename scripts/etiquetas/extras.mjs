// Passo D: etiquetas achadas pelo OCR ampliado dos cantos (código, REF, número solto da REF).
// Também lista as linhas do OCR das fotos inteiras, para a escolha manual.
// node extras.mjs <deteccoes.json> <cantos/meta.json> <ocr-cantos.json> <inteiras/meta.json> <ocr-inteiras.json> <saida.json>
import fs from 'node:fs';

const [detArq, cmArq, coArq, imArq, ioArq, saida] = process.argv.slice(2);
const ler = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const D = ler(detArq), CM = ler(cmArq), CO = ler(coArq);
const IM = imArq && imArq !== '-' && fs.existsSync(imArq) ? ler(imArq) : {}, IO = ioArq && ioArq !== '-' && fs.existsSync(ioArq) ? ler(ioArq) : {};

const ehCodigo = (t) => {
  const s = t.replace(/\s/g, '').toUpperCase();
  return /^[WVUMN]/.test(s) && s.includes('Y') && s.length >= 8 && s.length <= 15 && (s.match(/[0-9OIZSBL]/g) || []).length >= 4;
};
const ehRef = (t) => /R[E3]F/i.test(t);
const ehNumero = (t) => /^[0-9]{1,2}$/.test(t.trim());

function caixa(l, d) {
  const h = l.h;
  const x0 = l.x - h * 0.9, x1 = l.x + l.w + h * 0.9, y0 = l.y - h * 0.65, y1 = l.y + l.h + h * 0.65;
  const r = { x: Math.max(0, Math.round(x0)), y: Math.max(0, Math.round(y0)) };
  r.w = Math.min(d.W, Math.round(x1)) - r.x;
  r.h = Math.min(d.H, Math.round(y1)) - r.y;
  return r;
}
const dentro = (l, r) => {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
};

let novas = 0;
for (const [id, d] of Object.entries(D)) {
  const m = CM[id];
  if (!m) continue;
  d.manuais = d.manuais || [];
  for (const parte of ['ce', 'cd']) {
    const p = m[parte];
    for (const l0 of CO[`${id}__${parte}`] || []) {
      const l = { t: l0.t, x: l0.x / p.fator + p.x, y: l0.y / p.fator + p.y, w: l0.w / p.fator, h: l0.h / p.fator };
      const ok = ehCodigo(l.t) || ehRef(l.t) || (parte === 'cd' && ehNumero(l.t));
      if (!ok) continue;
      const ja = [...d.pilulas, ...(d.textos || []), ...d.manuais].some((r) => dentro(l, r));
      if (ja) continue;
      d.manuais.push({ tipo: 'texto', motivo: 'canto: ' + l.t, ...caixa(l, d) });
      novas++;
    }
  }
}
fs.writeFileSync(saida, JSON.stringify(D, null, 1));
console.log('regiões novas pelos cantos:', novas);
for (const [id, d] of Object.entries(D)) if (d.manuais?.length) console.log('  ', id, d.manuais.map((r) => `${r.motivo} [${r.x},${r.y},${r.w}x${r.h}]`).join(' | '));

console.log('\n== linhas do OCR das fotos inteiras (x,y,w,h na foto) ==');
for (const [id, m] of Object.entries(IM)) {
  const p = m.tudo;
  const linhas = (IO[`${id}__tudo`] || []).map((l) => `"${l.t}" [${Math.round(l.x / p.fator)},${Math.round(l.y / p.fator)},${Math.round(l.w / p.fator)}x${Math.round(l.h / p.fator)}]`);
  console.log(id, `${m.W}x${m.H}`, linhas.join('  '));
}
