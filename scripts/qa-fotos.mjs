/**
 * qa-fotos.mjs — CONTROLE DE QUALIDADE das fotos (rodar SEMPRE antes de publicar).
 * -----------------------------------------------------------------------------
 * Audita TODAS as fotos de src/imoveis-destaque.json (capas locais + galerias
 * locais e hotlink do CDN), medindo:
 *   - RESOLUÇÃO (largura/altura, lendo o cabeçalho JPEG)
 *   - NITIDEZ  (variância do Laplaciano via sharp — quanto menor, mais "lisa/mole")
 *
 * E sinaliza o que revisar ANTES de subir, evitando retrabalho:
 *   ⚠ capa em baixa resolução (< 800px de largura)
 *   ⚠ capa possivelmente fora de foco (bem menos nítida que a melhor foto do imóvel)
 *   ⚠ fotos pequenas na galeria (< 600px)
 *   → indica qual é a foto MAIS NÍTIDA de cada imóvel (melhor candidata a capa)
 *
 * IMPORTANTE: a nitidez baixa NÃO prova desfoque (cômodo vazio/liso pontua baixo).
 * Por isso o script SINALIZA p/ inspeção visual — confirme abrindo a imagem antes
 * de trocar. Nunca trocar capa só pela métrica.
 *
 * Uso:
 *   node scripts/qa-fotos.mjs            (audita tudo: local + CDN)
 *   node scripts/qa-fotos.mjs --local    (só fotos locais, mais rápido)
 * -----------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JSON_PATH = resolve(ROOT, 'src/imoveis-destaque.json')
const SOMENTE_LOCAL = process.argv.includes('--local')

const MIN_LARGURA_CAPA = 800     // abaixo disso a capa é considerada baixa resolução
const MIN_LARGURA_FOTO = 600     // abaixo disso a foto de galeria é "pequena"
const FATOR_BORRADO = 0.55       // capa < 55% da nitidez da melhor foto → suspeita de desfoque

function jpegSize(buf) {
  try {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
    let o = 2
    while (o < buf.length - 8) {
      if (buf[o] !== 0xff) { o++; continue }
      const m = buf[o + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) }
      o += 2 + buf.readUInt16BE(o + 2)
    }
  } catch {}
  return null
}

function fetchBuf(url) {
  return new Promise((res) => {
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return res(null) }
      const b = []
      r.on('data', (d) => b.push(d)); r.on('end', () => res(Buffer.concat(b)))
    }).on('error', () => res(null))
  })
}

// variância do Laplaciano (greyscale, normalizado p/ 512px) — medida de nitidez/foco
async function nitidez(buf) {
  try {
    const { data, info } = await sharp(buf).greyscale().resize(512, null, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
    const W = info.width, H = info.height
    let s = 0, s2 = 0, n = 0
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - W] - data[i + W]
      s += lap; s2 += lap * lap; n++
    }
    return Math.round(s2 / n - (s / n) ** 2)
  } catch { return -1 }
}

async function bufDe(ref) {
  if (ref.startsWith('/')) { const p = resolve(ROOT, 'public' + ref.split('?')[0]); return existsSync(p) ? readFileSync(p) : null }
  if (SOMENTE_LOCAL) return null
  return fetchBuf(ref)
}

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
const inspecionar = [], baixaRes = []
console.log(`\n=== QA FOTOS — ${data.imoveis.length} imóveis ${SOMENTE_LOCAL ? '(só local)' : '(local + CDN)'} ===\n`)

for (const im of data.imoveis) {
  const refs = im.fotos || []
  const medidas = []
  for (let i = 0; i < refs.length; i++) {
    const buf = await bufDe(refs[i])
    if (!buf) { medidas.push({ i, ref: refs[i], w: 0, h: 0, foco: null, skip: true }); continue }
    const dim = jpegSize(buf) || { w: 0, h: 0 }
    medidas.push({ i, ref: refs[i], w: dim.w, h: dim.h, foco: await nitidez(buf) })
  }
  const medidos = medidas.filter((m) => !m.skip && m.foco >= 0)
  const capa = medidas[0]
  const focos = medidos.map((m) => m.foco)
  const maxFoco = Math.max(...focos, 0)
  const melhor = medidos.find((m) => m.foco === maxFoco)
  const pequenas = medidos.filter((m) => m.w && m.w < MIN_LARGURA_FOTO).length

  const avisos = []
  if (capa && capa.w && capa.w < MIN_LARGURA_CAPA) { avisos.push(`capa ${capa.w}px (<${MIN_LARGURA_CAPA})`); baixaRes.push(im.codigo) }
  if (capa && capa.foco >= 0 && maxFoco > 0 && capa.foco < maxFoco * FATOR_BORRADO) {
    avisos.push(`capa pode estar MOLE (foco ${capa.foco} vs melhor ${maxFoco} = foto ${melhor?.i + 1})`)
    inspecionar.push(im.codigo)
  }
  console.log(`${im.codigo} ${im.bairro}`)
  console.log(`   capa: ${capa?.w}x${capa?.h} foco=${capa?.foco}${SOMENTE_LOCAL && !capa?.w ? ' (CDN, não medida)' : ''}`)
  console.log(`   melhor foco: ${maxFoco} (foto ${melhor ? melhor.i + 1 : '?'})   fotos pequenas(<${MIN_LARGURA_FOTO}px): ${pequenas}/${medidos.length}`)
  if (avisos.length) console.log(`   ⚠ ${avisos.join(' | ')}`)
  console.log('')
}

console.log('=== RESUMO ===')
console.log(baixaRes.length ? `⚠ Capas baixa resolução: ${[...new Set(baixaRes)].join(', ')}` : '✓ Nenhuma capa em baixa resolução.')
console.log(inspecionar.length ? `⚠ INSPECIONAR VISUALMENTE (capa pode estar borrada): ${[...new Set(inspecionar)].join(', ')}` : '✓ Nenhuma capa suspeita de desfoque.')
console.log('\nLembrete: abrir/visualizar as sinalizadas antes de publicar. Nitidez baixa pode ser só cômodo vazio — confirmar com os olhos.')
