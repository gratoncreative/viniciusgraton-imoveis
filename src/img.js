// Fallback elegante para imagens que falham (404/timeout) — evita o ícone de imagem quebrada.
const FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#161a22"/><stop offset="1" stop-color="#0b0e16"/></linearGradient></defs>` +
      `<rect width="800" height="600" fill="url(#g)"/>` +
      `<text x="400" y="312" font-family="Sora, Arial, sans-serif" font-size="30" fill="#5a6172" text-anchor="middle">Vinícius Graton Imóveis</text>` +
      `</svg>`,
  )

export function onImgError(e) {
  const img = e.currentTarget
  if (img.dataset.fb) return // já trocado — evita loop
  img.dataset.fb = '1'
  img.src = FALLBACK
}

// Capa-padrão de marca para CONDOMÍNIOS sem foto oficial (gerada em scripts/gen-cond-placeholder.mjs).
// Usada como capa quando não há imagem e como fallback se uma URL oficial falhar.
export const CAPA_COND_PADRAO = '/img/cond/_sem-foto.jpg'

export function onCondImgError(e) {
  const img = e.currentTarget
  if (img.dataset.fb) return
  img.dataset.fb = '1'
  img.src = CAPA_COND_PADRAO
}
