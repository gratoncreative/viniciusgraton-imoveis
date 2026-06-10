// Checa se as imagens das construtoras (capa + galeria) ainda carregam.
// Roda semanal no GitHub Actions; se achar quebradas, o workflow abre uma issue.
import fs from 'node:fs'

const con = JSON.parse(fs.readFileSync('src/construtoras.json', 'utf8')).construtoras || []
const alvos = []
for (const c of con) {
  for (const p of c.projetos || []) {
    if (p.capa) alvos.push([`${c.nome} · ${p.nome} (capa)`, p.capa])
    for (const g of (p.galeria || []).slice(0, 4)) alvos.push([`${c.nome} · ${p.nome}`, g])
  }
}

async function vivo(url) {
  try {
    let r = await fetch(url, { method: 'HEAD' })
    if (r.status === 405 || r.status === 403) r = await fetch(url, { method: 'GET' }) // alguns CDNs não aceitam HEAD
    return r.ok
  } catch { return false }
}

async function pool(items, worker, n = 10) {
  let i = 0
  const run = async () => { while (i < items.length) { const k = i++; await worker(items[k]) } }
  await Promise.all(Array.from({ length: n }, run))
}

const quebradas = []
await pool(alvos, async ([nome, url]) => { if (!(await vivo(url))) quebradas.push(`- **${nome}**\n  ${url}`) })

const rel = quebradas.length
  ? `Encontrei ${quebradas.length} imagem(ns) que não carregam mais (de ${alvos.length} checadas):\n\n${quebradas.join('\n')}\n`
  : ''
fs.writeFileSync('foto-report.md', rel)
console.log(`Checadas ${alvos.length} imagens · ${quebradas.length} quebradas`)
