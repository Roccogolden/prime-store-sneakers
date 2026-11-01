// Aplica as fotos retocadas à mão (catalogo/corrigidas/<id>.jpg) sem rodar o catálogo inteiro (que baixa os álbuns):
// gera public/fotos/<id>-{400,720,1080}.webp como o scripts/catalogo.mjs, e atualiza w, h, ws e bg
// dessas fotos no src/data/catalogo.json. Uso: node scripts/aplicar-corrigidas.mjs [p121,p101,...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CORRIGIDAS = path.join(RAIZ, 'catalogo', 'corrigidas');
const FOTOS = path.join(RAIZ, 'public', 'fotos');
const JSON_CAT = path.join(RAIZ, 'src', 'data', 'catalogo.json');
// mesmos valores do scripts/catalogo.mjs
const LARGURAS = [400, 720, 1080];
const QUALIDADE = { 400: 70, 720: 72, 1080: 76 };

const pedidos = process.argv[2]?.split(',');
const ids = fs
  .readdirSync(CORRIGIDAS)
  .filter((f) => f.endsWith('.jpg'))
  .map((f) => f.slice(0, -4))
  .filter((id) => !pedidos || pedidos.includes(id));

const dados = JSON.parse(fs.readFileSync(JSON_CAT, 'utf8'));
const porId = new Map(dados.itens.map((t) => [t.id, t]));

for (const id of ids) {
  const item = porId.get(id);
  if (!item) {
    console.log(`${id}: fora do catálogo, pulado`);
    continue;
  }
  const orig = path.join(CORRIGIDAS, id + '.jpg');
  const { width, height } = await sharp(orig).metadata();
  const ws = [];
  for (const alvo of LARGURAS) {
    const w = Math.min(alvo, width);
    if (ws.includes(w)) continue;
    await sharp(orig).resize({ width: w }).webp({ quality: QUALIDADE[alvo], effort: 5 }).toFile(path.join(FOTOS, `${id}-${w}.webp`));
    ws.push(w);
  }
  const { channels } = await sharp(orig).resize(32).stats();
  const bg = '#' + channels.slice(0, 3).map((c) => Math.round(c.mean * 0.72).toString(16).padStart(2, '0')).join('');
  // tira as larguras antigas que não existem mais (ex.: a foto ficou mais estreita depois do recorte)
  for (const w of item.ws) if (!ws.includes(w)) fs.rmSync(path.join(FOTOS, `${id}-${w}.webp`), { force: true });
  Object.assign(item, { ws, w: width, h: height, bg });
  console.log(`${id}: ${width}x${height} → ${ws.join(', ')}`);
}

fs.writeFileSync(JSON_CAT, JSON.stringify(dados)); // mesmo formato do catalogo.mjs (uma linha)
console.log(`aplicadas ${ids.length} fotos`);
