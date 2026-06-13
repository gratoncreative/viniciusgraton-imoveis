// Tema do site: SEMPRE ESCURO. Modo claro removido.
const KEY = 'vg-tema'

export function getTema() { return 'escuro' }

export function aplicarTema() {
  document.documentElement.setAttribute('data-theme', 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', '#070a11')
}

export function setTema() { aplicarTema() }

export function toggleTema() { return 'escuro' }
