// Atualiza o catálogo a partir dos álbuns do Google Fotos do fornecedor.
//
//   npm run catalogo            baixa os álbuns de novo, as fotos novas e gera tudo
//   npm run catalogo -- --offline   usa os álbuns já baixados em .catalogo-cache/
//
// Entradas (pasta catalogo/):
//   albuns.json         numeração → link do álbum
//   classificacao.tsv   id, marca, modelo, tipo, cor (uma foto por linha)
//   duplicadas.json     grupos de fotos iguais (a primeira fica, as numerações somam)
//   ids.json            chave de conteúdo do Google Fotos → id fixo (p001…)
// Saídas:
//   src/data/catalogo.json  e  public/fotos/<id>-<largura>.webp
//
// Foto nova sem linha na classificação não entra no site: o script lista os ids para classificar.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CAT = path.join(RAIZ, 'catalogo');
const CACHE = path.join(RAIZ, '.catalogo-cache');
const ORIG = path.join(CACHE, 'orig');
const FOTOS = path.join(RAIZ, 'public', 'fotos');
const SAIDA = path.join(RAIZ, 'src', 'data', 'catalogo.json');

/** Tipos que aparecem no site. O catálogo do fornecedor também tem chinelo, bota e sapato. */
const TIPOS_NO_SITE = new Set(['tenis', 'chuteira', 'casual']);
const LARGURAS = [400, 720, 1080];
const QUALIDADE = { 400: 70, 720: 72, 1080: 76 };
const NUMERACOES_INFANTIS = new Set(['18/19', '20/21', '22/23', '24/25', '26/27', '28/29', '30/31', '32/33']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Revelação leve no LightCraft (ArtCraft): sombras, textura e um pouco de vida nas cores, sem mexer nos realces
// (assim fundo branco continua branco). Aprovada comparando antes/depois em 25/10/2026. Sem o LightCraft
// instalado, o site usa a foto original.
const LIGHTCRAFT = process.env.LIGHTCRAFT || 'C:/Program Files/LightCraft/lightcraft-cli.exe';
const REVELACAO = ['light.shadows=10', 'light.contrast=5', 'color.vibrance=8', 'effects.texture=14', 'effects.clarity=4'];
const REVELADAS = path.join(CACHE, 'revelada');

const offline = process.argv.includes('--offline');
const lerJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
fs.mkdirSync(ORIG, { recursive: true });
fs.mkdirSync(FOTOS, { recursive: true });

// 1. Álbuns
const albuns = lerJson(path.join(CAT, 'albuns.json'));
const cacheAlbuns = path.join(CACHE, 'albuns.json');
let itensPorAlbum;
if (offline && fs.existsSync(cacheAlbuns)) {
  itensPorAlbum = lerJson(cacheAlbuns);
} else {
  itensPorAlbum = {};
  for (const { numeracao, url } of albuns) {
    const html = await (await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' } })).text();
    const m = html.match(/AF_initDataCallback\(\{key: 'ds:1'.*?data:([\s\S]*?), sideChannel: \{\}\}\);/);
    if (!m) throw new Error(`Não achei as fotos do álbum ${numeracao} (${url})`);
    const d = JSON.parse(m[1]);
    if (d[2]) console.warn(`! O álbum ${numeracao} tem mais fotos do que a primeira página: só a primeira página entrou.`);
    itensPorAlbum[numeracao] = d[1].map((it) => ({ url: it[1][0], w: it[1][1], h: it[1][2], chave: it[3], atualizado: it[5] || 0 }));
    console.log(`álbum ${numeracao}: ${itensPorAlbum[numeracao].length} fotos`);
  }
  fs.writeFileSync(cacheAlbuns, JSON.stringify(itensPorAlbum));
}

// 2. Uma entrada por foto (a mesma foto aparece em várias numerações)
const ids = lerJson(path.join(CAT, 'ids.json'));
let proximo = Math.max(0, ...Object.values(ids).map((id) => Number(id.slice(1)))) + 1;
const fotos = new Map();
for (const { numeracao } of albuns) {
  for (const it of itensPorAlbum[numeracao] || []) {
    if (!ids[it.chave]) ids[it.chave] = 'p' + String(proximo++).padStart(3, '0');
    const id = ids[it.chave];
    const f = fotos.get(id) || { id, url: it.url, w: it.w, h: it.h, atualizado: 0, nums: [] };
    if (!f.nums.includes(numeracao)) f.nums.push(numeracao);
    f.atualizado = Math.max(f.atualizado, it.atualizado);
    fotos.set(id, f);
  }
}
fs.writeFileSync(path.join(CAT, 'ids.json'), JSON.stringify(ids, null, 0).replace(/,"/g, ',\n"'));

// 3. Fotos repetidas com chaves diferentes
for (const grupo of lerJson(path.join(CAT, 'duplicadas.json'))) {
  const [fica, ...saem] = grupo;
  const alvo = fotos.get(fica);
  for (const id of saem) {
    const f = fotos.get(id);
    if (!f) continue;
    if (alvo) {
      for (const n of f.nums) if (!alvo.nums.includes(n)) alvo.nums.push(n);
      alvo.atualizado = Math.max(alvo.atualizado, f.atualizado);
    }
    fotos.delete(id);
  }
}

// 4. Classificação
const classes = new Map();
for (const linha of fs.readFileSync(path.join(CAT, 'classificacao.tsv'), 'utf8').split(/\r?\n/)) {
  if (!linha.trim() || linha.startsWith('#')) continue;
  const [id, marca, modelo, tipo, cor] = linha.split('\t');
  classes.set(id, { marca, modelo, tipo, cor });
}
const semClasse = [...fotos.keys()].filter((id) => !classes.has(id));

// 5. Fotos originais
const faltando = [...fotos.values()].filter((f) => !fs.existsSync(path.join(ORIG, f.id + '.jpg')));
for (let i = 0; i < faltando.length; i += 8) {
  await Promise.all(faltando.slice(i, i + 8).map(async (f) => {
    const r = await fetch(f.url + '=d', { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Falha ao baixar ${f.id}: ${r.status}`);
    fs.writeFileSync(path.join(ORIG, f.id + '.jpg'), Buffer.from(await r.arrayBuffer()));
  }));
}
if (faltando.length) console.log(`baixadas ${faltando.length} fotos novas`);

// 6. Revelação, WebP e dados
const ordemNums = albuns.map((a) => a.numeracao);
const itens = [];
const noSite = [...fotos.values()]
  .filter((f) => classes.has(f.id) && TIPOS_NO_SITE.has(classes.get(f.id).tipo))
  .sort((a, b) => b.atualizado - a.atualizado || a.id.localeCompare(b.id));

const temLightcraft = fs.existsSync(LIGHTCRAFT) && !process.argv.includes('--sem-revelar');
if (temLightcraft) {
  fs.mkdirSync(REVELADAS, { recursive: true });
  const exec = promisify(execFile);
  const pendentes = noSite.filter((f) => {
    const r = path.join(REVELADAS, f.id + '.jpg');
    return !fs.existsSync(r) || fs.statSync(r).mtimeMs < fs.statSync(path.join(ORIG, f.id + '.jpg')).mtimeMs;
  });
  let feitas = 0;
  const fila = [...pendentes];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let f = fila.shift(); f; f = fila.shift()) {
        const args = ['render', path.join(ORIG, f.id + '.jpg'), '-o', path.join(REVELADAS, f.id + '.jpg'), '--quality', '95'];
        for (const s of REVELACAO) args.push('--set', s);
        await exec(LIGHTCRAFT, args, { timeout: 180000 });
        if (++feitas % 25 === 0) console.log(`revelando no LightCraft: ${feitas}/${pendentes.length}`);
      }
    }),
  );
  if (pendentes.length) console.log(`reveladas ${pendentes.length} fotos no LightCraft`);
} else {
  console.log('LightCraft não encontrado: o site usa as fotos originais');
}

for (const f of noSite) {
  const c = classes.get(f.id);
  const revelada = path.join(REVELADAS, f.id + '.jpg');
  const orig = temLightcraft && fs.existsSync(revelada) ? revelada : path.join(ORIG, f.id + '.jpg');
  const meta = await sharp(orig).rotate().metadata();
  const larguraReal = meta.autoOrient?.width ?? meta.width;
  const alturaReal = meta.autoOrient?.height ?? meta.height;
  const ws = [];
  for (const alvo of LARGURAS) {
    const w = Math.min(alvo, larguraReal);
    if (ws.includes(w)) continue;
    const destino = path.join(FOTOS, `${f.id}-${w}.webp`);
    if (!fs.existsSync(destino) || fs.statSync(destino).mtimeMs < fs.statSync(orig).mtimeMs) {
      await sharp(orig).rotate().resize({ width: w }).webp({ quality: QUALIDADE[alvo], effort: 5 }).toFile(destino);
    }
    ws.push(w);
  }
  // cor média um pouco escurecida: fundo do cartão enquanto a foto carrega
  const { channels } = await sharp(orig).rotate().resize(32).stats();
  const hex = '#' + channels.slice(0, 3).map((c) => Math.round(c.mean * 0.72).toString(16).padStart(2, '0')).join('');
  const nums = ordemNums.filter((n) => f.nums.includes(n));
  itens.push({
    id: f.id,
    marca: c.marca === '?' ? 'Outras marcas' : c.marca,
    modelo: c.modelo === '?' ? 'Casual' : c.modelo,
    tipo: c.tipo,
    cor: c.cor,
    nums,
    infantil: nums.every((n) => NUMERACOES_INFANTIS.has(n)),
    ws,
    w: larguraReal,
    h: alturaReal,
    bg: hex,
  });
}

// Remove WebP de fotos que saíram do site
const vivos = new Set(itens.flatMap((it) => it.ws.map((w) => `${it.id}-${w}.webp`)));
for (const arq of fs.readdirSync(FOTOS)) if (arq.endsWith('.webp') && !vivos.has(arq)) fs.unlinkSync(path.join(FOTOS, arq));

const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
fs.writeFileSync(SAIDA, JSON.stringify({ atualizadoEm: hoje, numeracoes: ordemNums, itens }));

console.log(`\n${itens.length} modelos no site (${fotos.size} fotos únicas nos álbuns).`);
if (semClasse.length) {
  console.log(`\n${semClasse.length} fotos novas sem classificação (não entraram). Classifique em catalogo/classificacao.tsv:`);
  console.log(semClasse.join(' '));
}
