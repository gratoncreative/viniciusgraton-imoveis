// Fallback elegante para imagens que falham (404/timeout) — evita o ícone de imagem quebrada.
// Paleta do sistema novo (ivory/marinho/dourado): numa foto que não carrega o card
// continua bonito, em vez de virar um retângulo escuro.
const FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#f7f4ee"/><stop offset="1" stop-color="#efe8db"/></linearGradient></defs>` +
      `<rect width="800" height="600" fill="url(#g)"/>` +
      `<rect x="0" y="0" width="800" height="600" fill="none" stroke="#e6e1d5" stroke-width="2"/>` +
      `<rect x="337" y="243" width="126" height="126" rx="32" fill="#1b2433"/>` +
      `<text x="400" y="325" font-family="Instrument Sans, Arial, sans-serif" font-size="54" font-weight="600" letter-spacing="-3" fill="#e6c979" text-anchor="middle">VG</text>` +
      `<text x="400" y="428" font-family="Instrument Sans, Arial, sans-serif" font-size="22" font-weight="600" fill="#8a94a8" text-anchor="middle">Foto em atualização</text>` +
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
