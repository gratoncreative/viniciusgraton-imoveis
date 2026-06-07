// Rehospeda as CAPAS (imagens críticas) de empreendimentos e condomínios:
// baixa do CDN de terceiro, otimiza com sharp e salva em public/img/,
// reescrevendo o caminho no JSON. Galerias seguem hotlinkadas (mais leves).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

const dirEmp = path.join(ROOT, 'public', 'img', 'emp')
const dirCond = path.join(ROOT, 'public', 'img', 'cond')
fs.mkdirSync(dirEmp, { recursive: true })
fs.mkdirSync(dirCond, { recursive: true })

async function baixarOtimizar(url, destAbs) {
  try {
    const r = await fetch(encodeURI(url), { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } })
    if (!r.ok) return false
    const buf = Buffer.from(await r.arrayBuffer())
    await sharp(buf).resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(destAbs)
    return true
  } catch { return false }
}

let ok = 0, fail = 0
const isLocal = (u) => !u || u.startsWith('/')

{
  const file = path.join(ROOT, 'src', 'construtoras.json')
  const data = JSON.parse(fs.readFileSync(file))
  for (const c of data.construtoras) {
    for (const p of c.projetos || []) {
      if (isLocal(p.capa)) continue
      const name = `${c.slug}__${p.slug}.jpg`
      if (await baixarOtimizar(p.capa, path.join(dirEmp, name))) { p.capa = `/img/emp/${name}`; ok++ }
      else { fail++; console.log('FALHA emp', c.slug, p.slug) }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

{
  const file = path.join(ROOT, 'src', 'condominios.json')
  const data = JSON.parse(fs.readFileSync(file))
  for (const c of data.condominios) {
    if (isLocal(c.capa)) continue
    const name = `${c.slug}.jpg`
    if (await baixarOtimizar(c.capa, path.join(dirCond, name))) { c.capa = `/img/cond/${name}`; ok++ }
    else { fail++; console.log('FALHA cond', c.slug) }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

console.log(`REHOST capas: OK ${ok} | FALHA ${fail}`)
