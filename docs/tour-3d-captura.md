# Tour 3D dos imóveis — guia de captura (100% grátis)

Como transformar um imóvel num **tour 3D navegável** no site, do celular ao ar.
Tecnologia: **3D Gaussian Splatting**. Custo: **zero** (apps grátis + site próprio).

O site já está pronto para exibir. Você só precisa **gerar o arquivo da cena** e
**colar o caminho dele** no /admin.

---

## Passo 1 — Capturar + treinar (no celular)

Escolha **um** app (os dois são grátis):

- **Scaniverse** (iOS/Android) — recomendado. Processa **no próprio aparelho** em
  ~8 min. Modo: *Splat / Gaussian Splatting*. Exporta **SPZ** de graça.
- **Luma AI** (iOS/Android/web) — processa na nuvem, qualidade visual um pouco melhor.
  Exporta **PLY** no plano grátis. Bom se o celular for mais fraco.

**Como filmar bem (faz toda a diferença):**
- Ambiente **bem iluminado**; acenda as luzes, abra cortinas.
- Ande **devagar e em círculo**, cobrindo o cômodo de **vários ângulos e alturas**.
- Faça uma volta completa; depois aproxime de detalhes (bancada, vista).
- Evite **espelho, vidro e superfícies muito escuras** (confundem o 3D). iPhone com
  LiDAR ajuda nesses casos.
- 1 a 3 minutos de captura por ambiente costuma bastar.

---

## Passo 2 — Limpar e exportar (no navegador, grátis)

1. Abra **https://superspl.at/editor** (SuperSplat — open source, sem login obrigatório).
2. Arraste o arquivo do Passo 1 (`.spz` ou `.ply`) para a tela.
3. Limpe o que sobrou: apague chão infinito, "fumaça" nas bordas, teto bagunçado.
   (Ferramentas de seleção → Delete.)
4. Centralize a cena (mova/gire para o imóvel ficar no centro, de pé).
5. **Export** → escolha **PLY comprimido** (`.compressed.ply`) ou **SOG**. Esses
   formatos são leves e carregam rápido no navegador.

O arquivo final costuma ter **5–40 MB**.

---

## Passo 3 — Colocar no site

1. Crie a pasta `public/splats/{codigo}/` (use o **código do imóvel**, ex.: `99361`).
2. Copie o arquivo exportado para lá, ex.:
   `public/splats/99361/scene.compressed.ply`
3. Faça o deploy (commit/push — o Netlify publica sozinho).

---

## Passo 4 — Ligar o botão no anúncio

1. Entre no **/admin**, abra o imóvel e clique em **Editar anúncio**.
2. No campo **"Tour 3D (arquivo/link)"**, cole o caminho:
   `/splats/99361/scene.compressed.ply`
3. Salve.

Pronto: o botão **"Tour 3D"** aparece na ficha do imóvel. Quem clicar navega a cena
(arrastar = girar, roda/pinça = zoom, botão de tela cheia). No celular carrega numa
versão mais leve automaticamente.

> Enquanto o campo estiver vazio, **nada muda** na ficha — o recurso é opt-in por imóvel.

---

## Dúvidas rápidas

- **Onde fica hospedado?** No próprio site (pasta `public/splats/`). Sem mensalidade.
- **E se forem muitos imóveis?** Quando o volume crescer, dá pra mover os arquivos
  para um storage externo (Cloudflare R2, grátis até 10 GB) — o campo aceita uma URL
  completa (`https://...`), então é só trocar o caminho. Nesse dia, adicionar o
  domínio do R2 no `connect-src` do `public/_headers`.
- **Funciona em qualquer celular?** Em aparelhos sem WebGL/baixo desempenho, o
  visualizador mostra um aviso e o botão "Voltar às fotos" — as fotos seguem normais.
