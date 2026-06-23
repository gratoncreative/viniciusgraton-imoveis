// Rastreamento de CONVERSÃO — dispara um beacon quando o visitante clica num
// contato (WhatsApp / telefone / e-mail). Centralizado num único listener global:
// cobre os ~65 botões atuais e QUALQUER novo, sem tocar em cada call site.
// Fire-and-forget (sendBeacon) — não atrasa nem bloqueia o clique/navegação.
// O backend (functions/api/eng.js, tipo:'conv') agrega por dia/evento/página.
export function initConvTracking() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.__convTrack) return
  window.__convTrack = true

  const send = (ev) => {
    try {
      const payload = JSON.stringify({ tipo: 'conv', ev, path: (location.pathname || '/').slice(0, 120) })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/eng', new Blob([payload], { type: 'application/json' }))
      } else {
        fetch('/api/eng', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
      }
    } catch { /* nunca quebra o clique */ }
  }

  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]')
    if (!a) return
    const href = a.getAttribute('href') || ''
    if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) send('whatsapp')
    else if (/^tel:/i.test(href)) send('tel')
    else if (/^mailto:/i.test(href)) send('email')
  }, { capture: true, passive: true })
}
