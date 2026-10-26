// Tira as etiquetas das fotos do fornecedor.
// 1) "Remove" do PhotoCraft em todas as regiões de uma vez;
// 2) por região, se o preenchimento ficou bem mais detalhado que o entorno (copiou um objeto),
//    refaz aquela região com um preenchimento suave a partir das bordas, com o grão da foto.
// Caixa manual com "modo" (revisão em tamanho real) não passa pelo PhotoCraft e manda nas automáticas que ela cobre:
//    "letras"  texto escrito direto na foto: só os traços das letras são refeitos (a mão e a mesa em volta ficam);
//              "cor": "escura" | "clara" força a cor das letras e "raio" a espessura máxima do traço;
//    "forma"   pílula branca ou preta: só a pílula (pela cor, com as letras de dentro) é refeita, sem o retângulo;
//              "cor" força a cor da pílula e "todas": true pega todas as manchas da cor (rabisco em vários pedaços);
//    "suave"   a caixa inteira no preenchimento suave.
// node limpar.mjs <pasta-fotos> <deteccoes.json> <saida-dir> [ids]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const exec = promisify(execFile);
const [dir, detArq, out, idsArg] = process.argv.slice(2);
const PC = process.env.PHOTOCRAFT || 'C:/Program Files/PhotoCraft/photocraft-cli.exe';
const D = JSON.parse(fs.readFileSync(detArq, 'utf8'));
const ids = idsArg ? idsArg.split(',') : Object.keys(D);
// Ajustes da revisão: { "p121": { "1": "suave" } } (índice da região) ou { "p999": "suave" } (todas)
const AJUSTES = process.env.AJUSTES && fs.existsSync(process.env.AJUSTES) ? JSON.parse(fs.readFileSync(process.env.AJUSTES, 'utf8')) : {};
fs.mkdirSync(out, { recursive: true });
const tmp = path.join(out, '_remove');
fs.mkdirSync(tmp, { recursive: true });

/** Regiões já com margem, em pixels da foto. */
function regioes(d) {
  const comModo = (d.manuais || []).filter((r) => r.modo);
  // automática com mais da metade dentro de uma caixa com modo: quem resolve é a caixa
  const coberta = (r) =>
    comModo.some((c) => {
      const ix = Math.min(r.x + r.w, c.x + c.w) - Math.max(r.x, c.x);
      const iy = Math.min(r.y + r.h, c.y + c.h) - Math.max(r.y, c.y);
      return ix > 0 && iy > 0 && ix * iy > 0.5 * r.w * r.h;
    });
  const lista = [];
  for (const r of [...(d.pilulas || []), ...(d.textos || []), ...(d.manuais || [])]) {
    if (r.tipo !== 'manual' && coberta(r)) continue;
    // margens que pegam a borda suavizada e a sombrinha das etiquetas (as menores deixavam lasquinhas)
    const m = r.tipo === 'manual' ? 4 : r.tipo === 'faixa' ? Math.max(18, Math.round(d.H * 0.016)) : r.tipo === 'texto' ? Math.max(6, Math.round(d.H * 0.005)) : Math.max(10, Math.round(d.H * 0.009));
    const x0 = Math.max(0, r.x - m), y0 = Math.max(0, r.y - m);
    lista.push({ x0, y0, x1: Math.min(d.W - 1, r.x + r.w + m), y1: Math.min(d.H - 1, r.y + r.h + m), tipo: r.tipo, modo: r.modo, cor: r.cor, raio: r.raio, todas: r.todas });
  }
  return lista;
}

function lumDe(buf, i) { return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000; }
/** Média do |laplaciano| da luminância num conjunto de pixels (detalhe/“textura”). */
function detalhe(buf, W, H, pontos) {
  let s = 0, n = 0;
  for (const [x, y] of pontos) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const c = lumDe(buf, (y * W + x) * 3);
    const v = 4 * c - lumDe(buf, (y * W + x - 1) * 3) - lumDe(buf, (y * W + x + 1) * 3) - lumDe(buf, ((y - 1) * W + x) * 3) - lumDe(buf, ((y + 1) * W + x) * 3);
    s += Math.abs(v); n++;
  }
  return n ? s / n : 0;
}
function pontosRet(x0, y0, x1, y1, passo = 1) {
  const p = [];
  for (let y = y0; y <= y1; y += passo) for (let x = x0; x <= x1; x += passo) p.push([x, y]);
  return p;
}
function pontosAnel(r, W, H, larg) {
  const p = [];
  for (let y = r.y0 - larg; y <= r.y1 + larg; y++) for (let x = r.x0 - larg; x <= r.x1 + larg; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) continue;
    p.push([x, y]);
  }
  return p;
}

/** Máximo (ou mínimo) numa janela quadrada de raio R, separável. */
function filtroExtremo(v, w, h, R, max) {
  const pior = max ? -Infinity : Infinity;
  const melhor = max ? Math.max : Math.min;
  const tmp = new Float32Array(w * h), saida = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let e = pior;
    for (let k = Math.max(0, x - R); k <= Math.min(w - 1, x + R); k++) e = melhor(e, v[y * w + k]);
    tmp[y * w + x] = e;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let e = pior;
    for (let k = Math.max(0, y - R); k <= Math.min(h - 1, y + R); k++) e = melhor(e, tmp[k * w + x]);
    saida[y * w + x] = e;
  }
  return saida;
}
/** Engorda uma máscara (w×h) em n pixels. */
function engordar(m, w, h, n) {
  const v = Float32Array.from(m);
  const g = filtroExtremo(v, w, h, n, true);
  return Uint8Array.from(g, (x) => (x > 0 ? 1 : 0));
}
/** Máscara do tamanho da foto só dentro de r, mais a caixa que ela ocupa (para a janela do preenchimento). */
function mascaraNaFoto(local, lx0, ly0, w, h, W, H, r) {
  const m = new Uint8Array(W * H);
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = lx0 + x, gy = ly0 + y;
    if (!local[y * w + x] || gx < r.x0 || gx > r.x1 || gy < r.y0 || gy > r.y1) continue;
    m[gy * W + gx] = 1;
    x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy);
  }
  return x1 < 0 ? null : { m, x0, y0, x1, y1 };
}

/**
 * Traços das letras escritas direto na foto: o que é bem mais escuro (ou claro) que o fundo local, onde o fundo
 * é a própria foto sem os traços finos (fechamento/abertura com janela maior que a espessura da letra).
 * A cor das letras sai da comparação com o anel em volta da caixa, a não ser que venha em r.cor.
 */
function mascaraLetras(buf, W, H, r) {
  const R = r.raio || Math.max(5, Math.min(14, Math.round((r.y1 - r.y0) * 0.07)));
  const pad = R + 3;
  const lx0 = Math.max(0, r.x0 - pad), ly0 = Math.max(0, r.y0 - pad), lx1 = Math.min(W - 1, r.x1 + pad), ly1 = Math.min(H - 1, r.y1 + pad);
  const w = lx1 - lx0 + 1, h = ly1 - ly0 + 1;
  const L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) L[y * w + x] = lumDe(buf, ((ly0 + y) * W + lx0 + x) * 3);
  let escura = r.cor ? r.cor === 'escura' : null;
  if (escura === null) {
    const anel = pontosAnel(r, W, H, 8).map(([x, y]) => lumDe(buf, (y * W + x) * 3)).sort((a, b) => a - b);
    let s = 0, n = 0;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { s += lumDe(buf, (y * W + x) * 3); n++; }
    escura = s / n < anel[anel.length >> 1];
  }
  // fundo sem os traços: fechamento (máx → mín) tira o que é escuro e fino; abertura (mín → máx), o claro e fino
  const fundo = escura ? filtroExtremo(filtroExtremo(L, w, h, R, true), w, h, R, false) : filtroExtremo(filtroExtremo(L, w, h, R, false), w, h, R, true);
  const dif = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dif[i] = escura ? fundo[i] - L[i] : L[i] - fundo[i];
  // limiar: um terço do contraste das letras (percentil 97 dentro da caixa), nunca abaixo de 28
  const dentro = [];
  for (let y = r.y0 - ly0; y <= r.y1 - ly0; y++) for (let x = r.x0 - lx0; x <= r.x1 - lx0; x++) dentro.push(dif[y * w + x]);
  dentro.sort((a, b) => a - b);
  const lim = Math.max(28, dentro[Math.floor(dentro.length * 0.97)] / 3);
  const marca = Uint8Array.from(dif, (v) => (v > lim ? 1 : 0));
  // engorda 3 px: borda suavizada e sombra das letras
  return mascaraNaFoto(engordar(marca, w, h, 3), lx0, ly0, w, h, W, H, r);
}

/**
 * A pílula inteira, pela cor (a que domina entre os pixels muito claros e muito escuros da caixa): a maior mancha
 * dessa cor, mais o que ela cerca (as letras), engordada. O resto da caixa fica como está na foto.
 */
function mascaraForma(buf, W, H, r) {
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const L = new Float32Array(w * h);
  let claros = 0, escuros = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = lumDe(buf, ((r.y0 + y) * W + r.x0 + x) * 3);
    L[y * w + x] = l;
    if (l > 225) claros++;
    else if (l < 45) escuros++;
  }
  const escura = r.cor ? r.cor === 'escura' : escuros > claros;
  const daCor = escura ? (l) => l < 70 : (l) => l > 200;
  // manchas da cor da pílula (4-vizinhos); fica a maior ou, com "todas", todas as que passam de 40 px (rabisco)
  const rot = new Int32Array(w * h).fill(-1);
  const tamanhos = new Map();
  let maior = -1, tamMaior = 0;
  for (let i = 0; i < w * h; i++) {
    if (rot[i] >= 0 || !daCor(L[i])) continue;
    const pilha = [i];
    rot[i] = i;
    let tam = 0;
    while (pilha.length) {
      const j = pilha.pop();
      tam++;
      const x = j % w, y = (j / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (rot[k] < 0 && daCor(L[k])) { rot[k] = i; pilha.push(k); }
      }
    }
    tamanhos.set(i, tam);
    if (tam > tamMaior) { tamMaior = tam; maior = i; }
  }
  if (maior < 0) return null;
  const fica = (v) => v >= 0 && (r.todas ? tamanhos.get(v) >= 40 : v === maior);
  // fechamento com janela da ordem da espessura das letras: cobre os traços e os miolos (o triângulo do "A")
  let ay0 = h, ay1 = -1;
  for (let i = 0; i < w * h; i++) if (rot[i] === maior) { const y = (i / w) | 0; ay0 = Math.min(ay0, y); ay1 = Math.max(ay1, y); }
  const K = Math.max(6, Math.min(20, Math.round((ay1 - ay0 + 1) * 0.15)));
  const dentroDaMancha = Float32Array.from(rot, (v) => (fica(v) ? 1 : 0));
  const fechada = filtroExtremo(filtroExtremo(dentroDaMancha, w, h, K, true), w, h, K, false);
  const m = Uint8Array.from(fechada, (v) => (v > 0 ? 1 : 0));
  // o que não é pílula e não encosta na borda da caixa está cercado por ela: são as letras
  const fora = new Uint8Array(w * h);
  const pilha = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (!m[y * w + x]) { fora[y * w + x] = 1; pilha.push(y * w + x); }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (!m[y * w + x] && !fora[y * w + x]) { fora[y * w + x] = 1; pilha.push(y * w + x); }
  while (pilha.length) {
    const j = pilha.pop();
    const x = j % w, y = (j / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const k = yy * w + xx;
      if (!m[k] && !fora[k]) { fora[k] = 1; pilha.push(k); }
    }
  }
  for (let i = 0; i < w * h; i++) if (!fora[i]) m[i] = 1;
  // engorda 4 px: borda arredondada suavizada e a sombrinha da pílula
  return mascaraNaFoto(engordar(m, w, h, 4), r.x0, r.y0, w, h, W, H, r);
}

/**
 * Lasca branca que o PhotoCraft deixa colada na beirada da foto quando a região encosta nela: pixels da faixa de
 * 16 px junto à borda que destoam do que está logo para dentro (a 20 px), engordados.
 */
function mascaraBeirada(buf, W, H, r) {
  const B = 16, REF = 20, LIM = 35;
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  if (w <= REF || h <= REF) return null;
  const L = (x, y) => lumDe(buf, (y * W + x) * 3);
  const local = new Uint8Array(w * h);
  let n = 0;
  const marca = (x, y) => { local[(y - r.y0) * w + x - r.x0] = 1; n++; };
  if (r.x0 === 0) for (let y = r.y0; y <= r.y1; y++) { const ref = L(REF, y); for (let x = 0; x < B; x++) if (Math.abs(L(x, y) - ref) > LIM) marca(x, y); }
  if (r.x1 === W - 1) for (let y = r.y0; y <= r.y1; y++) { const ref = L(W - 1 - REF, y); for (let x = W - B; x < W; x++) if (Math.abs(L(x, y) - ref) > LIM) marca(x, y); }
  if (r.y0 === 0) for (let x = r.x0; x <= r.x1; x++) { const ref = L(x, REF); for (let y = 0; y < B; y++) if (Math.abs(L(x, y) - ref) > LIM) marca(x, y); }
  if (r.y1 === H - 1) for (let x = r.x0; x <= r.x1; x++) { const ref = L(x, H - 1 - REF); for (let y = H - B; y < H; y++) if (Math.abs(L(x, y) - ref) > LIM) marca(x, y); }
  return n ? mascaraNaFoto(engordar(local, w, h, 2), r.x0, r.y0, w, h, W, H, r) : null;
}

/**
 * Preenchimento suave (membrana) em várias escalas + grão igual ao do entorno.
 * Sem máscara, refaz a caixa r inteira; com máscara ({ m, x0, y0, x1, y1 }), só os pixels marcados.
 */
function preencherSuave(buf, W, H, r, semente, mascara) {
  if (mascara) r = mascara;
  const borda = 24;
  const cx0 = Math.max(0, r.x0 - borda), cy0 = Math.max(0, r.y0 - borda), cx1 = Math.min(W - 1, r.x1 + borda), cy1 = Math.min(H - 1, r.y1 + borda);
  const w = cx1 - cx0 + 1, h = cy1 - cy0 + 1;
  // nível 0
  let niveis = [];
  let val = new Float32Array(w * h * 3), conh = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = cx0 + x, gy = cy0 + y, i = (y * w + x);
    const buraco = mascara ? mascara.m[gy * W + gx] === 1 : gx >= r.x0 && gx <= r.x1 && gy >= r.y0 && gy <= r.y1;
    conh[i] = buraco ? 0 : 1;
    for (let c = 0; c < 3; c++) val[i * 3 + c] = buraco ? 0 : buf[(gy * W + gx) * 3 + c];
  }
  niveis.push({ w, h, val, conh });
  // pirâmide: média só dos pixels conhecidos
  while (true) {
    const a = niveis[niveis.length - 1];
    if (a.conh.every(Boolean) || a.w <= 2 || a.h <= 2) break;
    const nw = Math.ceil(a.w / 2), nh = Math.ceil(a.h / 2);
    const v2 = new Float32Array(nw * nh * 3), k2 = new Uint8Array(nw * nh);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const xx = x * 2 + dx, yy = y * 2 + dy;
        if (xx >= a.w || yy >= a.h) continue;
        const j = yy * a.w + xx;
        if (!a.conh[j]) continue;
        s0 += a.val[j * 3]; s1 += a.val[j * 3 + 1]; s2 += a.val[j * 3 + 2]; n++;
      }
      const i = y * nw + x;
      if (n) { v2[i * 3] = s0 / n; v2[i * 3 + 1] = s1 / n; v2[i * 3 + 2] = s2 / n; k2[i] = 1; }
    }
    niveis.push({ w: nw, h: nh, val: v2, conh: k2 });
  }
  // nível mais grosso: espalha a partir dos vizinhos conhecidos
  const g = niveis[niveis.length - 1];
  for (let volta = 0; volta < 50 && !g.conh.every(Boolean); volta++) {
    const novo = g.conh.slice();
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (g.conh[i]) continue;
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= g.w || yy >= g.h) continue;
        const j = yy * g.w + xx;
        if (!g.conh[j]) continue;
        s0 += g.val[j * 3]; s1 += g.val[j * 3 + 1]; s2 += g.val[j * 3 + 2]; n++;
      }
      if (n) { g.val[i * 3] = s0 / n; g.val[i * 3 + 1] = s1 / n; g.val[i * 3 + 2] = s2 / n; novo[i] = 1; }
    }
    g.conh = novo;
  }
  // desce os níveis: inicializa do nível de cima e relaxa (Jacobi) só nos buracos
  for (let l = niveis.length - 2; l >= 0; l--) {
    const a = niveis[l], c = niveis[l + 1];
    const buraco = [];
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x;
      if (a.conh[i]) continue;
      buraco.push(i);
      const j = Math.min(c.h - 1, y >> 1) * c.w + Math.min(c.w - 1, x >> 1);
      a.val[i * 3] = c.val[j * 3]; a.val[i * 3 + 1] = c.val[j * 3 + 1]; a.val[i * 3 + 2] = c.val[j * 3 + 2];
    }
    for (let it = 0; it < 40; it++) for (const i of buraco) {
      const x = i % a.w, y = (i / a.w) | 0;
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= a.w || yy >= a.h) continue;
        const j = yy * a.w + xx;
        s0 += a.val[j * 3]; s1 += a.val[j * 3 + 1]; s2 += a.val[j * 3 + 2]; n++;
      }
      a.val[i * 3] = s0 / n; a.val[i * 3 + 1] = s1 / n; a.val[i * 3 + 2] = s2 / n;
    }
  }
  // grão: desvio do resíduo (pixel − média 3×3) numa faixa de 10 px em volta dos buracos, só com vizinhos conhecidos
  const conh0 = niveis[0].conh;
  const perto = engordar(Uint8Array.from(conh0, (k) => 1 - k), w, h, 10);
  let soma = 0, nn = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (!perto[y * w + x]) continue;
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!conh0[(y + dy) * w + x + dx]) { ok = false; break; }
    if (!ok) continue;
    const gx = cx0 + x, gy = cy0 + y;
    const c = lumDe(buf, (gy * W + gx) * 3);
    let m = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += lumDe(buf, ((gy + dy) * W + gx + dx) * 3);
    const d = c - m / 9; soma += d * d; nn++;
  }
  const grao = Math.min(10, Math.sqrt(nn ? soma / nn : 0));
  let s = semente >>> 0 || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); };
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const a = niveis[0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (a.conh[i]) continue;
    const ruido = gauss() * grao;
    const gi = ((cy0 + y) * W + cx0 + x) * 3;
    for (let c = 0; c < 3; c++) buf[gi + c] = Math.max(0, Math.min(255, Math.round(a.val[i * 3 + c] + ruido)));
  }
}

const relatorio = {};
const fila = ids.filter((id) => D[id]);
let feitas = 0;
const t0 = Date.now();
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let id = fila.shift(); id; id = fila.shift()) {
    const d = D[id];
    const regs = regioes(d);
    const destino = path.join(out, id + '.jpg');
    if (!regs.length && d.recorte) {
      const [rx, ry, rw, rh] = d.recorte;
      await sharp(path.join(dir, id + '.jpg')).rotate().extract({ left: rx, top: ry, width: rw, height: rh }).jpeg({ quality: 95, mozjpeg: true }).toFile(destino);
      relatorio[id] = [];
      feitas++;
      continue;
    }
    if (!regs.length) {
      fs.copyFileSync(path.join(dir, id + '.jpg'), destino);
      relatorio[id] = [];
      feitas++;
      continue;
    }
    // a máscara do PhotoCraft vai até a beirada da foto (parando no pixel 1, a coluna 0 da pílula ficava e
    // contaminava o preenchimento com uma lasca branca)
    const cl = (v, max) => Math.min(max - 1, Math.max(0, Math.round(v)));
    const doPhotoCraft = regs.filter((r) => !r.modo);
    const orig = await sharp(path.join(dir, id + '.jpg')).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = orig.info.width, H = orig.info.height;
    let buf = Buffer.from(orig.data);
    const metodos = [];
    // caixas da revisão: as máscaras saem da foto original e são preenchidas juntas (pílulas encostadas não se
    // contaminam); preenche antes do PhotoCraft (para ele não copiar as letras) e de novo depois, com o entorno limpo
    let uniao = null;
    for (const r of regs.filter((x) => x.modo)) {
      let m;
      if (r.modo === 'letras') m = mascaraLetras(orig.data, W, H, r);
      else if (r.modo === 'forma') m = mascaraForma(orig.data, W, H, r);
      else {
        m = { m: new Uint8Array(W * H), x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
        for (let y = r.y0; y <= r.y1; y++) m.m.fill(1, y * W + r.x0, y * W + r.x1 + 1);
      }
      metodos.push({ ...r, metodo: r.modo, pixels: m ? m.m.reduce((s, v) => s + v, 0) : 0 });
      if (!m) continue;
      if (!uniao) uniao = m;
      else {
        for (let i = 0; i < W * H; i++) if (m.m[i]) uniao.m[i] = 1;
        uniao = { m: uniao.m, x0: Math.min(uniao.x0, m.x0), y0: Math.min(uniao.y0, m.y0), x1: Math.max(uniao.x1, m.x1), y1: Math.max(uniao.y1, m.y1) };
      }
    }
    const sementeRevisao = (parseInt(id.slice(1), 10) || 1) * 7919;
    if (uniao) preencherSuave(buf, W, H, uniao, sementeRevisao, uniao);
    if (doPhotoCraft.length) {
      const strokes = doPhotoCraft.map((r) => {
        const x0 = cl(r.x0, d.W), y0 = cl(r.y0, d.H), x1 = cl(r.x1, d.W), y1 = cl(r.y1, d.H);
        return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
      });
      const params = { strokes, size: Math.max(8, Math.round(d.H * 0.008)), hardness: 100, closeLoops: true };
      const arqRemove = path.join(tmp, id + '.png');
      let entrada = path.join(dir, id + '.jpg');
      if (uniao) {
        entrada = path.join(tmp, id + '-entrada.png');
        await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(entrada);
      }
      try {
        await exec(PC, ['run', entrada, '--cmd', 'paint.remove', '--params', JSON.stringify(params), '--out', arqRemove], { timeout: 240000, maxBuffer: 1 << 24 });
      } catch (e) {
        console.log('FALHOU o PhotoCraft', id, String(e.stderr || e.message).slice(0, 200));
        relatorio[id] = 'falhou';
        continue;
      }
      buf = (await sharp(arqRemove).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
      if (uniao) preencherSuave(buf, W, H, uniao, sementeRevisao, uniao);
      for (const [k, r] of doPhotoCraft.entries()) {
        const lasca = mascaraBeirada(buf, W, H, r);
        if (lasca) preencherSuave(buf, W, H, lasca, sementeRevisao + 101 + k, lasca);
      }
    }
    regs.forEach((r, k) => {
      if (r.modo) return;
      const semente = (parseInt(id.slice(1), 10) || 1) * 7919 + k;
      const pAnel = pontosAnel(r, W, H, 14), pDentro = pontosRet(r.x0 + 2, r.y0 + 2, r.x1 - 2, r.y1 - 2, 2);
      const anel = detalhe(orig.data, W, H, pAnel);
      const dentro = detalhe(buf, W, H, pDentro);
      const lumMedia = (b, pts) => { let s = 0, q = 0, n = 0; for (const [x, y] of pts) { const v = lumDe(b, (y * W + x) * 3); s += v; q += v * v; n++; } const m = s / n; return { m, dp: Math.sqrt(Math.max(0, q / n - m * m)) }; };
      const la = lumMedia(orig.data, pAnel), ld = lumMedia(buf, pDentro);
      const corDestoa = Math.abs(ld.m - la.m) > 2 * la.dp + 15;
      const forcar = process.env.METODO; // teste: 'suave' ou 'remove'
      const aj = AJUSTES[id];
      const manual = typeof aj === 'string' ? aj : aj && aj[String(k)];
      // padrão: "Remove"; suave só por ajuste da revisão ou quando o preenchimento claramente copiou um objeto
      const estranho = forcar ? forcar === 'suave' : manual ? manual === 'suave' : dentro > Math.max(anel * 2.2, anel + 6) || (corDestoa && dentro > anel * 1.5);
      if (estranho) {
        // parte do original (sem as outras regiões já preenchidas pelo PhotoCraft) só dentro desta região
        preencherSuave(buf, W, H, r, semente);
      }
      metodos.push({ ...r, metodo: estranho ? 'suave' : 'remove', anel: +anel.toFixed(1), dentro: +dentro.toFixed(1) });
    });
    // clone com bordas suaves (área difícil: copia um pedaço parecido da própria foto)
    for (const c of d.clone || []) {
      const [sx, sy, cw, ch] = c.src, [dx, dy] = c.dst, f = c.feather || 24;
      const copia = Buffer.from(buf);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const tx = dx + x, ty = dy + y;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        // só as bordas que ficam dentro da foto recebem a transição
        const dists = [];
        if (tx - x > 0 || dx > 0) dists.push(x);
        if (dy > 0) dists.push(y);
        if (dx + cw < W) dists.push(cw - 1 - x);
        if (dy + ch < H) dists.push(ch - 1 - y);
        const a = Math.max(0, Math.min(1, Math.min(...dists, f) / f));
        const si = ((sy + y) * W + sx + x) * 3, ti = (ty * W + tx) * 3;
        for (let k = 0; k < 3; k++) buf[ti + k] = Math.round(a * copia[si + k] + (1 - a) * copia[ti + k]);
      }
    }
    // recorte depois da limpeza (prints de tela com faixas lisas em cima e embaixo)
    let saidaImg = sharp(buf, { raw: { width: W, height: H, channels: 3 } });
    if (d.recorte) {
      const [rx, ry, rw, rh] = d.recorte;
      saidaImg = sharp(await saidaImg.png().toBuffer()).extract({ left: rx, top: ry, width: rw, height: rh });
    }
    await saidaImg.jpeg({ quality: 95, mozjpeg: true }).toFile(destino);
    relatorio[id] = metodos;
    if (++feitas % 25 === 0) console.log(`${feitas} fotos (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
}));
fs.writeFileSync(path.join(out, '_relatorio.json'), JSON.stringify(relatorio, null, 1));
const todas = Object.values(relatorio).filter(Array.isArray).flat();
console.log(`pronto em ${Math.round((Date.now() - t0) / 1000)} s: ${todas.length} regiões, ${todas.filter((m) => m.metodo === 'suave').length} refeitas no modo suave`);
