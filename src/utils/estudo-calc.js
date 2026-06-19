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

// ════════════════════════════════════════════════════════════════════════════
//  NBR 14653-2 — graus e saneamento (usados pela ferramenta ACM "referência pela área")
//  Mantidos separados de calcGrau() pra NÃO mexer no Estudo do m² já existente.
// ════════════════════════════════════════════════════════════════════════════

// erf/erfc por aproximação de Abramowitz & Stegun 7.1.26 (erro < 1.5e-7)
function _erf(x) {
  const s = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return s * y
}
// Probabilidade de uma observação ficar além de z desvios (cauda dupla por simetria)
const _Q = (z) => 0.5 * (1 - _erf(z / Math.SQRT2))

// t de Student para IC 80% bicaudal (t_{0,90; n-1}); z=1,2816 p/ n grande
function _t80(n) {
  const tab = { 2: 3.078, 3: 1.886, 4: 1.638, 5: 1.533, 6: 1.476, 7: 1.440, 8: 1.415, 9: 1.397, 10: 1.383, 12: 1.363, 15: 1.341, 20: 1.325, 25: 1.316 }
  if (n >= 30) return 1.2816
  if (tab[n]) return tab[n]
  let v = tab[2]
  for (const k of Object.keys(tab).map(Number).sort((a, b) => a - b)) if (k <= n) v = tab[k]
  return v
}

/**
 * Grau de FUNDAMENTAÇÃO (NBR 14653-2, tratamento por fatores) pelo nº de dados usados.
 * III >= 12, II >= 5, I >= 3, abaixo de 3 não classifica.
 */
export function calcGrauFundamentacao(n) {
  if (n >= 12) return 'III'
  if (n >= 5) return 'II'
  if (n >= 3) return 'I'
  return null
}

/**
 * Grau de PRECISÃO pela amplitude do intervalo de confiança de 80% em torno da MÉDIA.
 * amplitude = (Lsup - Linf) / média:  III <= 30%, II <= 40%, I <= 50%, acima não classifica.
 * Retorna { grau, amplPct, icMin, icMax } ou null.
 */
export function calcGrauPrecisao(media, dp, n) {
  if (!(media > 0) || !(n >= 3) || !(dp >= 0)) return null
  const semi = _t80(n) * dp / Math.sqrt(n)
  const ampl = (2 * semi) / media
  const grau = ampl <= 0.30 ? 'III' : ampl <= 0.40 ? 'II' : ampl <= 0.50 ? 'I' : null
  return { grau, amplPct: Math.round(ampl * 100), icMin: media - semi, icMax: media + semi }
}

/**
 * Critério de Chauvenet: índice do dado a descartar (o de maior desvio) quando o nº
 * esperado de observações tão extremas (n·2·Q(z)) é < 0,5. Senão, -1 (nada a descartar).
 * Uma rodada, no máximo 1 descarte, piso de 3 dados.
 */
export function chauvenetCorte(vals) {
  const n = vals.length
  if (n < 4) return -1 // piso de 3: só descarta se sobrarem >= 3
  const media = vals.reduce((s, v) => s + v, 0) / n
  const dp = Math.sqrt(vals.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1))
  if (!(dp > 0)) return -1
  let idx = -1, maxz = 0
  vals.forEach((v, i) => { const z = Math.abs(v - media) / dp; if (z > maxz) { maxz = z; idx = i } })
  return (idx >= 0 && n * 2 * _Q(maxz) < 0.5) ? idx : -1
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
