// Kit de Lançamento da Prime Store, adaptado do gerador da skill site-premium (references/comercial/kit-lancamento):
// as peças são as da Prime (catálogo, como pedir, novidades, entrega), os links levam a origem (?origem=) para o
// painel do Robson, e o cartão A6 vai junto com cada entrega (QR conferido). As capturas e o vídeo usam o build local
// (vite preview --port 4173) e marcam "não contar este aparelho", para não somar visitas no painel.
// Uso: node kit-lancamento/gerar-kit.mjs kit-lancamento/dados.json [--sem-video]
// Precisa de Chrome, ffmpeg e internet (Google Fonts, qrcode-generator e jsQR pelo jsDelivr).
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MODELO = pathToFileURL(join(AQUI, 'modelos', 'kit.html')).href;
const NAO_CONTAR = "try { localStorage.setItem('prime-nao-contar', '1') } catch {}";
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9400 + Math.floor(Math.random() * 100);

const args = process.argv.slice(2);
const arquivoDados = args.find((a) => !a.startsWith('--'));
if (!arquivoDados) {
  console.error('Uso: node gerar-kit.mjs <dados.json> [--sem-video]');
  process.exit(1);
}
const semVideo = args.includes('--sem-video');
const pastaDados = dirname(resolve(arquivoDados));
const dados = JSON.parse(readFileSync(arquivoDados, 'utf8'));
const saida = resolve(pastaDados, dados.saida || 'entrega');
// Quadros do vídeo, prints e perfil do Chrome ficam na pasta temporária do sistema, fora da entrega.
const trabalho = mkdtempSync(join(tmpdir(), 'kit-lancamento-'));
mkdirSync(join(saida, 'destaques'), { recursive: true });

// Caminhos do dados.json são relativos à pasta dele; no modelo viram file://.
const arquivoUrl = (caminho) => pathToFileURL(isAbsolute(caminho) ? caminho : resolve(pastaDados, caminho)).href;
dados.logo = arquivoUrl(dados.logo);
dados.fontes = { titulo: arquivoUrl(dados.fontes.titulo), texto: arquivoUrl(dados.fontes.texto) };
for (const k of Object.keys(dados.fotos)) dados.fotos[k] = dados.fotos[k].map(arquivoUrl);
// o mesmo fundo da tela, nas emendas do vídeo
dados.cores = { fundo: '#0b0b0c' };

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const tamanho = (arq) => {
  const kb = statSync(arq).size / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

// ---------- Chrome DevTools Protocol ----------

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${join(trabalho, 'perfil')}`,
  '--no-first-run',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  'about:blank',
]);

async function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, erro) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', erro, { once: true });
  });
  let id = 0;
  const pendentes = new Map();
  const ouvintes = new Set();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, erro } = pendentes.get(m.id);
      pendentes.delete(m.id);
      if (m.error) erro(new Error(m.error.message));
      else ok(m.result);
    } else {
      ouvintes.forEach((f) => f(m));
    }
  });
  const enviar = (method, params = {}) =>
    new Promise((ok, erro) => {
      const i = ++id;
      pendentes.set(i, { ok, erro });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evento = (method, ms = 60000) =>
    new Promise((ok, erro) => {
      const f = (m) => {
        if (m.method !== method) return;
        clearTimeout(t);
        ouvintes.delete(f);
        ok(m.params);
      };
      const t = setTimeout(() => {
        ouvintes.delete(f);
        erro(new Error(`tempo esgotado esperando ${method}`));
      }, ms);
      ouvintes.add(f);
    });
  const ouvir = (f) => {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  };
  return { enviar, evento, ouvir, fechar: () => ws.close() };
}

async function novaAba() {
  for (let i = 0; i < 50; i++) {
    try {
      const alvo = await (await fetch(`http://127.0.0.1:${PORTA}/json/new?about:blank`, { method: 'PUT' })).json();
      const aba = await conectar(alvo.webSocketDebuggerUrl);
      await aba.enviar('Page.enable');
      await aba.enviar('Runtime.enable');
      aba.ouvir((m) => {
        if (m.method === 'Runtime.exceptionThrown') {
          console.error('  erro na página:', m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
        }
      });
      return aba;
    } catch {
      await esperar(200);
    }
  }
  throw new Error('o Chrome não abriu');
}

async function abrir(aba, url) {
  const carregou = aba.evento('Page.loadEventFired');
  await aba.enviar('Page.navigate', { url });
  await carregou;
}

async function avaliar(aba, expressao) {
  const r = await aba.enviar('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

const tela = (aba, largura, altura, escala = 1, celular = false) =>
  aba.enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: escala, mobile: celular });

// Rola a página por um roteiro de seções, com aceleração suave (roda dentro do site).
function rolarRoteiro(passos) {
  const curva = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const rolar = (alvo, ms) =>
    new Promise((pronto) => {
      const y0 = scrollY;
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / ms);
        scrollTo({ top: y0 + (alvo - y0) * curva(p), behavior: 'instant' });
        if (p < 1) requestAnimationFrame(passo);
        else pronto();
      };
      requestAnimationFrame(passo);
    });
  return (async () => {
    for (const p of passos) {
      const el = p.rolarAte === 'topo' ? null : document.querySelector(p.rolarAte);
      if (p.rolarAte !== 'topo' && !el) throw new Error(`não achei ${p.rolarAte}`);
      const alvo = el ? Math.max(0, el.getBoundingClientRect().top + scrollY - (p.margem || 0)) : 0;
      await rolar(alvo, p.duracaoMs || 1600);
      await espera(p.pausaMs ?? 1000);
    }
    return true;
  })();
}

// ---------- Etapas ----------

async function gravarSite(cfg) {
  const aba = await novaAba(); // aba nova: a abertura do site toca completa
  await aba.enviar('Page.addScriptToEvaluateOnNewDocument', { source: NAO_CONTAR });
  await tela(aba, 390, 844, 2, true);
  const pasta = join(trabalho, 'quadros');
  mkdirSync(pasta, { recursive: true });
  const quadros = [];
  aba.ouvir((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    const nome = `q${String(quadros.length).padStart(5, '0')}.jpg`;
    writeFileSync(join(pasta, nome), Buffer.from(m.params.data, 'base64'));
    quadros.push({ nome, t: m.params.metadata.timestamp });
    aba.enviar('Page.screencastFrameAck', { sessionId: m.params.sessionId });
  });
  const montou = aba.evento('Page.domContentEventFired');
  const carregou = aba.evento('Page.loadEventFired');
  await aba.enviar('Page.navigate', { url: cfg.url });
  await montou;
  await aba.enviar('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await carregou;
  await esperar(cfg.inicioMs ?? 3200);
  await avaliar(aba, `(${rolarRoteiro})(${JSON.stringify(cfg.roteiro)})`);
  await esperar(cfg.finalMs ?? 1200);
  const fim = Date.now() / 1000;
  await aba.enviar('Page.stopScreencast');
  aba.fechar();
  if (quadros.length < 10) throw new Error(`a gravação teve só ${quadros.length} quadros`);
  // Lista do ffmpeg: cada quadro dura até o próximo chegar.
  const linhas = quadros.map((q, i) => `file '${q.nome}'\nduration ${((quadros[i + 1]?.t ?? fim) - q.t).toFixed(4)}`);
  linhas.push(`file '${quadros.at(-1).nome}'`);
  writeFileSync(join(pasta, 'lista.txt'), linhas.join('\n'));
  return { lista: join(pasta, 'lista.txt'), duracao: fim - quadros[0].t, total: quadros.length };
}

async function capturarSite(cfg, destino) {
  const aba = await novaAba();
  await aba.enviar('Page.addScriptToEvaluateOnNewDocument', { source: NAO_CONTAR });
  await tela(aba, 390, 844, 3, true);
  await abrir(aba, cfg.url);
  await esperar(cfg.esperarMs ?? 4500);
  const alturaCss = cfg.alturaCss || 560;
  if (cfg.rolarAte && cfg.rolarAte !== 'topo') {
    await avaliar(aba, `(() => { const el = document.querySelector(${JSON.stringify(cfg.rolarAte)}); if (!el) throw new Error('não achei ${cfg.rolarAte}'); scrollTo({ top: el.getBoundingClientRect().top + scrollY - ${cfg.margem || 0}, behavior: 'instant' }); return true; })()`);
  }
  await esperar(1500);
  // O recorte usa coordenadas da página inteira: começa onde a rolagem parou.
  const topo = await avaliar(aba, 'scrollY');
  const { data } = await aba.enviar('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: topo, width: 390, height: alturaCss, scale: 1 },
  });
  writeFileSync(destino, Buffer.from(data, 'base64'));
  aba.fechar();
}

async function renderizar(aba, peca, { largura = 1080, altura = 1920, escala = 1, formato = 'jpeg', transparente = false, extra = '' } = {}) {
  await tela(aba, largura, altura, escala);
  if (transparente) await aba.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await abrir(aba, `${MODELO}?peca=${peca}${extra}`);
  await avaliar(aba, 'window.__pronto');
  const { data } = await aba.enviar('Page.captureScreenshot', {
    format: formato,
    ...(formato === 'jpeg' ? { quality: 92 } : {}),
    clip: { x: 0, y: 0, width: largura, height: altura, scale: 1 },
  });
  if (transparente) await aba.enviar('Emulation.setDefaultBackgroundColorOverride', {});
  return Buffer.from(data, 'base64');
}

async function lerQr(aba, png) {
  return avaliar(aba, `new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    s.onerror = () => erro(new Error('o jsQR não carregou'));
    s.onload = () => {
      const img = new Image();
      img.onerror = () => erro(new Error('imagem do cartão'));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height);
        const r = jsQR(d.data, c.width, c.height);
        ok(r ? r.data : null);
      };
      img.src = 'data:image/png;base64,${png.toString('base64')}';
    };
    document.head.append(s);
  })`);
}

// Gravação dentro do celular + tela final de 2,4 s (que também é a capa do vídeo).
const FINAL_S = 2.4;
const FUSAO_S = 0.5;

function montarVideo(gravacao, frente, buraco, telaFinal, destino) {
  const { x, y, w, h } = buraco;
  const d = gravacao.duracao;
  const total = d - FUSAO_S + FINAL_S + FUSAO_S;
  const filtro = [
    `[0:v]fps=30,scale=${w}:${h}:flags=lanczos,setsar=1[tela]`,
    `[2:v][tela]overlay=${x}:${y}:shortest=1[base]`,
    `[base][1:v]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.4:color=${dados.cores.fundo},format=yuv420p,fps=30,settb=AVTB[corpo]`,
    `[3:v]scale=1080:1920,setsar=1,format=yuv420p,fps=30,settb=AVTB[fim]`,
    `[corpo][fim]xfade=transition=fade:duration=${FUSAO_S}:offset=${(d - FUSAO_S).toFixed(2)},scale=out_range=tv,format=yuv420p[v]`,
  ].join(';');
  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', gravacao.lista,
    '-loop', '1', '-i', frente,
    '-f', 'lavfi', '-i', `color=c=${dados.cores.fundo}:s=1080x1920:r=30`,
    '-loop', '1', '-t', (FINAL_S + FUSAO_S + 0.2).toFixed(2), '-i', telaFinal,
    '-filter_complex', filtro, '-map', '[v]',
    '-t', total.toFixed(2), '-r', '30',
    // yuv420p (não yuvj420p, que vem dos quadros jpeg): é o que o WhatsApp e o Instagram tocam sem problema.
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
    '-movflags', '+faststart', destino,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.slice(-1500)}`);
}

function folhaDePrevia(arquivos, destino) {
  const entradas = arquivos.flatMap((a) => ['-i', a]);
  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', ...entradas,
    '-filter_complex', `${arquivos.map((_, i) => `[${i}:v]`).join('')}hstack=${arquivos.length},scale=2400:-2`,
    '-frames:v', '1', '-q:v', '3', destino,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg (prévia): ${r.stderr.slice(-800)}`);
}

function textosProntos() {
  const { cliente, site, siteUrl, links, catalogo: C, atendente, cidade, telefone, instagram } = dados;
  const W = links.whatsapp;
  const I = links.instagram;
  return `KIT DE LANÇAMENTO · ${cliente}
Gerado em ${new Date().toLocaleDateString('pt-BR')}. Tudo aqui usa só dados reais do site.

ARQUIVOS
- 01 a 05: imagens para status do WhatsApp e stories do Instagram (1080x1920)
- 06-video-site-no-celular.mp4: o site rodando no celular (06-capa-do-video.jpg é a capa)
- 07-grupos.jpg: imagem quadrada para mandar em grupos do WhatsApp
- destaques/: capas para os destaques do Instagram
- cartao-A6.pdf: cartão com QR code para imprimir e mandar junto com cada entrega

OS LINKS JÁ DIZEM DE ONDE A PESSOA VEIO
Use o link de cada lugar como está aqui. Assim o painel mostra quantas visitas vieram do WhatsApp, do Instagram e
do cartão impresso.
- WhatsApp (status, grupos, perfil): ${W}
- Instagram (bio e figurinha de link nos stories): ${I}
- Cartão impresso (QR code): ${links.qr}

1) STATUS DO WHATSAPP · uma peça por dia, com este texto (o link fica clicável no status)
Dia 1 · imagem 01: O catálogo da ${cliente} está no ar! São ${C.total} modelos, do infantil ao 48. Escolha pelo site e chame no WhatsApp: ${W}
Dia 2 · vídeo 06: Olha como ficou: dá para filtrar por marca, modelo e numeração e ver cada tênis de perto. ${W}
Dia 3 · imagem 02: Pedir ficou fácil: escolha o tênis, toque em "Pedir no WhatsApp" e a mensagem chega pronta, com o modelo, a cor, a numeração e a foto. ${W}
Dia 4 · imagem 03: Tênis, chuteiras e infantil, ${C.numeracoes}. Veja tudo no site: ${W}
Dia 5 · imagem 04: Tem modelo novo no catálogo. Veja os que chegaram por último: ${W}
Dia 6 · imagem 05: Entrega em ${cidade.split(' — ')[0]} e região. Escolha pelo site e combine no WhatsApp: ${W}
Dia 7 · repita o vídeo 06.

MENSAGEM PARA GRUPOS DO WHATSAPP · com a imagem 07
O catálogo da ${cliente} está no ar: ${C.total} modelos de tênis, chuteiras e infantil, ${C.numeracoes}. Dá para separar vários pares na sacola e mandar tudo numa mensagem só. ${W}

2) STORIES DO INSTAGRAM
Use as mesmas peças. Em cada story: Figurinhas > Link > cole ${I}
Ponha a figurinha no espaço livre logo acima do endereço do site.
Depois salve nos Destaques, usando as capas da pasta "destaques".

3) POST DE LANÇAMENTO NO FEED (imagem 01 ou o vídeo 06)
O catálogo da ${cliente} agora está no site: ${C.total} modelos de tênis, chuteiras e infantil, ${C.numeracoes}.
Filtre por ${C.filtros}, separe os pares na sacola e mande tudo numa mensagem só pelo WhatsApp. Valor, pagamento e entrega você combina na conversa com o ${atendente}.

🔗 Link na bio
📍 ${cidade} · entrega na região

4) BIO DO INSTAGRAM
Tênis, chuteiras e infantil · do 18/19 ao 48/49
${cidade} · entrega na região
Catálogo completo 👇
Campo "Link": ${I}

5) WHATSAPP BUSINESS
- Perfil > Site: ${W}
- Mensagem de saudação: Olá! Obrigado por chamar a ${cliente}. O catálogo completo, com fotos e numerações, está em ${W} — escolha o modelo e mande por aqui.
- Resposta rápida "/catalogo": ${W}

6) PERFIL DA EMPRESA NO GOOGLE (se tiver)
Editar perfil > Contato > Site: ${siteUrl}

7) CARTÃO A6 (vai junto com cada entrega)
Imprima cartao-A6.pdf em tamanho real (A6, 10,5 x 14,8 cm), em papel couchê fosco 250 g ou mais.
Ponha um cartão em cada caixa entregue: quem recebe aponta a câmera e volta ao catálogo.
O QR code abre ${site} (e o painel conta essas visitas como "Cartão (QR code)").

Contatos: ${instagram} · WhatsApp ${telefone}
`;
}

// ---------- Execução ----------

try {
  const passos = [];
  let gravacao = null;
  if (!semVideo && dados.video) {
    process.stdout.write('· gravando o site no celular... ');
    gravacao = await gravarSite(dados.video);
    console.log(`${gravacao.total} quadros, ${gravacao.duracao.toFixed(1)} s`);
  }

  for (const [nome, cfg] of Object.entries(dados.capturas || {})) {
    const destino = join(trabalho, `captura-${nome}.png`);
    await capturarSite(cfg, destino);
    dados.capturas[nome] = pathToFileURL(destino).href;
  }

  const aba = await novaAba();
  await aba.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.DADOS = ${JSON.stringify(dados)};` });

  const stories = dados.stories.map((s) => [s.peca, s.arquivo]);
  for (const [peca, nome] of stories) {
    const destino = join(saida, nome);
    writeFileSync(destino, await renderizar(aba, peca));
    passos.push(destino);
  }

  const grupos = join(saida, '07-grupos.jpg');
  writeFileSync(grupos, await renderizar(aba, 'grupos', { altura: 1080 }));
  passos.push(grupos);

  const telaFinal = join(saida, '06-capa-do-video.jpg');
  writeFileSync(telaFinal, await renderizar(aba, 'final'));
  passos.push(telaFinal);

  for (const d of dados.destaques || []) {
    const destino = join(saida, 'destaques', `destaque-${d.nome}.png`);
    writeFileSync(destino, await renderizar(aba, 'destaque', { formato: 'png', extra: `&icone=${d.icone}` }));
    passos.push(destino);
  }

  // Cartão: PDF em tamanho real + PNG para conferir o QR code
  await tela(aba, 397, 560);
  await abrir(aba, `${MODELO}?peca=cartao`);
  await avaliar(aba, 'window.__pronto');
  const { data: pdf } = await aba.enviar('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  const cartaoPdf = join(saida, 'cartao-A6.pdf');
  writeFileSync(cartaoPdf, Buffer.from(pdf, 'base64'));
  passos.push(cartaoPdf);
  const cartaoPng = await renderizar(aba, 'cartao', { largura: 397, altura: 560, escala: 3, formato: 'png' });
  writeFileSync(join(trabalho, 'cartao.png'), cartaoPng);
  const lido = await lerQr(aba, cartaoPng);
  if (lido !== dados.links.qr) throw new Error(`o QR code leu "${lido}", esperado "${dados.links.qr}"`);
  console.log(`✓ QR code conferido: abre ${lido}`);

  if (gravacao) {
    const frente = join(trabalho, 'frente-video.png');
    writeFileSync(frente, await renderizar(aba, 'video', { formato: 'png', transparente: true }));
    const buraco = await avaliar(aba, 'window.__tela');
    const video = join(saida, '06-video-site-no-celular.mp4');
    montarVideo(gravacao, frente, buraco, telaFinal, video);
    passos.push(video);
  }
  aba.fechar();

  folhaDePrevia(stories.map(([, nome]) => join(saida, nome)), join(saida, '00-previa-stories.jpg'));
  writeFileSync(join(saida, 'textos-prontos.txt'), textosProntos(), 'utf8');

  console.log(`\nKit em ${saida}`);
  for (const arq of [join(saida, '00-previa-stories.jpg'), ...passos, join(saida, 'textos-prontos.txt')]) {
    console.log(`  ${arq.replace(saida, '.').replaceAll('\\', '/')}  ${tamanho(arq)}`);
  }
} catch (erro) {
  console.error(`✗ ${erro.message}`);
  process.exitCode = 1;
} finally {
  // O Chrome precisa fechar antes de a pasta temporária (com o perfil dele) ser apagada.
  const fechou = new Promise((ok) => chrome.once('exit', ok));
  chrome.kill();
  await Promise.race([fechou, esperar(5000)]);
  try {
    rmSync(trabalho, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  } catch {
    console.log(`(a pasta temporária ${trabalho} ficou para trás; pode apagar)`);
  }
}
