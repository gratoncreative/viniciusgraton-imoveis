# AIcapitei — Design System

Identidade visual da **AIcapitei** — portal de captação de leads imobiliários movido a inteligência artificial. Conecta quem quer **anunciar/vender** um imóvel a quem quer **comprar**.

- **Domínios:** aicapitei.com · aicapitei.com.br
- **Estilo:** Tech moderno & inovador
- **Cores:** Roxo/violeta + acentos de IA
- **Conceito do nome:** `AI` (inteligência artificial) + `capitei` (captei o lead)

---

## 🎨 Conceito da marca

O símbolo une um **pin de localização** (o imóvel) com um **sparkle de IA** (a captação inteligente).
No logotipo, o `AI` aparece em **gradiente violeta→fúcsia** para reforçar a inteligência artificial,
enquanto `capitei` comunica resultado — o lead já foi capturado.

**Tagline sugerida:** _“A IA que capta os melhores negócios imobiliários.”_

---

## 📁 Estrutura

```
aicapitei-design-system/
├── index.html                  # Visão geral (hero da marca aplicada)
├── tokens.css                  # Tokens: cores, tipografia, espaçamento, sombras
├── assets/
│   ├── logo-primary.svg        # Logo horizontal (colorido)
│   ├── logo-white.svg          # Logo monocromático branco (fundos escuros)
│   └── logo-icon.svg           # Ícone / favicon / app
├── brand/
│   └── logo.html               # Marca: variações + boas práticas
├── foundations/
│   ├── colors.html             # Paleta completa
│   └── typography.html         # Escala tipográfica
└── components/
    ├── buttons.html            # Botões (variantes e tamanhos)
    ├── forms.html              # Inputs, seleção e validação
    ├── lead-capture.html       # ⭐ Fluxos vender × comprar
    └── property-card.html      # Card de imóvel com selo de IA
```

Cada arquivo HTML é **autossuficiente** (carrega as fontes do Google Fonts e estilos inline) e traz, na
primeira linha, o marcador `<!-- @dsCard group="…" -->` que o **Claude Design** usa para montar os cards
no painel do Design System.

---

## 🔑 Resumo da identidade

| Item | Valor |
|------|-------|
| Cor principal | Violeta `#7C3AED` |
| Acento IA | Fúcsia `#D946EF` |
| Secundária | Índigo `#6366F1` |
| Gradiente assinatura | `linear-gradient(135deg, #6D28D9, #A855F7, #D946EF)` |
| Fundo escuro | Ink `#120B23` |
| Fonte de títulos | **Space Grotesk** |
| Fonte de corpo | **Inter** |
| Raio padrão | 12–16px |

---

## 🔄 Como sincronizar com o Claude Design

Este ambiente web não permite o login interativo do Claude Design (`/design-login`), então os arquivos
foram gerados **prontos para sincronizar**. Há duas formas:

**Opção A — pelo Claude Design (recomendado)**
1. Abra seu projeto em **claude.ai/design** (ou crie um do tipo *Design System*).
2. Use **“Send to Claude Code Web”** para conectar este workspace.
3. Rode a skill **`/design-sync`** — ela compara, monta o plano e envia componente a componente.

**Opção B — no Claude Code com terminal local**
1. Rode `/design-login` para autorizar o acesso ao design system.
2. Rode **`/design-sync`** apontando para a pasta `aicapitei-design-system/`.

> Os cards aparecem automaticamente no painel a partir dos marcadores `@dsCard` — não é preciso
> registrá-los manualmente.

---

## 💻 Uso no código

Para aplicar a identidade no portal, importe os tokens:

```css
@import "aicapitei-design-system/tokens.css";

.botao-cta {
  background: var(--aic-gradient-brand);
  color: var(--aic-white);
  border-radius: var(--aic-radius-md);
  font-family: var(--aic-font-body);
  box-shadow: var(--aic-shadow-glow);
}
```
