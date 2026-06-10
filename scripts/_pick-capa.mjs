/**
 * _pick-capa.mjs (helper temporário) — para cada código em baixa resolução,
 * baixa toda a galeria, mede a largura de cada JPEG e promove a foto MAIS LARGA
 * (>= 800px) a capa no _imoview-fotos.json. Imóveis cuja galeria inteira é
 * pequena (ex.: fotos antigas de WhatsApp) ficam como estão.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FOTOS = resolve(__dirname, '_imoview-fotos.json')
const GALERIAS = resolve(__dirname, '_imoview-galerias.json')

const ALVOS = process.argv.slice(2)
if (!ALVOS.length) { console.error('uso: node _pick-capa.mjs <cod> <cod> ...'); process.exit(1) }

function jpegSize(buf) {
  try {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
    let o = 2
    while (o < buf.length - 8) {
      if (buf[o] !== 0xff) { o++; continue }
      const m = buf[o + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) }
      }
      o += 2 + buf.readUInt16BE(o + 2)
    }
  } catch {}
  return null
}

function medir(url) {
  return new Promise((res) => {
    const buf = []
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return res(null) }
      r.on('data', (d) => buf.push(d))
      r.on('end', () => res(jpegSize(Buffer.concat(buf))))
    }).on('error', () => res(null))
  })
}

const fotos = JSON.parse(readFileSync(FOTOS, 'utf8'))
const galerias = JSON.parse(readFileSync(GALERIAS, 'utf8'))

for (const cod of ALVOS) {
  const capaAtual = fotos[cod]
  const candidatas = [capaAtual, ...(galerias[cod] || [])].filter((u) => u && !/avatar\.jpg/i.test(u))
  let melhor = null, melhorW = 0
  for (const u of candidatas) {
    const dim = await medir(u)
    const w = dim?.w || 0
    if (w > melhorW) { melhorW = w; melhor = u }
  }
  if (melhor && melhorW >= 800 && melhor !== capaAtual) {
    fotos[cod] = melhor
    console.log(`✓ ${cod}: capa promovida -> ${melhorW}px  (${melhor.split('/').pop()})`)
  } else if (melhorW >= 800 && melhor === capaAtual) {
    console.log(`= ${cod}: capa atual já é a melhor (${melhorW}px)`)
  } else {
    console.log(`⚠ ${cod}: galeria inteira em baixa (máx ${melhorW}px) — sem foto grande disponível`)
  }
}

writeFileSync(FOTOS, JSON.stringify(fotos, null, 2) + '\n')
console.log('\n_imoview-fotos.json atualizado.')
