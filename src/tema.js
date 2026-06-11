// Tema do site: 'claro' (padrão, leve) ou 'escuro' (tudo escuro).
// O cliente escolhe na hora pelo toggle da navbar; fica salvo no aparelho.
const KEY = 'vg-tema'

export function getTema() {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'claro' ? 'claro' : 'escuro'
  } catch { return 'escuro' }
}

export function aplicarTema(t) {
  const tema = t === 'escuro' ? 'escuro' : 'claro'
  const root = document.documentElement
  if (tema === 'escuro') root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  // barra de status do navegador acompanha o tema
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', tema === 'escuro' ? '#070a11' : '#ffffff')
}

export function setTema(t) {
  const tema = t === 'escuro' ? 'escuro' : 'claro'
  try { localStorage.setItem(KEY, tema) } catch {}
  aplicarTema(tema)
  window.dispatchEvent(new CustomEvent('vg-tema', { detail: tema }))
}

export function toggleTema() {
  setTema(getTema() === 'escuro' ? 'claro' : 'escuro')
  return getTema()
}
