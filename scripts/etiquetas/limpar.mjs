// Tira as etiquetas das fotos do fornecedor.
// 1) "Remove" do PhotoCraft em todas as regiões de uma vez;
// 2) por região, se o preenchimento ficou bem mais detalhado que o entorno (copiou um objeto),
//    refaz aquela região com um preenchimento suave a partir das bordas, com o grão da foto.
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
  const lista = [];
  for (const r of [...(d.pilulas || []), ...(d.textos || []), ...(d.manuais || [])]) {
    // margens que pegam a borda suavizada e a sombrinha das etiquetas (as menores deixavam lasquinhas)
    const m = r.tipo === 'manual' ? 4 : r.tipo === 'faixa' ? Math.max(18, Math.round(d.H * 0.016)) : r.tipo === 'texto' ? Math.max(6, Math.round(d.H * 0.005)) : Math.max(10, Math.round(d.H * 0.009));
    const x0 = Math.max(0, r.x - m), y0 = Math.max(0, r.y - m);
    lista.push({ x0, y0, x1: Math.min(d.W - 1, r.x + r.w + m), y1: Math.min(d.H - 1, r.y + r.h + m), tipo: r.tipo });
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

/** Preenchimento suave (membrana) em várias escalas + grão igual ao do entorno. */
function preencherSuave(buf, W, H, r, semente) {
  const borda = 24;
  const cx0 = Math.max(0, r.x0 - borda), cy0 = Math.max(0, r.y0 - borda), cx1 = Math.min(W - 1, r.x1 + borda), cy1 = Math.min(H - 1, r.y1 + borda);
  const w = cx1 - cx0 + 1, h = cy1 - cy0 + 1;
  // nível 0
  let niveis = [];
  let val = new Float32Array(w * h * 3), conh = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = cx0 + x, gy = cy0 + y, i = (y * w + x);
    const buraco = gx >= r.x0 && gx <= r.x1 && gy >= r.y0 && gy <= r.y1;
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
  // grão: desvio do resíduo (pixel − média 3×3) no anel
  let soma = 0, nn = 0;
  for (const [x, y] of pontosAnel(r, W, H, 10)) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const c = lumDe(buf, (y * W + x) * 3);
    let m = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += lumDe(buf, ((y + dy) * W + x + dx) * 3);
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
    const cl = (v, max) => Math.min(max - 2, Math.max(1, Math.round(v)));
    const strokes = regs.map((r) => {
      const x0 = cl(r.x0, d.W), y0 = cl(r.y0, d.H), x1 = cl(r.x1, d.W), y1 = cl(r.y1, d.H);
      return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    });
    const params = { strokes, size: Math.max(8, Math.round(d.H * 0.008)), hardness: 100, closeLoops: true };
    const arqRemove = path.join(tmp, id + '.png');
    try {
      await exec(PC, ['run', path.join(dir, id + '.jpg'), '--cmd', 'paint.remove', '--params', JSON.stringify(params), '--out', arqRemove], { timeout: 240000, maxBuffer: 1 << 24 });
    } catch (e) {
      console.log('FALHOU o PhotoCraft', id, String(e.stderr || e.message).slice(0, 200));
      relatorio[id] = 'falhou';
      continue;
    }
    const orig = await sharp(path.join(dir, id + '.jpg')).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rem = await sharp(arqRemove).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = orig.info.width, H = orig.info.height;
    const buf = rem.data;
    const metodos = [];
    regs.forEach((r, k) => {
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
        preencherSuave(buf, W, H, r, (parseInt(id.slice(1), 10) || 1) * 7919 + k);
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
