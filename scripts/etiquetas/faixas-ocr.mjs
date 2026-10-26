// Recorta as faixas de cima (22%) e de baixo (16%) de cada foto, ampliadas para o OCR.
// node faixas-ocr.mjs <pasta-fotos> <saida-dir> <ids|all>
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const [dir, out, idsArg] = process.argv.slice(2);
const ids = idsArg && idsArg !== 'all' ? idsArg.split(',') : fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)).sort();
fs.mkdirSync(out, { recursive: true });
const meta = {};
for (const id of ids) {
  const f = path.join(dir, id + '.jpg');
  const m = await sharp(f).rotate().metadata();
  const W = m.autoOrient?.width ?? m.width, H = m.autoOrient?.height ?? m.height;
  const fator = Math.min(3, 2000 / W);
  const faixas = { cima: [0, Math.round(H * 0.22)], baixo: [H - Math.round(H * 0.16), Math.round(H * 0.16)] };
  for (const [nome, [y, h]] of Object.entries(faixas)) {
    await sharp(f).rotate().extract({ left: 0, top: y, width: W, height: h }).resize({ width: Math.round(W * fator) }).jpeg({ quality: 92 }).toFile(path.join(out, `${id}__${nome}.jpg`));
  }
  meta[id] = { W, H, fator, cima: faixas.cima[0], baixo: faixas.baixo[0] };
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta));
console.log('ok', ids.length);
