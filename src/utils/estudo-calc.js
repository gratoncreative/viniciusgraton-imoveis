// Utilitários de cálculo para estudos de valor do m²
// Mantidos separados para serem testáveis de forma independente.

const R_TERRA = 6371 // raio médio da Terra em km

/** Distância em km entre dois pontos (Haversine) */
export function haversine(lat1, lng1, lat2, lng2) {
  const toRad = v => v * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R_TERRA * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Azimute inicial de (lat1,lng1) para (lat2,lng2), 0° = Norte, sentido horário */
export function azimuth(lat1, lng1, lat2, lng2) {
  const toRad = v => v * Math.PI / 180
  const lat1r = toRad(lat1)
  const lat2r = toRad(lat2)
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(lat2r)
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/**
 * Estatísticas sobre um array de valores numéricos (R$/m² homogeneizados).
 * Usa desvio padrão amostral (n-1).
 */
export function calcStats(vals) {
  if (!vals || vals.length === 0) {
    return { media: 0, mediana: 0, dp: 0, cv: 0, min: 0, max: 0, n: 0, distMedia: 0 }
  }
  const sorted = [...vals].sort((a, b) => a - b)
  const n = sorted.length
  const media = sorted.reduce((s, v) => s + v, 0) / n
  const half = Math.floor(n / 2)
  const mediana = n % 2 === 0 ? (sorted[half - 1] + sorted[half]) / 2 : sorted[half]
  const dp = Math.sqrt(sorted.reduce((s, v) => s + (v - media) ** 2, 0) / Math.max(n - 1, 1))
  const cv = media > 0 ? dp / media : 0
  const distMedia = sorted.reduce((s, v) => s + Math.abs(v - media), 0) / n
  return { media, mediana, dp, cv, min: sorted[0], max: sorted[n - 1], n, distMedia }
}

/**
 * Grau de fundamentação por heurística (NBR 14653 simplificada).
 * Substituir pela tabela real quando os pesos forem conhecidos.
 */
export function calcGrau(n, cv) {
  if (n >= 6 && cv < 0.20) return 'III'
  if (n >= 4 && cv < 0.30) return 'II'
  return 'I'
}

// ── Formatadores ──────────────────────────────────────────────────────────────

export const fmtBRL = v =>
  'R$ ' + Math.round(v).toLocaleString('pt-BR')

export const fmtM2 = v =>
  'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

export const fmtKm = km =>
  km < 0.5
    ? Math.round(km * 1000) + ' m'
    : km.toFixed(1).replace('.', ',') + ' km'

export const fmtPct = (v, d = 1) =>
  (v * 100).toFixed(d).replace('.', ',') + '%'

export const fmtData = iso => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const meses = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
  ]
  return `${d} de ${meses[m - 1]} de ${y}`
}
