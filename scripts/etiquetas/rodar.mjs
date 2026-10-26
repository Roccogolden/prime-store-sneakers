// Tira as etiquetas do fornecedor (código, REF, cor, preço apagado) das fotos que ainda não foram limpas.
//   npm run etiquetas            limpa as fotos sem versão em .catalogo-cache/limpa/
//   npm run etiquetas -- --todas  refaz todas (usa as caixas manuais de catalogo/etiquetas-manuais.json)
// Passos: pílulas e faixas brancas (pilulas.mjs) → OCR das faixas de cima/baixo (textos.mjs) → OCR ampliado dos
// cantos (extras.mjs) → caixas manuais da revisão (juntar-manuais.mjs) → "Remove" do PhotoCraft (limpar.mjs).
// O OCR é o do Windows (ocr.ps1). Depois de rodar, revise as fotos novas e, se sobrar algo, acrescente a caixa em
// catalogo/etiquetas-manuais.json e rode de novo só aquela foto: node scripts/etiquetas/limpar.mjs ... <id>.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const AQUI = import.meta.dirname;
const ORIG = path.join(RAIZ, '.catalogo-cache', 'orig');
const LIMPA = path.join(RAIZ, '.catalogo-cache', 'limpa');
const TMP = path.join(RAIZ, '.catalogo-cache', 'etiquetas-tmp');
const ETIQ = path.join(RAIZ, 'catalogo', 'etiquetas.json');
const MANUAIS = path.join(RAIZ, 'catalogo', 'etiquetas-manuais.json');
const todas = process.argv.includes('--todas');

const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', 'catalogo.json'), 'utf8'));
const ids = dados.itens.map((i) => i.id).filter((id) => todas || !fs.existsSync(path.join(LIMPA, id + '.jpg')));
if (!ids.length) {
  console.log('Nenhuma foto nova para limpar.');
  process.exit(0);
}
console.log(`Limpando ${ids.length} fotos…`);
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const t = (n) => path.join(TMP, n);
const node = (script, ...args) => execFileSync(process.execPath, [path.join(AQUI, script), ...args], { stdio: 'inherit' });
const ocr = (dir, saida) =>
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(AQUI, 'ocr.ps1'), '-Dir', dir, '-Out', saida, '-Filtro', '*.jpg'], { stdio: 'inherit' });

const lista = ids.join(',');
node('pilulas.mjs', ORIG, t('pilulas.json'), lista);
node('faixas-ocr.mjs', ORIG, t('faixas'), lista);
ocr(t('faixas'), t('ocr-faixas.json'));
node('textos.mjs', t('pilulas.json'), path.join(t('faixas'), 'meta.json'), t('ocr-faixas.json'), t('textos.json'));
node('recortes-ocr.mjs', ORIG, t('cantos'), 'cantos', lista);
ocr(t('cantos'), t('ocr-cantos.json'));
node('extras.mjs', t('textos.json'), path.join(t('cantos'), 'meta.json'), t('ocr-cantos.json'), '-', '-', t('extras.json'));

// junta com as fotos já processadas antes e aplica as caixas manuais
const antigas = fs.existsSync(ETIQ) ? JSON.parse(fs.readFileSync(ETIQ, 'utf8')) : {};
const novas = JSON.parse(fs.readFileSync(t('extras.json'), 'utf8'));
for (const id of ids) delete antigas[id];
fs.writeFileSync(t('juntas.json'), JSON.stringify({ ...antigas, ...novas }));
node('juntar-manuais.mjs', t('juntas.json'), MANUAIS, ETIQ);
node('limpar.mjs', ORIG, ETIQ, LIMPA, lista);
fs.rmSync(path.join(LIMPA, '_remove'), { recursive: true, force: true });
console.log('\nPronto. Rode "npm run catalogo -- --offline" para revelar e gerar as fotos do site.');
