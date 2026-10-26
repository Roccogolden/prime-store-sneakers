// Detecta etiquetas sobrepostas às fotos do fornecedor:
//  A) pílulas brancas com texto (código, REF, cor): componentes quase brancos depois de um fechamento morfológico
//  B) faixas brancas lisas (preço apagado): componentes de branco puro, sem fechamento
// node pilulas.mjs <pasta-fotos> <saida.json> [ids separados por vírgula]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [dir, saida, idsArg] = process.argv.slice(2);
const ids = idsArg ? idsArg.split(',') : fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)).sort();
const DEBUG = process.env.DEBUG === '1';

function integral(mask, W, H) {
  const I = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += mask[y * W + x];
      I[(y + 1) * (W + 1) + (x + 1)] = I[y * (W + 1) + (x + 1)] + row;
    }
  }
  return I;
}
const soma = (I, W, x0, y0, x1, y1) => I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
function morf(mask, W, H, r, dilata) {
  const I = integral(mask, W, H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1);
    const s = soma(I, W, x0, y0, x1, y1);
    out[y * W + x] = dilata ? (s > 0 ? 1 : 0) : (s === (x1 - x0) * (y1 - y0) ? 1 : 0);
  }
  return out;
}
function componentes(mask, W, H) {
  const rot = new Int32Array(W * H).fill(-1), fila = new Int32Array(W * H), cs = [];
  for (let p = 0; p < W * H; p++) {
    if (!mask[p] || rot[p] !== -1) continue;
    let ini = 0, fim = 0, n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    fila[fim++] = p; rot[p] = cs.length;
    while (ini < fim) {
      const q = fila[ini++], x = q % W, y = (q / W) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && mask[q - 1] && rot[q - 1] === -1) { rot[q - 1] = cs.length; fila[fim++] = q - 1; }
      if (x < W - 1 && mask[q + 1] && rot[q + 1] === -1) { rot[q + 1] = cs.length; fila[fim++] = q + 1; }
      if (y > 0 && mask[q - W] && rot[q - W] === -1) { rot[q - W] = cs.length; fila[fim++] = q - W; }
      if (y < H - 1 && mask[q + W] && rot[q + W] === -1) { rot[q + W] = cs.length; fila[fim++] = q + W; }
    }
    cs.push({ x0, y0, x1, y1, n });
  }
  return { rot, cs };
}
function medir(c, idx, rot, W, H, branco, escuro, m) {
  const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
  let retas = 0, total = 0;
  for (let y = c.y0 + Math.round(bh * 0.2); y <= c.y1 - Math.round(bh * 0.2); y++) {
    let k = 0;
    for (let x = c.x0; x <= c.x1; x++) if (rot[y * W + x] === idx) k++;
    total++; if (k >= bw * 0.9) retas++;
  }
  let anel = 0, brancoAnel = 0;
  for (let y = c.y0 - m; y <= c.y1 + m; y++) for (let x = c.x0 - m; x <= c.x1 + m; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) continue;
    anel++; if (branco[y * W + x]) brancoAnel++;
  }
  let nEscuro = 0;
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) nEscuro += escuro[y * W + x];
  return { bw, bh, preench: c.n / (bw * bh), retas: total ? retas / total : 0, anelBranco: anel ? brancoAnel / anel : 1, escuro: nEscuro / (bw * bh) };
}

async function detectar(arquivo) {
  const meta = await sharp(arquivo).rotate().metadata();
  const Wo = meta.autoOrient?.width ?? meta.width, Ho = meta.autoOrient?.height ?? meta.height;
  const escala = Math.min(1, 800 / Wo);
  const { data, info } = await sharp(arquivo).rotate().resize({ width: Math.round(Wo * escala) }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const branco = new Uint8Array(W * H), puro = new Uint8Array(W * H), escuro = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = (r * 299 + g * 587 + b * 114) / 1000;
    branco[i] = mn >= 226 && mx - mn <= 24 ? 1 : 0;
    puro[i] = mn >= 246 ? 1 : 0;
    escuro[i] = lum < 120 ? 1 : 0;
  }
  const s = 1 / escala, achadas = [];
  const add = (c, d, tipo) => achadas.push({
    tipo, x: Math.max(0, Math.round((c.x0 - 2) * s)), y: Math.max(0, Math.round((c.y0 - 2) * s)),
    w: Math.round((d.bw + 4) * s), h: Math.round((d.bh + 4) * s),
    preench: +d.preench.toFixed(2), retas: +d.retas.toFixed(2), anelBranco: +d.anelBranco.toFixed(2), escuro: +d.escuro.toFixed(2),
  });

  // A) pílulas com texto
  const r = Math.max(2, Math.round(H * 0.006));
  const fechado = morf(morf(branco, W, H, r, true), W, H, r, false);
  const A = componentes(fechado, W, H);
  A.cs.forEach((c, idx) => {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    if (bw < W * 0.05 || bh < H * 0.016) return;
    const noTopo = c.y0 <= H * 0.03 || c.y1 >= H * 0.97;
    const maxH = noTopo ? 0.2 : 0.13;
    if (bh > H * maxH || bw > W * 0.62 || bw * bh > W * H * 0.09) return DEBUG && console.log('  A tamanho', c.x0, c.y0, bw, bh);
    const d = medir(c, idx, A.rot, W, H, branco, escuro, Math.max(3, Math.round(r * 0.8)));
    const minPre = noTopo ? 0.74 : 0.8, minRetas = noTopo ? 0.5 : 0.75;
    if (d.preench < minPre || d.retas < minRetas || d.anelBranco > 0.45) return DEBUG && console.log('  A forma', c.x0, c.y0, bw, bh, JSON.stringify(d));
    if (d.escuro < 0.03 && !noTopo) return; // sem texto e longe das bordas: fica para o passo B
    add(c, d, 'pilula');
  });

  // B) faixas brancas lisas (sem fechamento, para não grudar na pílula vizinha)
  let totalPuro = 0;
  for (let i = 0; i < W * H; i++) totalPuro += puro[i];
  const fundoBranco = totalPuro / (W * H) > 0.25;
  const B = componentes(puro, W, H);
  const sobrepoe = (x0, y0, x1, y1) => achadas.some((p) => p.x < (x1 + 1) * s && p.x + p.w > x0 * s && p.y < (y1 + 1) * s && p.y + p.h > y0 * s);
  B.cs.forEach((c, idx) => {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    if (bw < W * 0.05 || bh < H * 0.025 || bw * bh > W * H * 0.25) return;
    const d = medir(c, idx, B.rot, W, H, puro, escuro, 4);
    const tamanhoFaixa = bh <= H * 0.32 && bw <= W * 0.55 && bw * bh <= W * H * 0.1;
    if (tamanhoFaixa && d.preench >= 0.93 && d.retas >= 0.85 && d.escuro <= 0.02 && d.anelBranco <= 0.35) {
      if (!sobrepoe(c.x0, c.y0, c.x1, c.y1)) add(c, d, 'faixa');
      return;
    }
    if (DEBUG) console.log('  B forma', c.x0, c.y0, bw, bh, JSON.stringify(d));
    // Faixa grudada noutra etiqueta: o maior retângulo de branco puro dentro do componente
    if (fundoBranco || c.n < W * H * 0.004) return;
    const alt = new Int32Array(bw);
    let melhor = { area: 0 };
    for (let y = c.y0; y <= c.y1; y++) {
      for (let k = 0; k < bw; k++) alt[k] = B.rot[y * W + c.x0 + k] === idx ? alt[k] + 1 : 0;
      const pilha = [];
      for (let k = 0; k <= bw; k++) {
        const hk = k < bw ? alt[k] : 0;
        while (pilha.length && alt[pilha[pilha.length - 1]] >= hk) {
          const topo = pilha.pop();
          const hh = alt[topo], esq = pilha.length ? pilha[pilha.length - 1] + 1 : 0, larg = k - esq;
          if (hh * larg > melhor.area) melhor = { area: hh * larg, x0: c.x0 + esq, x1: c.x0 + k - 1, y0: y - hh + 1, y1: y };
        }
        pilha.push(k);
      }
    }
    if (!melhor.area) return;
    // cresce até a borda real da faixa (o maior retângulo interno não alcança os cantos arredondados)
    const fracColuna = (x, ya, yb) => { let k = 0; for (let y = ya; y <= yb; y++) k += puro[y * W + x]; return k / (yb - ya + 1); };
    const fracLinha = (y, xa, xb) => { let k = 0; for (let x = xa; x <= xb; x++) k += puro[y * W + x]; return k / (xb - xa + 1); };
    {
      const h0 = melhor.y1 - melhor.y0 + 1, w0 = melhor.x1 - melhor.x0 + 1;
      const ya = melhor.y0 + Math.round(h0 * 0.3), yb = melhor.y1 - Math.round(h0 * 0.3);
      const xa = melhor.x0 + Math.round(w0 * 0.3), xb = melhor.x1 - Math.round(w0 * 0.3);
      while (melhor.x0 > c.x0 && fracColuna(melhor.x0 - 1, ya, yb) > 0.9) melhor.x0--;
      while (melhor.x1 < c.x1 && fracColuna(melhor.x1 + 1, ya, yb) > 0.9) melhor.x1++;
      while (melhor.y0 > c.y0 && fracLinha(melhor.y0 - 1, xa, xb) > 0.9) melhor.y0--;
      while (melhor.y1 < c.y1 && fracLinha(melhor.y1 + 1, xa, xb) > 0.9) melhor.y1++;
    }
    const rw = melhor.x1 - melhor.x0 + 1, rh = melhor.y1 - melhor.y0 + 1;
    const cy = (melhor.y0 + melhor.y1) / 2;
    if (rw < W * 0.08 || rh < H * 0.03 || rh > H * 0.32 || (cy > H * 0.35 && cy < H * 0.7)) return;
    // bordas nítidas: logo fora do retângulo, a maior parte já não é branco puro
    const fora = (pts) => pts.filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H).map(([x, y]) => 1 - puro[y * W + x]);
    const media = (a) => (a.length ? a.reduce((p, v) => p + v, 0) / a.length : 0);
    // só o miolo de cada lado (os cantos arredondados não contam)
    const mw = Math.round(rw * 0.6), mh = Math.round(rh * 0.6), ox = melhor.x0 + Math.round(rw * 0.2), oy = melhor.y0 + Math.round(rh * 0.2);
    const lados = [
      fora(Array.from({ length: mw }, (_, k) => [ox + k, melhor.y0 - 3])),
      fora(Array.from({ length: mw }, (_, k) => [ox + k, melhor.y1 + 3])),
      fora(Array.from({ length: mh }, (_, k) => [melhor.x0 - 3, oy + k])),
      fora(Array.from({ length: mh }, (_, k) => [melhor.x1 + 3, oy + k])),
    ].map(media);
    const nitidos = lados.filter((v) => v >= 0.6).length;
    if (DEBUG) console.log('  B retangulo', melhor.x0, melhor.y0, rw, rh, 'lados', lados.map((v) => v.toFixed(2)).join(','));
    if (nitidos < 3 || sobrepoe(melhor.x0, melhor.y0, melhor.x1, melhor.y1)) return;
    const r = { x0: melhor.x0, y0: melhor.y0, x1: melhor.x1, y1: melhor.y1 };
    add(r, { bw: rw, bh: rh, preench: 1, retas: 1, anelBranco: 0, escuro: 0 }, 'faixa');
  });
  return { W: Wo, H: Ho, pilulas: achadas };
}

const res = {};
for (const id of ids) {
  if (DEBUG) console.log(id);
  res[id] = await detectar(path.join(dir, id + '.jpg'));
}
fs.writeFileSync(saida, JSON.stringify(res, null, 1));
if (ids.length <= 30) for (const [id, r] of Object.entries(res)) console.log(id, r.W + 'x' + r.H, r.pilulas.map((p) => `${p.tipo}[${p.x},${p.y},${p.w}x${p.h}]`).join(' '));
else {
  const n = Object.values(res).map((r) => r.pilulas.length);
  console.log('fotos', ids.length, 'com etiqueta', n.filter((k) => k > 0).length, 'total etiquetas', n.reduce((a, b) => a + b, 0));
}
