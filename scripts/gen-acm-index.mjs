// Gera um índice COMPACTO de R$/m² por bairro/tipo/quartos a partir do catálogo
// completo (public/catalogo.json, ~3.3k imóveis). Saída: src/acm-m2.json — pequeno,
// entra no bundle e alimenta a ferramenta ACM com dado REAL do catálogo da Rotina.
//
// Rodar:  node scripts/gen-acm-index.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cat = JSON.parse(readFileSync(join(root, 'public/catalogo.json'), 'utf8'))
const imoveis = cat.imoveis || []

const quartil = (arr, p) => {
  const idx = (arr.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx)
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)
}
const qBucket = (q) => (Number(q) >= 4 ? '4' : String(Number(q) || ''))

// agrupa R$/m² por chave "bairro|tipo|quartos"
const grupos = new Map()
const add = (key, ppm) => { if (!grupos.has(key)) grupos.set(key, []); grupos.get(key).push(ppm) }

for (const i of imoveis) {
  if (i.finalidade !== 'Venda') continue
  const area = Number(i.area), preco = Number(i.preco)
  if (!(area > 0) || !(preco > 0)) continue
  const ppm = preco / area
  if (!isFinite(ppm) || ppm <= 0 || ppm > 100000) continue // saneamento básico
  const b = i.bairro, t = i.tipo
  if (!b || !t) continue
  add(`${b}|${t}|${qBucket(i.quartos)}`, ppm) // bairro+tipo+quartos
  add(`${b}|${t}|`, ppm)                       // bairro+tipo (qualquer quarto)
  add(`${b}||`, ppm)                           // bairro (qualquer tipo)
}

const seg = {}
let mantidos = 0
for (const [key, arr] of grupos) {
  if (arr.length < 4) continue // só segmentos com amostra mínima
  arr.sort((a, b) => a - b)
  seg[key] = {
    n: arr.length,
    mediana: Math.round(quartil(arr, 0.5)),
    p25: Math.round(quartil(arr, 0.25)),
    p75: Math.round(quartil(arr, 0.75)),
  }
  mantidos++
}

const out = { gerado: cat.geradoEm || null, fonte: cat.fonte || 'Rotina Imobiliária', seg }
writeFileSync(join(root, 'src/acm-m2.json'), JSON.stringify(out))
console.log(`acm-m2.json: ${mantidos} segmentos (de ${grupos.size}) · ${imoveis.length} imóveis lidos`)
