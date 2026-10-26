// Grava no dist/index.html o HTML da página no estado inicial (gerado pelo build SSR em dist-ssr/).
// Assim o título, a vitrine e o catálogo aparecem antes do JavaScript, e o Google lê a página inteira.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// o pacote do servidor escolhe o React de produção por esta variável (sem ela, carrega o de desenvolvimento)
process.env.NODE_ENV = 'production';
const raiz = path.resolve(import.meta.dirname, '..');
const ssr = path.join(raiz, 'dist-ssr');
const entrada = fs.readdirSync(ssr).find((f) => /^entry-server\.(m?js)$/.test(f));
if (!entrada) throw new Error('Build SSR não encontrado em dist-ssr/');
const { render } = await import(pathToFileURL(path.join(ssr, entrada)).href);
const html = render();

const arq = path.join(raiz, 'dist', 'index.html');
let pagina = fs.readFileSync(arq, 'utf8');
const marcador = '<div id="root"></div>';
if (!pagina.includes(marcador)) throw new Error('Marcador <div id="root"></div> não encontrado no dist/index.html');
pagina = pagina.replace(marcador, `<div id="root">${html}</div>`);

// O JS do site só roda depois da primeira pintura do HTML pronto: o download começa já (modulepreload, em paralelo),
// mas a execução e a hidratação ficam para o quadro seguinte. Assim o celular mostra a página antes de processar o JS.
const tag = pagina.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (!tag) throw new Error('Script do módulo não encontrado no dist/index.html');
pagina = pagina.replace(tag[0], `<link rel="modulepreload" crossorigin href="${tag[1]}">`);
const carregador = `<script>requestAnimationFrame(function(){setTimeout(function(){var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src='${tag[1]}';document.head.appendChild(s)},0)})</script>`;
pagina = pagina.replace('</body>', `${carregador}\n</body>`);
fs.writeFileSync(arq, pagina);
fs.rmSync(ssr, { recursive: true, force: true });
console.log(`pré-renderizado: ${Math.round(html.length / 1024)} KB de HTML no index.html`);
