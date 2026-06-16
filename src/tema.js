// Tema do site: SISTEMA CLARO (Manual de Design de Cores v2.0).
const KEY = 'vg-tema'

export function getTema() { return 'claro' }

export function aplicarTema() {
  document.documentElement.setAttribute('data-theme', 'claro')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', '#FFFFFF')
}

export function setTema() { aplicarTema() }

export function toggleTema() { return 'claro' }
