// Gera logo, ícones e posts do Instagram a partir do material do cliente.
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
const ORIGEM = path.resolve(import.meta.dirname, '../../PRIME STORE - SNEAKERS - ROBSON/PRIME STORE _ SNEAKERS 👟 (@prime.storego) • Fotos e vídeos do Instagram');
const PUB = path.resolve(import.meta.dirname, '../public');
const arq = (p) => fs.readdirSync(ORIGEM).find((f) => f.startsWith(p));
const logo = path.join(ORIGEM, arq('imgi_1_'));
// logo redonda: o original tem 150 px, nítido até 50 px na tela num iPhone (densidade 3)
await sharp(logo).webp({ quality: 92 }).toFile(path.join(PUB, 'marca/logo-prime.webp'));
await sharp(logo).resize(150).png().toFile(path.join(PUB, 'marca/logo-prime-150.png'));
await sharp(logo).resize(32).png().toFile(path.join(PUB, 'favicon-32.png'));
await sharp(logo).resize(180, 180, { kernel: 'lanczos3' }).png().toFile(path.join(PUB, 'apple-touch-icon.png'));
await sharp(logo).resize(192, 192, { kernel: 'lanczos3' }).png().toFile(path.join(PUB, 'icon-192.png'));
// posts sem preço (o imgi_2 mostra valor e o imgi_8 é o banner geral: ficam de fora)
const posts = ['imgi_3_', 'imgi_4_', 'imgi_5_', 'imgi_6_', 'imgi_7_'];
let i = 1;
for (const p of posts) {
  const f = path.join(ORIGEM, arq(p));
  const m = await sharp(f).metadata();
  await sharp(f).resize({ width: Math.min(480, m.width), height: 600, fit: 'cover' }).webp({ quality: 82 }).toFile(path.join(PUB, `instagram/post-${i++}.webp`));
}
console.log('ok');
