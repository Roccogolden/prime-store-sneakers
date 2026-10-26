// Recortes ampliados para o OCR achar etiquetas pequenas.
//   modo "cantos": canto superior esquerdo (48% × 15%) e direito (42% × 15%), ampliados até 2400 px
//   modo "inteira": a foto inteira com 2000 px de largura
// node recortes-ocr.mjs <pasta-fotos> <saida-dir> <cantos|inteira> <ids|all>
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const [dir, out, modo, idsArg] = process.argv.slice(2);
const ids = idsArg && idsArg !== 'all' ? idsArg.split(',') : fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)).sort();
fs.mkdirSync(out, { recursive: true });
const meta = {};
for (const id of ids) {
  const f = path.join(dir, id + '.jpg');
  const m = await sharp(f).rotate().metadata();
  const W = m.autoOrient?.width ?? m.width, H = m.autoOrient?.height ?? m.height;
  const partes = modo === 'cantos'
    ? { ce: [0, 0, Math.round(W * 0.48), Math.round(H * 0.15)], cd: [W - Math.round(W * 0.42), 0, Math.round(W * 0.42), Math.round(H * 0.15)] }
    : { tudo: [0, 0, W, H] };
  meta[id] = { W, H };
  for (const [nome, [x, y, w, h]] of Object.entries(partes)) {
    const fator = Math.min(modo === 'cantos' ? 5 : 3, (modo === 'cantos' ? 2400 : 2000) / w);
    await sharp(f).rotate().extract({ left: x, top: y, width: w, height: h }).resize({ width: Math.round(w * fator) }).jpeg({ quality: 93 }).toFile(path.join(out, `${id}__${nome}.jpg`));
    meta[id][nome] = { x, y, fator };
  }
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta));
console.log('ok', ids.length);
