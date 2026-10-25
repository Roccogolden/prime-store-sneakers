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
- `npm run dev` / `npm run build` (tsc + vite) / `npm run lint`
- `npm run catalogo` atualiza o catálogo (ver abaixo); `node scripts/marca.mjs` refaz logo, ícones e posts.
- No Windows, os scripts chamam `node node_modules/...` direto: o `npx`/`.cmd` quebra com o "&" de "Huiatã & Lindy".

## Catálogo (o coração do site)
Fonte: https://sites.google.com/view/neffosx1carlos/início → um álbum do Google Fotos por numeração (18/19 … 48/49),
do fornecedor "Neffos X1". A mesma foto aparece em várias numerações: o script junta e guarda a lista de numerações.

`npm run catalogo` (ou `-- --offline` para usar os álbuns já baixados):
1. baixa os 22 álbuns (`catalogo/albuns.json`), identifica cada foto pela chave de conteúdo do Google e dá um id fixo
   (`catalogo/ids.json`, p001…);
2. junta fotos repetidas com chaves diferentes (`catalogo/duplicadas.json`, achadas por hash perceptual);
3. aplica `catalogo/classificacao.tsv` (id, marca, modelo, tipo, cor), classificado foto a foto em 25/10/2026;
4. revela cada foto no **LightCraft** (ArtCraft, `C:\Program Files\LightCraft\lightcraft-cli.exe`) com um ajuste leve e
   igual para todas: sombras +10, contraste +5, vibração +8, textura +14, clareza +4, **sem mexer nos realces** (fundo
   branco continua branco: 237 → 236). O automático do LightCraft acinzentava os brancos e foi descartado. Cache em
   `.catalogo-cache/revelada/`; `--sem-revelar` pula essa etapa; sem o LightCraft instalado, usa a original;
5. gera `public/fotos/<id>-{400,720,1080}.webp` e `src/data/catalogo.json`.
Foto nova sem linha na classificação **não entra** no site: o script lista os ids para classificar.

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
- **Assinatura: o cadarço dourado.** Abertura: ilhós aparecem, o cadarço cruza de baixo para cima e dá o laço, entra
  "PRIME STORE" e a cortina sobe (completa na 1ª visita da sessão, curta ao recarregar, nenhuma com link `?m=` ou
  "reduzir movimento"). Ao longo: marcador de cadarço antes de cada título; "Como pedir" são ilhós ligados pelo cadarço.
  Fechamento: o cadarço contorna o botão "Chamar no WhatsApp" e dá o laço; o botão aperta. 404: o cadarço incompleto.
- Movimento: vitrine em pilha que se arrasta e joga (Draggable + Inertia), faixa de marcas que acelera com a rolagem,
  filtros com Flip, cartões que "pousam" ao entrar. Nada das revelações do portfólio do Huiatã.

## Verificação (aprendido aqui)
- Chrome de teste com perfil dentro do Temp do usuário ("HUIAT&~1") leva ~6 s no primeiro `sessionStorage` e infla o
  LCP. Para medir tempo, use perfil em caminho simples (ex.: `C:/Users/Public/...`). Fora do teste não acontece.
- Grade com faixas `max-content` dentro: use `grid-template-columns: minmax(0, 1fr)` ou a página alarga.
- `naturalWidth` de imagem com `srcset` vem dividido pela densidade: o alerta "dpr3 > 1" da auditoria é falso nesses casos.

## Publicação
No ar desde 25/10/2026 em **https://prime-store-sneakers.vercel.app** (publicação autorizada pelo usuário).
- GitHub: `Roccogolden/prime-store-sneakers` (público, como os outros sites de clientes). O credential helper local
  está fixado na conta Roccogolden (a conta ativa do `gh` neste PC é outra), com a identidade
  `Huiatã Ribeiro <223874481+Roccogolden@users.noreply.github.com>`.
- Vercel: projeto `prime-store-sneakers` no time `huiataribeiro-6837`, ligado ao repositório (o primeiro
  `deploy --prod --yes` já conectou o GitHub).
- Publicar pela CLI: `npm i vercel --ignore-scripts` numa pasta de rascunho (o script do esbuild falha nesse caminho e não
  faz falta) e `node <pasta>/node_modules/vercel/dist/index.js deploy --prod --scope huiataribeiro-6837`, a partir
  desta pasta. `.vercelignore` deixa de fora as fotos originais.
- Depois de publicar: HTML no ar com consulta anti-cache (`curl -s ".../?n=$RANDOM"`), fotos e fontes com 200, e
  `testar-navegadores.mjs` no endereço real.
