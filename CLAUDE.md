# Prime Store — catálogo de tênis (Robson)

Página de vendas da Prime Store (Aparecida de Goiânia – GO): mostra os tênis do catálogo do fornecedor, separados por
marca, modelo e numeração, e leva o pedido para o WhatsApp do Robson. **Sem preços** (pedido do usuário, 25/10/2026).

- WhatsApp: (62) 98116-8032 (Robson) → `wa.me/5562981168032` (confirmado pelo usuário em 25/10/2026; o primeiro
  número passado, sem o 9, estava incompleto)
- Instagram: @prime.storego
- Material do cliente: `../PRIME STORE - SNEAKERS - ROBSON/` (logo 150 px, posts do Instagram, link do catálogo)
- Estilo pedido pelo cliente: preto com amarelo-ouro, "Seu estilo. / Sua presença.", botões em pílula, três destaques
  com fio dourado à esquerda (print enviado em 25/10/2026). Os textos do topo vieram desse print.

## Stack e comandos
Vite + React 18 + TypeScript + GSAP 3.13 (ScrollTrigger, Flip, Draggable, Inertia, DrawSVG) + Lenis. CSS puro com tokens.
- `npm run dev` / `npm run build` / `npm run lint`. O build faz tsc, o Vite, um build SSR de `src/entry-server.tsx` e
  `scripts/prerender.mjs`, que grava no `dist/index.html` o HTML da página no estado inicial (título, vitrine e catálogo
  aparecem antes do JS e o Google lê tudo). No navegador, sem `?` no endereço o React só hidrata (`hydrateRoot`); com
  filtros ou `?m=` renderiza por cima (`createRoot`). Nada pode ler `window` durante a renderização (só em efeitos).
- `npm run catalogo` atualiza o catálogo (ver abaixo); `npm run etiquetas` limpa as fotos novas; `node scripts/marca.mjs`
  refaz logo, ícones e posts.
- No Windows, os scripts chamam `node node_modules/...` direto: o `npx`/`.cmd` quebra com o "&" de "Huiatã & Lindy".

## Catálogo (o coração do site)
Fonte: https://sites.google.com/view/neffosx1carlos/início → um álbum do Google Fotos por numeração (18/19 … 48/49),
do fornecedor "Neffos X1". A mesma foto aparece em várias numerações: o script junta e guarda a lista de numerações.

`npm run catalogo` (ou `-- --offline` para usar os álbuns já baixados):
1. baixa os 22 álbuns (`catalogo/albuns.json`), identifica cada foto pela chave de conteúdo do Google e dá um id fixo
   (`catalogo/ids.json`, p001…);
2. junta fotos repetidas com chaves diferentes (`catalogo/duplicadas.json`, achadas por hash perceptual);
3. aplica `catalogo/classificacao.tsv` (id, marca, modelo, tipo, cor), classificado foto a foto em 25/10/2026;
4. usa a foto **sem as etiquetas do fornecedor** (`.catalogo-cache/limpa/`, ver "Etiquetas" abaixo), se existir;
5. revela cada foto no **LightCraft** (ArtCraft, `C:\Program Files\LightCraft\lightcraft-cli.exe`) com um ajuste leve e
   igual para todas: sombras +10, contraste +5, vibração +8, textura +14, clareza +4, **sem mexer nos realces** (fundo
   branco continua branco: 237 → 236). O automático do LightCraft acinzentava os brancos e foi descartado. Cache em
   `.catalogo-cache/revelada/`; `--sem-revelar` pula essa etapa; sem o LightCraft instalado, usa a original;
6. gera `public/fotos/<id>-{400,720,1080}.webp`, o `<id>-fundo.webp` (a própria foto com 96 px, desfocada: preenche o
   quadro quando a foto aparece inteira, no cartão de foto quadrada/deitada e no detalhe, no lugar de faixas de cor
   lisa) e `src/data/catalogo.json` (com `desde`: o dia em que a foto entrou no álbum, usado em "Chegaram agora").
   A data "Catálogo atualizado em" é a da leitura dos álbuns (arquivo `.catalogo-cache/albuns.json`): `--offline` não muda.
Foto nova sem linha na classificação **não entra** no site: o script lista os ids para classificar.
Para atualizar: `npm run catalogo` → classificar as novas no `.tsv` → `npm run etiquetas` → revisar as fotos novas
limpas → `npm run catalogo -- --offline` → build.

### Etiquetas (código, REF, cor, preço apagado) — tiradas das fotos em 25/10/2026
O fornecedor grava nas fotos o código de preço (ex.: W08W8Y10Y0, que parece o preço cifrado: 088/100), a REF, rótulos
de cor ("Preto branco", "Alta e baixa") e faixas brancas onde apagou preços. `npm run etiquetas` (scripts/etiquetas/):
1. `pilulas.mjs`: pílulas brancas com texto (fechamento morfológico) e faixas brancas lisas (inclusive grudadas noutra
   etiqueta: maior retângulo de branco puro com bordas nítidas);
2. `textos.mjs`: OCR do Windows (`ocr.ps1`) nas faixas de cima e de baixo; rótulos de código/REF/cor viram regiões;
3. `extras.mjs`: OCR ampliado dos cantos de cima (REF pequena sobre fundo claro que os outros passos perdem);
4. `juntar-manuais.mjs`: caixas da revisão visual em `catalogo/etiquetas-manuais.json` (texto no meio da foto,
   pílula preta, prints com faixas lisas → `recorte`, área difícil → `clone` de um pedaço parecido da própria foto).
   Pode rodar sobre o próprio `etiquetas.json`: tira as caixas da revisão anterior antes de pôr as atuais;
5. `limpar.mjs`: "Remove" do PhotoCraft em todas as regiões de uma vez (testado contra o preenchimento sensível ao
   conteúdo, que copiou pele e objetos). Resultado em `.catalogo-cache/limpa/`; regiões finais em `catalogo/etiquetas.json`.
   Depois do PhotoCraft, a faixa de 16 px junto à borda da foto é conferida: ele deixava uma lasca branca da pílula
   colada na beirada (40 fotos tinham, corrigidas em 26/10/2026).
   Caixa manual com `modo` não vai ao PhotoCraft e manda nas regiões automáticas que ela cobre:
   - `letras`: texto escrito direto na foto (sem pílula), em cima do pulso ou da mesa: refaz só os traços das letras,
     o resto fica intacto. `cor` (`escura`/`clara`) e `raio` (espessura máxima do traço) opcionais;
   - `forma`: pílula sobre pele ou superfície lisa: refaz só a pílula (pela cor, com as letras de dentro); `todas: true`
     pega todas as manchas da cor (rabisco em vários pedaços);
   - `suave`: a caixa inteira no preenchimento suave.
   Sobre textura (pedra, pelo, madeira, papelão) o PhotoCraft ainda é o melhor, com caixa só um pouco maior que a pílula:
   caixa grande faz ele copiar pedaços do tênis. Etiqueta numa faixa sem tênis (em cima): `recorte` resolve melhor.
   Para refazer só algumas fotos: `node scripts/etiquetas/juntar-manuais.mjs catalogo/etiquetas.json
   catalogo/etiquetas-manuais.json catalogo/etiquetas.json` → `node scripts/etiquetas/limpar.mjs .catalogo-cache/orig
   catalogo/etiquetas.json .catalogo-cache/limpa p006,p033` → `npm run catalogo -- --offline`.
Revisão de 25/10/2026: 968 regiões automáticas (731 pílulas/faixas, 231 pelo OCR, 6 dos cantos) + 35 caixas manuais,
5 recortes e 1 clone, nas 448 fotos — todas conferidas em folhas de contato.
Revisão em tamanho real de 26/10/2026 (o detalhe mostra a foto grande): os textos sobre o pulso viravam retângulos
borrados e o PhotoCraft copiava logo e pedaços de tênis para a pele (p533, p544, p006, p084). Refeitas com `letras` e
`forma`; p137, p208, p409 e p549 recortadas; contornos de pílula que sobravam (p071, p222, p419, p467, p646) fechados.
**Revise sempre em tamanho real** (folha original | limpa, recortada em volta de cada caixa), não em miniatura.
Ficaram de propósito: o texto de anúncios diagramados (p297, p299), marcas d'água de terceiros ("Dois AI" na p079 e o
brilho do Gemini em algumas) e o texto das caixas dos tênis.

Regras da classificação (não inventar):
- Modelo só com nome quando dá para reconhecer na foto ou o fornecedor escreveu (ex.: "Air Max TL 2.5", "NIKE DN").
  Sem certeza: "Corrida", "Casual", "Adventure", "Cano alto". Marca sem logo visível: `?` → "Outras marcas".
- Tipos no site: `tenis`, `chuteira`, `casual` (sapatênis/slip-on). Ficam fora `chinelo` (166), `bota` (16) e
  `sapato` (12): o pedido foi "mostrar apenas os tênis". Para incluir, mude `TIPOS_NO_SITE` em `scripts/catalogo.mjs`.
- As fotos trazem gravados um código (ex.: W05W2Y06Y0) e uma REF. O código se repete em tênis diferentes da mesma
  faixa: é a tabela de preço do fornecedor. Por isso o site não escreve código nem REF em texto; a mensagem do WhatsApp
  leva marca, modelo, cor, numeração e o link da foto (`/?m=p123`), que abre o tênis no site.
- Infantil = foto que só aparece nos álbuns 18/19 a 32/33. Personagens (Barbie, Sonic…) aparecem como "Infantil".

## Logo
Só existe a foto de perfil do Instagram (150 px), usada até 50 px na tela (nítida no iPhone). O VectorCraft vetorizou
bem a coroa, o "PR", "PRIME" e "STORE", mas perdeu os fios ao lado de "STORE", borrou "ROUPAS MASCULINAS" e trocou o
dourado em degradê por cor chapada: não foi usado, para não alterar a marca. Pedir ao cliente o arquivo original.

## Identidade
- Cores: preto `#0B0B0C`, grafite `#151517`/`#1F1F22`, amarelo-ouro `#F3B932` (botões), ouro velho `#C9A253` (logo,
  detalhes), marfim `#F6F2EA`. Fontes: Archivo (títulos, eixo de largura) + Outfit (texto), hospedadas em `public/fontes`.
- **Assinatura: o cadarço dourado.** Abertura "o ilhós se abre" (refeita em 25/10/2026 a pedido do usuário, ~3,4 s):
  um brilho dourado acende, dois anéis finos se desenham (a moldura da logo / o ilhós), os ilhós aparecem, o cadarço
  cruza e dá o laço dentro do anel, "PRIME" sobe letra por letra e "STORE" se fecha; então um furo redondo nasce no anel
  e cresce até revelar o site (máscara radial na cortina, com os anéis acompanhando a borda). Completa na 1ª visita da
  sessão, curta ao recarregar (~0,8 s), nenhuma com link `?m=` ou "reduzir movimento"; pula com toque, rolagem ou tecla.
  Ao longo: marcador de cadarço antes de cada título; "Como pedir" são ilhós ligados pelo cadarço. Fechamento: o cadarço
  contorna o botão "Chamar no WhatsApp" e dá o laço; o botão aperta. 404: o cadarço incompleto.
- Movimento: vitrine em pilha que se arrasta e joga (Draggable + Inertia), faixa de marcas que acelera com a rolagem,
  "Chegaram agora" (os 14 que entraram por último no catálogo, com o dia), filtros com Flip, cartões que "pousam" ao
  entrar, foto do tênis que amplia 2,2× no toque/clique e passeia com o dedo/mouse. Nada das revelações do portfólio.

## Verificação (aprendido aqui)
- Chrome de teste com perfil dentro do Temp do usuário ("HUIAT&~1") leva ~6 s no primeiro `sessionStorage` e infla o
  LCP. Para medir tempo, use perfil em caminho simples (ex.: `C:/Users/Public/...`). Fora do teste não acontece.
- Grade com faixas `max-content` dentro: use `grid-template-columns: minmax(0, 1fr)` ou a página alarga.
- `naturalWidth` de imagem com `srcset` vem dividido pela densidade: o alerta "dpr3 > 1" da auditoria é falso nesses casos.
- Lighthouse: rodar com `TEMP`/`TMP` apontando para `C:\Users\Public\...` (mesmo problema do perfil). Local, 26/10/2026,
  com a pré-renderização: computador 100; celular 88–90 em desempenho e 100 em acessibilidade, boas práticas e SEO.
- **Pré-renderização sem estragar o LCP** (aprendido na marra): com o HTML pronto, o navegador enxerga todas as fotos e
  começa a baixar dezenas delas junto com a principal (o celular caiu para 73). Por isso: só a carta de cima da vitrine
  vem no HTML (as outras entram no `requestIdleCallback`); as seções abaixo da dobra usam `useFotosPerto` (o HTML sai
  sem as `<img>`, que entram quando a seção chega perto); e o `prerender.mjs` troca a tag do módulo por
  `modulepreload` + um carregador que executa o JS depois do primeiro quadro.
- Neste PC o Chrome de teste leva ~500 ms para a primeira pintura de qualquer página com conteúdo (pinta por software),
  com ou sem JS. Não é defeito do site; compare antes e depois na mesma máquina.
- **Nos testes, role com `window.scrollTo`, não com `scrollIntoView`**: no celular emulado pelo CDP o `scrollIntoView`
  para 85% da altura da tela antes do alvo (vale também sem o Lenis). A navegação do site (âncoras e marcas) chega certo.
- **Filho com `position: absolute` escapa do `overflow: hidden` de quem não é posicionado** e alarga a página no Safari
  (o Chrome esconde por causa do `overflow-x: clip` do `body`). Foi um texto "visualmente oculto" dentro da faixa do
  Instagram: 331 px de rolagem lateral só no iPhone. `.trilho__janela` agora é `position: relative`.
- **Não montar animação abaixo da dobra na abertura**: cada `useGSAP` que grava estilo e mede layout força um reflow da
  página inteira. As seções usam `usePerto` (`src/lib/perto.ts`) e só montam perto da tela. Isso tirou o celular de 81
  para 86–87 e o TBT de 460 para ~70–270 ms. O conteúdo do topo não usa opacidade 0 (fica pronto sob a cortina).
- **Draggable: decidir no `onDragEnd`, não no `onRelease`** (lá o `isDragging` do GSAP já vem falso; foi por isso que
  a vitrine não jogava a carta).
- O teste dos navegadores pode acusar `NS_BINDING_ABORTED` no Firefox: é o navegador cancelando um download de foto
  (troca de versão do `srcset`). Repita o cenário; se passar, não é defeito.

## Publicação
No ar desde 25/10/2026 em **https://prime-store-sneakers.vercel.app** (publicação autorizada pelo usuário).
- GitHub: `Roccogolden/prime-store-sneakers` (público, como os outros sites de clientes). O credential helper local
  está fixado na conta Roccogolden (a conta ativa do `gh` neste PC é outra), com a identidade
  `Huiatã Ribeiro <223874481+Roccogolden@users.noreply.github.com>`.
- Vercel: projeto `prime-store-sneakers` no time `huiataribeiro-6837`, ligado ao repositório (o primeiro
  `deploy --prod --yes` já conectou o GitHub). **Push na `main` publica sozinho** (conferido: status "Vercel" success
  em ~30 s no commit). A CLI acrescenta `.vercel` ao `.gitignore` ao ligar o projeto; não precisa repetir a linha.
- Publicar pela CLI: `npm i vercel --ignore-scripts` numa pasta de rascunho (o script do esbuild falha nesse caminho e não
  faz falta) e `node <pasta>/node_modules/vercel/dist/index.js deploy --prod --scope huiataribeiro-6837`, a partir
  desta pasta. `.vercelignore` deixa de fora as fotos originais.
- Depois de publicar: HTML no ar com consulta anti-cache (`curl -s ".../?n=$RANDOM"`), fotos e fontes com 200, e
  `testar-navegadores.mjs` no endereço real.

## Pendências e decisões em aberto (25/10/2026)
- **Logos das marcas na faixa** (pedido do usuário): esperando ele confirmar se os tênis são originais. Originais: a Lei
  9.279/96, art. 132, deixa a loja usar a marca do produto que revende; aí entram logos monocromáticas na faixa (Simple
  Icons tem Nike, Adidas, New Balance, Puma e Fila; o "hugo" de lá é a linha HUGO, não a BOSS das fotos). Se não forem
  originais, manter só os nomes: logo oficial é o que costuma gerar notificação e derrubada do site.
- Logo original da Prime em alta (só existe a do Instagram, 150 px).
- 206 dos 448 modelos têm nome genérico ("Corrida", "Casual"…): revisar com o Robson.
- Fotos próprias dos mais vendidos (as do fornecedor já estão sem etiquetas, mas fotos da loja dão mais confiança).
- Domínio próprio, Google Analytics com aviso de cookies (medir cliques no WhatsApp) e ficha no Google.
