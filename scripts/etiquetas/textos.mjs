// Passo C: etiquetas achadas pelo texto (OCR com posição nas faixas de cima e de baixo).
// node textos.mjs <pilulas.json> <faixas/meta.json> <ocr.json> <saida.json>
import fs from 'node:fs';

const [pilArq, metaArq, ocrArq, saida] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pilArq, 'utf8'));
const META = JSON.parse(fs.readFileSync(metaArq, 'utf8'));
const OCR = JSON.parse(fs.readFileSync(ocrArq, 'utf8').replace(/^﻿/, ''));

const VOCAB = new Set(('preto preta branco branca cinza azul marinho rosa rose pink verde agua lilas roxo vermelho laranja amarelo ' +
  'dourado ouro prata bege nude caramelo cafe marrom vinho grafite off creme black white grade alta baixa futsal society ' +
  'salao infantil baby premium especial piscina limao royal fosco').split(' '));
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function tipoLinha(t) {
  const s = t.replace(/\s/g, '').toUpperCase();
  if (/^[WVUM]/.test(s) && s.includes('Y') && s.length >= 8 && s.length <= 15 && (s.match(/[0-9OIZSBL]/g) || []).length >= 4) return 'codigo';
  if (/R[E3]F/i.test(t)) return 'ref';
  const palavras = norm(t).split(/[^a-z0-9]+/).filter(Boolean);
  if (palavras.some((p) => VOCAB.has(p))) return 'cor';
  return null;
}

const dentro = (l, r) => {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
};

const res = {};
for (const [id, d] of Object.entries(P)) {
  const m = META[id];
  const textos = [];
  if (m) for (const faixa of ['cima', 'baixo']) {
    const linhas = (OCR[`${id}__${faixa}`] || []).map((l) => ({
      t: l.t, x: l.x / m.fator, y: l.y / m.fator + m[faixa], w: l.w / m.fator, h: l.h / m.fator,
    }));
    // grupos: linhas empilhadas que se sobrepõem na horizontal
    const grupos = [];
    for (const l of linhas.sort((a, b) => a.y - b.y)) {
      const g = grupos.find((gr) => gr.some((o) => {
        const sobre = Math.min(o.x + o.w, l.x + l.w) - Math.max(o.x, l.x);
        const vao = l.y - (o.y + o.h);
        return sobre > Math.min(o.w, l.w) * 0.3 && vao < Math.max(o.h, l.h) * 1.7 && vao > -o.h;
      }));
      if (g) g.push(l); else grupos.push([l]);
    }
    for (const g of grupos) {
      const tipos = g.map((l) => tipoLinha(l.t));
      if (!tipos.some(Boolean)) continue;
      if (g.every((l) => d.pilulas.some((p) => dentro(l, p)))) continue; // já coberto por uma pílula
      const h = Math.max(...g.map((l) => l.h));
      const x0 = Math.min(...g.map((l) => l.x)) - h * 0.9, x1 = Math.max(...g.map((l) => l.x + l.w)) + h * 0.9;
      const y0 = Math.min(...g.map((l) => l.y)) - h * 0.65, y1 = Math.max(...g.map((l) => l.y + l.h)) + h * 0.65;
      const r = { tipo: 'texto', motivo: g.map((l) => l.t).join(' / '), x: Math.max(0, Math.round(x0)), y: Math.max(0, Math.round(y0)) };
      r.w = Math.min(d.W, Math.round(x1)) - r.x;
      r.h = Math.min(d.H, Math.round(y1)) - r.y;
      textos.push(r);
    }
  }
  res[id] = { ...d, textos };
}
fs.writeFileSync(saida, JSON.stringify(res, null, 1));
const ids = Object.keys(res);
if (ids.length <= 30) for (const id of ids) console.log(id, res[id].textos.map((t) => `[${t.x},${t.y},${t.w}x${t.h} "${t.motivo}"]`).join(' '));
else console.log('fotos', ids.length, 'com texto extra', ids.filter((i) => res[i].textos.length).length, 'sem nada', ids.filter((i) => !res[i].textos.length && !res[i].pilulas.length).length);
