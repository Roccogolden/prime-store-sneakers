// Kit de Lançamento da Prime Store: monta a peça pedida em ?peca= a partir de window.DADOS (gerar-kit.mjs).
// Identidade do site: preto, ouro, Archivo + Outfit e o cadarço dourado. window.__pronto resolve quando fontes e
// imagens carregaram; window.__tela traz o buraco do celular no vídeo.
(() => {
  const D = window.DADOS;
  const params = new URLSearchParams(location.search);
  const peca = params.get('peca');

  const esc = (texto) => String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // as fontes do próprio site (os mesmos arquivos de public/fontes)
  const estilo = document.createElement('style');
  estilo.textContent = `
    @font-face { font-family: 'Archivo'; font-weight: 500 900; font-stretch: 75% 125%; src: url('${D.fontes.titulo}') format('woff2'); }
    @font-face { font-family: 'Outfit'; font-weight: 400 700; src: url('${D.fontes.texto}') format('woff2'); }`;
  document.head.append(estilo);

  const ICONES = {
    grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    sacola: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    brilho: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    regua: '<rect x="2.5" y="8" width="19" height="8" rx="1.6"/><path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    whatsapp: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 19z"/><path d="M9 9.2c.3 2.4 2.4 4.6 4.9 5.2l1.2-1.2 1.9.8"/>',
  };
  const icone = (nome, largura = 1.3) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

  // o cadarço chato dourado do site: fita com trama em diagonal e um laço no meio
  const cadarco = (largura = 760) => `
    <svg class="cadarco" viewBox="0 0 ${largura} 60" width="${largura}" height="60" aria-hidden="true">
      <defs>
        <linearGradient id="ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76e"/><stop offset=".55" stop-color="#f3b932"/><stop offset="1" stop-color="#b98a22"/></linearGradient>
        <pattern id="trama" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="url(#ouro)"/><path d="M0 0v9" stroke="#8a6416" stroke-opacity=".35" stroke-width="2"/></pattern>
      </defs>
      <rect x="0" y="25" width="${largura / 2 - 46}" height="10" rx="5" fill="url(#trama)"/>
      <rect x="${largura / 2 + 46}" y="25" width="${largura / 2 - 46}" height="10" rx="5" fill="url(#trama)"/>
      <path d="M${largura / 2} 30c-18-22-52-24-50-2 2 20 34 10 50 2zM${largura / 2} 30c18-22 52-24 50-2-2 20-34 10-50 2z" fill="none" stroke="url(#ouro)" stroke-width="9" stroke-linejoin="round"/>
      <circle cx="${largura / 2}" cy="30" r="9" fill="url(#ouro)"/>
    </svg>`;

  const marca = () =>
    `<div class="marca"><img src="${D.logo}" alt=""><span>PRIME <b>STORE</b></span></div>`;
  const site = (chamada) =>
    `<div class="site">${chamada ? `<small>${esc(chamada)}</small>` : ''}<strong>${esc(D.site)}</strong></div>`;
  const foto = (src, classe = '') => `<figure class="foto ${classe}"><img src="${src}" alt=""></figure>`;

  const C = D.catalogo;
  const pecas = {
    lancamento: () => `
      <section class="tela"><div class="miolo">
        ${marca()}
        <p class="rotulo">Novidade</p>
        <h1 class="titulo">O catálogo<br>da Prime<br><em>está no ar</em></h1>
        <div class="par">${D.fotos.lancamento.map((f, i) => foto(f, i ? 'foto--baixa' : 'foto--alta')).join('')}</div>
        <p class="legenda"><b>${C.total} modelos</b> · tênis, chuteiras e infantil</p>
        ${site('Escolha pelo site')}
      </div></section>`,

    pedir: () => `
      <section class="tela"><div class="miolo">
        ${marca()}
        <h1 class="titulo titulo--medio">Peça em<br><em>3 passos</em></h1>
        <div class="pedir">
          <div class="celular"><img src="${D.capturas.pedido}" alt=""></div>
          <ol class="ilhoses">${D.passos
            .map((p, i) => `<li><span class="ilhos">${i + 1}</span><div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div></li>`)
            .join('')}</ol>
        </div>
        ${site('Escolha pelo site')}
      </div></section>`,

    catalogo: () => `
      <section class="tela"><div class="miolo">
        ${marca()}
        <h1 class="titulo">Do infantil<br><em>ao 48</em></h1>
        <ul class="fatos">
          <li><b>${C.total}</b><span>modelos no catálogo</span></li>
          <li><b>${C.linhas.length}</b><span>${esc(C.linhas.join(', ').replace(/, ([^,]*)$/, ' e $1').toLowerCase())}</span></li>
          <li><b>18/19</b><span>até 48/49: filtre pela sua numeração</span></li>
        </ul>
        <div class="trio">${D.fotos.catalogo.map((f) => foto(f)).join('')}</div>
        <p class="nota">Sem preço no site: valor e entrega você combina com o ${esc(D.atendente)} no WhatsApp.</p>
        ${site('Veja tudo no site')}
      </div></section>`,

    novidades: () => `
      <section class="tela tela--brilho"><div class="miolo">
        ${marca()}
        <p class="rotulo">Chegaram por último</p>
        <h1 class="titulo">Novidades<br><em>no catálogo</em></h1>
        <div class="grade">${D.fotos.novidades.slice(0, 4).map((f) => foto(f)).join('')}</div>
        ${site('Veja todas no site')}
      </div></section>`,

    entrega: () => `
      <section class="tela"><div class="miolo">
        ${marca()}
        <div class="icone-grande">${icone('pin', 1.1)}</div>
        <h1 class="titulo">Entrega<br><em>na região</em></h1>
        <div class="bloco">
          <p class="bloco__forte">${esc(D.regiao)}</p>
          <p>Pedido e combinação pelo WhatsApp</p>
        </div>
        ${cadarco(640)}
        <div class="bloco bloco--contato">
          <p>${icone('whatsapp', 1.5)}<span>${esc(D.telefone)} · ${esc(D.atendente)}</span></p>
          <p class="arroba">${esc(D.instagram)}</p>
        </div>
        ${site('Escolha pelo site')}
      </div></section>`,

    destaque: () => `<section class="tela destaque"><div class="destaque__circulo">${icone(params.get('icone'), 1.15)}</div></section>`,

    // tela final do vídeo (2,4 s) e capa dele no status
    final: () => `
      <section class="tela"><div class="miolo miolo--centro">
        <img class="logo-grande" src="${D.logo}" alt="">
        <p class="marca-grande">PRIME <b>STORE</b></p>
        ${cadarco(560)}
        <h1 class="titulo titulo--medio">Escolha<br><em>pelo site</em></h1>
        <div class="site site--solto"><strong>${esc(D.site)}</strong></div>
        <p class="contatos">${esc(D.instagram)} · ${esc(D.telefone)}</p>
      </div></section>`,

    // imagem quadrada para grupos do WhatsApp
    grupos: () => `
      <section class="quadrado">
        <div class="quadrado__texto">
          ${marca()}
          <h1 class="titulo titulo--quadrado">O catálogo<br>da Prime<br><em>está no ar</em></h1>
          <p class="sub">${C.total} modelos de tênis, chuteiras e infantil, ${esc(C.numeracoes)}.</p>
          <div class="quadrado__dados">
            <p>${esc(D.cidade)}</p>
            <p>Entrega na região</p>
            <p>WhatsApp ${esc(D.telefone)}</p>
          </div>
          <div class="site site--solto"><strong>${esc(D.site)}</strong></div>
        </div>
        <div class="celular celular--quadrado"><img src="${D.capturas.capa}" alt=""></div>
      </section>`,

    // cartão A6 (10,5 x 14,8 cm) para ir junto com cada entrega
    cartao: () => {
      const qr = window.qrcode(0, 'M');
      qr.addData(D.links.qr);
      qr.make();
      return `
      <section class="cartao">
        ${marca()}
        <h1 class="titulo">Veja o catálogo<br><em>completo</em></h1>
        <p class="sub">Aponte a câmera do celular</p>
        <div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div>
        <p class="url">${esc(D.site)}</p>
        <p class="contatos">${esc(D.instagram)} · ${esc(D.telefone)}</p>
      </section>`;
    },

    video: () => {
      const w = 470;
      const h = Math.round((w * 844) / 390);
      const x = (1080 - w) / 2;
      const y = 430;
      window.__tela = { x, y, w, h };
      return `
      <section class="tela video">
        <div class="buraco" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>
        <div class="aparelho" style="left:${x - 16}px;top:${y - 16}px;width:${w + 32}px;height:${h + 32}px"></div>
        <div class="topo-video">${marca()}<h1 class="titulo titulo--medio">O catálogo <em>está no ar</em></h1></div>
        <div class="base-video">${site('Escolha pelo site')}</div>
      </section>`;
    },
  };

  if (!pecas[peca]) throw new Error(`peça desconhecida: ${peca}`);
  document.getElementById('peca').innerHTML = pecas[peca]();

  window.__pronto = (async () => {
    await Promise.all([
      document.fonts.load("900 80px 'Archivo'"),
      document.fonts.load("700 40px 'Archivo'"),
      document.fonts.load("400 40px 'Outfit'"),
      document.fonts.load("600 40px 'Outfit'"),
    ]);
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.decode().catch(() => {
          throw new Error(`imagem não carregou: ${img.src}`);
        }),
      ),
    );
    return true;
  })();
})();
