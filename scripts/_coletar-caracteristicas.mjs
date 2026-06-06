/* Coleta descrição + características (internas/externas/extras) + área do lote + condomínio
   do rotina.com.br (público, SSR) para cada imóvel. Escreve scripts/_caracteristicas.json.
   Imóveis em moderação não aparecem no rotina → ficam com dados vazios (pegar via Imoview). */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const J = JSON.parse(readFileSync(resolve(ROOT, 'src/imoveis-destaque.json'), 'utf8'))

function get(url) {
  return new Promise((res) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      if (r.statusCode !== 200) { r.resume(); return res(null) }
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d))
    }).on('error', () => res(null))
  })
}
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

// itens PRESENTES de uma seção (entre o título e o próximo título)
function secao(html, titulo, fins) {
  const i = html.search(new RegExp(titulo, 'i')); if (i < 0) return []
  let j = html.length
  for (const f of fins) { const k = html.slice(i + 5).search(new RegExp(f, 'i')); if (k >= 0 && i + 5 + k < j) j = i + 5 + k }
  const seg = html.slice(i, j)
  const out = []; const re = /extras-active[^>]*>([\s\S]*?)<\/li>/gi; let m
  while ((m = re.exec(seg))) { const t = strip(m[1]); if (t) out.push(t) }
  return [...new Set(out)]
}

const dados = {}
for (const im of J.imoveis) {
  const html = await get(`https://www.rotina.com.br/imovel/x/${im.codigo}`)
  if (!html || !/CARACTER[IÍ]STICAS/i.test(html)) { dados[im.codigo] = { ok: false }; console.log(`✗ ${im.codigo} ${im.bairro} — não encontrado no rotina (moderação?)`); continue }
  // descrição
  const di = html.search(/DESCRI[ÇC][AÃ]O DO IM[OÓ]VEL/i)
  let desc = ''
  if (di >= 0) {
    const m0 = html.slice(di).match(/DESCRI[ÇC][AÃ]O DO IM[OÓ]VEL/i)
    const rest = html.slice(di + (m0 ? m0[0].length : 19))
    const end = rest.search(/NOME DO CONDOM[IÍ]NIO|Saber mais sobre|CARACTER[IÍ]STICAS INTERNAS/i)
    desc = strip(rest.slice(0, end > 0 ? end : 2500))
  }
  const internas = secao(html, 'Características internas', ['Características externas', 'Características extras', 'IMÓVEL', 'VALOR'])
  const externas = secao(html, 'Características externas', ['Características extras', 'IMÓVEL', 'VALOR', 'TENHO INTERESSE'])
  const extras = secao(html, 'Características extras', ['IMÓVEL', 'VALOR', 'TENHO INTERESSE', 'SEU NOME'])
  // área do lote
  let areaLote = 0
  const li = html.search(/[ÁA]rea\s*(do\s*)?Lote/i)
  if (li >= 0) { const m = strip(html.slice(li - 180, li)).match(/([\d.,]+)\s*m²/i); if (m) areaLote = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0 }
  // condomínio
  let condominio = ''
  const ci = html.search(/NOME DO CONDOM[IÍ]NIO/i)
  if (ci >= 0) { condominio = strip(html.slice(ci + 18, ci + 220)).split(/Saber mais|CARACTER/i)[0].trim().slice(0, 80) }

  dados[im.codigo] = { ok: true, descricao: desc, internas, externas, extras, areaLote, condominio }
  console.log(`✓ ${im.codigo} ${im.bairro} — int:${internas.length} ext:${externas.length} extra:${extras.length} lote:${areaLote}m² desc:${desc.length}ch`)
}

writeFileSync(resolve(ROOT, 'scripts/_caracteristicas.json'), JSON.stringify(dados, null, 2))
console.log('\n✓ salvo em scripts/_caracteristicas.json')
// amostra
const ex = Object.entries(dados).find(([, v]) => v.ok)
if (ex) { console.log('\nAMOSTRA ' + ex[0] + ':'); console.log('  internas:', ex[1].internas.join(', ')); console.log('  externas:', ex[1].externas.join(', ')); console.log('  extras:', ex[1].extras.join(', ')); console.log('  condominio:', ex[1].condominio) }
