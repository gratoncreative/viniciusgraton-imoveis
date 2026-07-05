import { useEffect } from 'react'

const MESES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 }
const pad = (n) => String(n).padStart(2, '0')
const iso = (y, mo, d) => `${y}-${pad(mo + 1)}-${pad(d)}`

// Converte a previsão de entrega informal num ISO date.
// Aceita: "abr/2026", "abril 2026", "04/2026", "1º semestre 2026", "2026.1", "2026".
// Retorna null quando não dá pra ter certeza — nunca inventa data.
export function parseEntregaISO(txt) {
  if (!txt) return null
  const s = String(txt).toLowerCase().trim()
  // já é ISO (yyyy-mm-dd ou yyyy-mm) → usa direto, preservando o mês
  let m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/)
  if (m) return iso(+m[1], Math.min(11, Math.max(0, +m[2] - 1)), +(m[3] || 1) || 1)
  m = s.match(/([a-zç]{3,9})\s*[/ ]\s*(\d{4})/)
  if (m && MESES[m[1].slice(0, 3)] != null) return iso(+m[2], MESES[m[1].slice(0, 3)], 1)
  m = s.match(/(\d{1,2})\s*\/\s*(\d{4})/)
  if (m && +m[1] >= 1 && +m[1] <= 12) return iso(+m[2], +m[1] - 1, 1)
  m = s.match(/([12])\s*[ºo]?\s*sem[a-z]*\D*(\d{4})/)
  if (m) return iso(+m[2], +m[1] === 2 ? 6 : 0, 1)
  m = s.match(/(20\d{2})\s*[.\-]\s*([12])/)
  if (m) return iso(+m[1], +m[2] === 2 ? 6 : 0, 1)
  m = s.match(/\b(20\d{2})\b/)
  if (m) return iso(+m[1], 0, 1)
  return null
}

// Injeta um schema.org/Event ("entrega prevista") no <head> quando há data parseável
// e o empreendimento ainda NÃO foi entregue. Sai do ar ao desmontar.
export function useEventoLancamento(emp) {
  useEffect(() => {
    if (!emp || !emp.nome) return
    const data = parseEntregaISO(emp.entrega)
    if (!data) return
    const st = String(emp.status || '').toLowerCase()
    if (st.includes('pronto') || st.includes('entreg')) return // já entregue: não é evento futuro
    const evento = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${emp.nome} - entrega prevista`,
      startDate: data,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: emp.bairro ? `${emp.bairro}, Uberlândia` : 'Uberlândia',
        address: { '@type': 'PostalAddress', streetAddress: emp.endereco || undefined, addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      },
      description: `Previsão de entrega do empreendimento ${emp.nome}${emp.construtora ? `, da ${emp.construtora}` : ''}, em Uberlândia/MG.`,
      ...(emp.capa ? { image: [emp.capa] } : {}),
      ...(emp.url ? { url: emp.url } : {}),
      ...(emp.construtora ? { organizer: { '@type': 'Organization', name: emp.construtora } } : {}),
    }
    document.getElementById('evento-lancamento')?.remove()
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'evento-lancamento'
    el.textContent = JSON.stringify(evento)
    document.head.appendChild(el)
    return () => { document.getElementById('evento-lancamento')?.remove() }
  }, [emp?.nome, emp?.entrega, emp?.status, emp?.bairro, emp?.endereco])
}
