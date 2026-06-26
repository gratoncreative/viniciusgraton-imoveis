# Identidade Visual · Vinícius Graton Imóveis

Kit de marca completo e vetorial do **viniciusgraton.com.br** — consultoria
imobiliária em Uberlândia / MG.

> Para ver tudo montado, abra **`marca/index.html`** no navegador.
> É o manual de marca navegável (logo, paleta, tipografia, cartão, banners e regras).

---

## Conceito

O símbolo une três ideias num só traço:

- **Casa** — lar e patrimônio;
- **Seta para cima** (formada pelo telhado) — valorização e segurança ao subir de etapa;
- **Losango vermelho** no centro — o ativo certo, o ponto exato da decisão.

Tudo em **marinho meia-noite**: solidez, confiança e sobriedade premium.
Frase da marca: *"Compre seu imóvel sem medo de errar."*

---

## Paleta (regra 70 / 20 / 10)

70% base clara · 20% estrutura marinho · 10% destaque vermelho.

| Cor | HEX | Papel |
|-----|-----|-------|
| Marinho Meia-Noite | `#212B3D` | Âncora · estrutura · texto |
| Azul Petróleo | `#1C2A44` | Cards · blocos · botão primário |
| Vermelho Champanhe | `#EB0128` | Destaque (máx. 10%) |
| Champanhe Pálido | `#FF4D67` | Tint claro · reverso |
| Champanhe Escuro | `#C20020` | Ícone/detalhe no claro |
| Azul Aço | `#44608C` | Links · interação |
| Marfim | `#F4F2EE` | Base clara · texto no escuro |
| Cinza Pérola | `#E6E4DF` | Bordas · divisões |

**Regra de ouro:** vermelho nunca é texto sobre fundo claro (vira marinho ou champanhe escuro).

---

## Tipografia

- **Fraunces** (serifada moderna) — títulos, nome da marca. Itálico só no sobrenome e em frases de marca.
- **Manrope** (sans geométrica) — interface, rótulos, botões e corpo de texto.

Ambas já carregadas no site via Google Fonts.

---

## Arquivos

```
marca/
├─ index.html                  · manual navegável
├─ logo/
│  ├─ vg-logo-principal.svg    · vertical (uso principal)
│  ├─ vg-logo-horizontal.svg   · lockup horizontal
│  ├─ vg-logo-mono-marinho.svg · monocromática (fundo claro)
│  ├─ vg-logo-mono-branco.svg  · reverso (fundo escuro)
│  ├─ vg-monograma.svg         · monograma VG (avatar/selo)
│  ├─ vg-simbolo.svg           · só o símbolo
│  └─ vg-favicon.svg           · favicon / app icon
├─ cartao/
│  ├─ vg-cartao-frente.svg     · 90×50mm + 3mm sangria
│  └─ vg-cartao-verso.svg
└─ banners/
   ├─ vg-instagram-post.svg    · 1080×1080
   ├─ vg-instagram-story.svg   · 1080×1920
   ├─ vg-og-banner.svg         · 1200×630 (Open Graph)
   └─ vg-capa-linkedin.svg     · 1584×396 (LinkedIn/Facebook)
```

---

## Como exportar

- **Web:** use os SVG direto, ou exporte PNG (`@2x` para retina).
- **Impressão (cartão):** abra o SVG no Illustrator/Inkscape, converta os
  textos em curvas (*Type → Create Outlines*), defina perfil **CMYK** e
  exporte **PDF** mantendo a sangria de 3 mm.
- **Fontes:** Fraunces e Manrope (Google Fonts) — instale antes de editar
  ou os textos vêm com fonte substituta.

---

## Relação com o site

A paleta e as fontes deste kit são exatamente as mesmas usadas em
`src/index.css` (variáveis `--navy`, `--red`/champanhe, `--ivory`,
`--font-display`, `--font-head`). O `vg-favicon.svg` substitui/atualiza o
`public/favicon.svg` e o `vg-og-banner.svg` serve como imagem
`og:image` padrão do compartilhamento.

Dúvidas de contato usadas nas peças: (34) 99157-0494 ·
contato@viniciusgraton.com.br · @viniciusgraton.imoveis ·
Av. Afonso Pena, 1535 — Aparecida, Uberlândia / MG.
