/**
 * Índice de fotos + marcação de VENDIDOS.
 *
 * 1) Monta `public/_fotos.json` = { "<codigo>": ["url1","url2",...] } juntando o
 *    catálogo da Rotina com o pacote curado. É o que a função /foto/<cod>/<n>.jpg
 *    usa para servir a imagem pelo NOSSO domínio sem revelar a origem.
 *    Antes o índice vinha só do catálogo, então imóvel curado que saiu da base
 *    da Rotina ficava sem foto (imagem quebrada no card).
 *
 * 2) Marca `vendido: true` nos imóveis do pacote curado que NÃO estão mais no
 *    catálogo da Rotina. Regra do Vinícius: sumiu da base, dá por vendido.
 *    Se o imóvel voltar ao catálogo, a marca é removida sozinha no próximo build.
 *
 * Roda no prebuild.
 */
import fs from 'node:fs'

const lerJson = (p, padrao) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return padrao }
}

const cat = lerJson('public/catalogo.json', null)
const listaCat = Array.isArray(cat) ? cat : (cat?.imoveis || [])
const dest = lerJson('src/imoveis-destaque.json', null)
const listaDest = dest?.imoveis || []

if (!listaCat.length) {
  console.warn('gen-fotos-index: catalogo.json vazio ou ausente — índice não gerado')
  process.exit(0)
}

// ---------- 1) índice de fotos ----------
const fotosDe = (im) => {
  const f = Array.isArray(im?.fotos) ? im.fotos.filter(Boolean) : []
  if (f.length) return f
  return im?.img ? [im.img] : []
}

const indice = {}
for (const im of listaCat) {
  const f = fotosDe(im)
  if (f.length) indice[String(im.codigo)] = f
}
// o curado costuma ter a galeria completa — tem prioridade quando é maior
for (const im of listaDest) {
  const f = fotosDe(im)
  const cod = String(im.codigo)
  if (f.length && (!indice[cod] || f.length > indice[cod].length)) indice[cod] = f
}

fs.writeFileSync('public/_fotos.json', JSON.stringify(indice))
const totFotos = Object.values(indice).reduce((a, b) => a + b.length, 0)
console.log(`OK -> public/_fotos.json | ${Object.keys(indice).length} imóveis · ${totFotos} fotos`)

// ---------- 2) vendidos ----------
if (listaDest.length) {
  const noCatalogo = new Set(listaCat.map((x) => String(x.codigo)))
  let marcados = 0
  let desmarcados = 0
  for (const im of listaDest) {
    const sumiu = !noCatalogo.has(String(im.codigo))
    if (sumiu && !im.vendido) { im.vendido = true; marcados++ }
    else if (!sumiu && im.vendido) { delete im.vendido; desmarcados++ }
  }
  if (marcados || desmarcados) {
    fs.writeFileSync('src/imoveis-destaque.json', JSON.stringify(dest, null, 2))
    console.log(`OK -> vendidos | ${marcados} marcado(s) (saíram da base da Rotina) · ${desmarcados} voltaram`)
  } else {
    console.log('OK -> vendidos | nada mudou')
  }
}
