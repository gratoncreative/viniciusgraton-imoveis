# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site de imóveis do Vinícius Graton (consultor da Rotina Imobiliária, Uberlândia/MG). SPA React + backend em Cloudflare Pages Functions. Produção: **viniciusgraton.com.br**. Repo: `gratoncreative/viniciusgraton-imoveis`.

## Comandos

- `npm run dev` — Vite dev server.
- `npm run build` — build de produção: `vite build` → `scripts/limpa-wasm.mjs` → `scripts/prerender-og.mjs` (gera HTML estático por rota de imóvel/ferramenta + sitemap) → `scripts/otimiza-imagens.mjs` (sharp). O `prebuild` roda antes: copia o worker do pdf.js + `scripts/gen-acm-index.mjs`.
- `npm run preview` — serve o `dist/` buildado.
- **Não há framework de teste nem linter configurado.** Para conferir uma Cloudflare Function (elas NÃO passam pelo build do Vite): `node --check functions/api/<arquivo>.js`. Para validar o frontend: `npm run build` tem que passar.

## Deploy

`git push` na branch `main` → a Cloudflare Pages (Git provider) **builda e publica sozinha**. Não há passo manual de deploy nem wrangler aqui (diferente do projeto irmão aicapitei). Frontend = SPA + páginas pré-renderizadas; backend = tudo em `functions/` (caminho do arquivo = rota).

Convenção de commit: fazer `git pull --rebase --autostash && git push`. **Uma sessão automática paralela commita arquivos de dados** (`public/*.json` de sync do catálogo, `src/acm-m2.json`, `.claude/*`) — faça `git add` só dos arquivos que VOCÊ mexeu e deixe esses para os commits de sync deles.

## Arquitetura (o essencial que exige ler vários arquivos)

**Frontend** (`src/`): React 18 + `react-router-dom`, rotas lazy. Libs pesadas são separadas em chunks via `manualChunks` no `vite.config.js` (react, router, motion, pdf, zip, playcanvas...). `base: '/'`.

**Backend** (`functions/`): Cloudflare Pages Functions, caminho = rota. `functions/api/*` = APIs JSON; `functions/imovel/[[path]].js`, `functions/cliente/[[path]].js` = rotas dinâmicas; `functions/_lib/*` = código compartilhado.

**Armazenamento** — `functions/_lib/store.js`, facade `kvStore(env)`: usa **D1** (`env.DB`, 100k gravações/dia) como primário e cai para **KV** (`env.ENGAGEMENT`, teto ~1k/dia) no fallback; binário/valor grande vai pro KV. Todo handler faz `env = { ...env, ENGAGEMENT: kvStore(env) }`. Para leitura em massa use **`store.entries({ prefix })`** (1 query no D1) — o `list + get` por chave dobra os subrequests e já derrubou a ação `data` do admin. É um espaço de chaves estilo KV; prefixos: `lead:`, `imovel:<cod>` (campos públicos **+ owner/PII**), `crm:`, `conta:`, `anuncio:`, `conv:`, `laudo:`, `corretor:`, `config:`, e chaves operacionais `captar:cursor|status`, `imoview:sess|cooldown`, `hotlead:*`, `backup:*`, `rl:*`.

**Catálogo/imóveis**: `public/catalogo.json` é o feed público, **regenerado pelo cron `sync-rotina`** a partir de rotina.com.br. `src/data.js` monta `IMOVEIS` a partir de `src/imoveis-destaque.json` e aplica overrides do admin (`imovel:<cod>.campos`); acessores: `imovelPorCodigo`, `fotosDe`.

**Admin**: `src/pages/Admin.jsx` (painel lazy) ↔ `functions/api/admin.js` (~1500 linhas, grande switch de `action`). Auth = senha PBKDF2 + token bearer HMAC (`admin:auth` no KV; `ADMIN_PASS` no bootstrap). Os **dados confidenciais do PROPRIETÁRIO ficam SÓ em `imovel:<cod>.owner`**, nunca no catálogo público. O painel é protegido por token → **valide mudanças por build + revisão de código, não por preview ao vivo** (não digite o token).

## Integrações SEM API oficial (restrição central)

A API oficial do Imoview **não está disponível** (`IMOVIEW_CHAVE` não configurada), então tudo roda por **sessão web autenticada / endpoints públicos**. Tratar as fontes com gentileza (o maior risco é BLOQUEAR a conta Imoview):

- **Imoview** — `functions/_lib/imoview.js`: `imoviewLogin` (login por cookie) + **`imoviewSession(env)`** que cacheia o cookie no KV `imoview:sess` (15 min) para NÃO fazer dezenas de logins seguidos; `imoviewEmCooldown`/`marcarImoviewCooldown` (`imoview:cooldown`, 20 min após falha); `ehPaginaLogin` detecta sessão expirada. Scraping do proprietário: `scrapeOwnerCod` (exportado de `admin.js`). Sempre reusar a sessão, nunca loopar login.
- **Catálogo Rotina** — POST público `rotina.com.br/retornar-imoveis-codigo` em `functions/api/rotina-imovel.js` (cache `rotina:v3:<cod>`); POIs por OpenStreetMap/Overpass (grátis).
- **Fotos** — sempre via `functions/api/img-proxy.js` / `foto.js` com **allowlist de host** (cdn/s3/app.imoview). Não transformar em proxy aberto.

## Automações na nuvem (`.github/workflows/`, sem PC ligado)

Padrão: uma Function que **só LÊ** (auth por header `BACKUP_CRON_KEY`) + um GitHub Actions que guarda os secrets e faz o envio/disparo. Avisos no WhatsApp via **CallMeBot** (`functions/_lib/whatsapp.js`). Jobs: `sync-rotina` (regenera o catálogo), `backup-diario` (03h BRT → R2), `backup-fotos` (espelho gradual de fotos), `captar-proprietarios` (captação de donos — **SÓ de madrugada**: de dia o Imoview fica degradado), `ops-brief` (briefing 07h BRT), `vigia` (site no ar a cada 3h), `sync-blow`, `checa-fotos`.

## Pegadinhas não óbvias (leia antes de se queimar)

- **Envenenamento de cache no deploy**: `public/_headers` marca `/assets/*` como `immutable` e o HTML como `max-age=0`. `functions/assets/_middleware.js` transforma um `/assets/*` inexistente (janela de propagação do deploy) num **404 no-store** — senão o fallback HTML do SPA ficaria cacheado 1 ano numa URL de chunk e quebraria `import()` pra sempre. O front se recupera com lazyRetry. Não "simplifique" isso.
- **CSP estrita** em `public/_headers`: qualquer host externo novo (script/style/img/frame/connect-src) fica **bloqueado** até ser adicionado lá. `script-src` permite `'unsafe-inline'`, então a CSP **não** é rede de proteção contra XSS — nunca renderize input não confiável como HTML.
- **R2**: backup e o acervo de fotos originais dependem do binding `BACKUPS` (bucket `vg-backups`), ainda **não criado** → esses endpoints respondem `{ ok:false, motivo:'r2' }` e viram no-op. O resto funciona sem R2.
- Windows + PowerShell; avisos de CRLF/LF no git são ruído normal.

## Regras de marca/UX (valem e são cobradas; detalhes na memória do projeto)

- **Sem preto puro** — o mais escuro é `#212b3d`; sombras `rgba(33,43,61,…)`.
- **Sem travessão "—" em texto público** (no chat pode) — usar hífen ou "·".
- Paleta de botões (navy `#1C2A44`/`#212b3d` ou vermelho `#EB0128` + branco) e o estilo de `/ferramentas` são **TRANCADOS por senha** ("regra de ouro") — CSS novo entra ANTES desses blocos.
- Vinícius é **consultor de imóveis da Rotina Imobiliária**, nunca "corretor".

> Existe um sistema rico de **memória + skills** do usuário em `~/.claude/` (índice `MEMORY.md` do projeto; skills como `deploy-cloudflare-pages`, `higiene-de-edicao-arquivos`, `seo-aeo-geo`). Muitas decisões e lições vivem lá, não no código — consulte quando for mexer em captação, marca, deploy ou PDFs.
