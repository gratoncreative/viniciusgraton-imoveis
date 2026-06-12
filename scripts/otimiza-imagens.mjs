// Comprime todas as imagens de dist/img/ após o vite build.
// JPG: qualidade 82, progressivo. PNG: compressão nível 9.
// Redimensiona qualquer imagem > 1920px de largura.
// Só substitui se o arquivo resultante for MENOR que o original.
import { writeFile, readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMG_DIR = join(ROOT, 'dist', 'img')
const MAX_W = 1920
const JPG_Q = 82
const PNG_LEVEL = 9

async function listar(dir) {
  let files = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) files = files.concat(await listar(p))
    else files.push(p)
  }
  return files
}

async function otimizar(path) {
  const ext = extname(path).toLowerCase()
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null
  const before = (await stat(path)).size
  try {
    const img = sharp(path)
    const meta = await img.metadata()
    if ((meta.width || 0) > MAX_W) img.resize(MAX_W, null, { withoutEnlargement: true })
    const buf = await (ext === '.png'
      ? img.png({ compressionLevel: PNG_LEVEL, palette: true }).toBuffer()
      : img.jpeg({ quality: JPG_Q, progressive: true, mozjpeg: true }).toBuffer())
    if (buf.length < before) {
      await writeFile(path, buf)
      return { before, after: buf.length }
    }
    return { before, after: before }
  } catch { return null }
}

const files = await listar(IMG_DIR)
let totBefore = 0, totAfter = 0, count = 0
for (const f of files) {
  const r = await otimizar(f)
  if (r) { totBefore += r.before; totAfter += r.after; count++ }
}
const savedMB = ((totBefore - totAfter) / 1024 / 1024).toFixed(1)
const pct = totBefore > 0 ? Math.round((1 - totAfter / totBefore) * 100) : 0
console.log(`✓ imagens otimizadas: ${count} arquivos, -${savedMB} MB (-${pct}%)`)
