import { formatPreco } from './data'
import { importRetry } from './lazyRetry'

// Montagem do "pacote do bairro" (dossiê + fotos -> .zip) usada pelo BACKUP DO SITE INTEIRO
// (BackupPanel). O botão por-bairro do AdminImovelBar tem a sua própria cópia (verificada ao
// vivo) — aqui o modo padrão é "cache" (proprietário só do que já foi captado), pra rodar
// milhares de imóveis SEM tocar no Imoview (a captação ao vivo de donos é da Camada 1/diária).

export const sanitNome = (s) => String(s || '').replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
export const normBairro = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function dossieTxt(imv, own) {
  const L = []; const add = (s = '') => L.push(s)
  const real = (v) => (v ? formatPreco(v) : '—')
  const sep = '═'.repeat(46)
  add(`DOSSIÊ DO IMÓVEL — CÓD. ${imv.codigo}`)
  add(`Anúncio: https://viniciusgraton.com.br/imovel/${imv.codigo}`); add('')
  add(sep); add('PROPRIETÁRIO'); add(sep)
  if (own && (own.nome || own.fone || (own.dados && own.dados.length) || own.enderecoImovel)) {
    add(`Nome: ${own.nome || '—'}`); add(`Telefone: ${own.fone || '—'}`); add(`E-mail: ${own.email || '—'}`)
    if (own.enderecoCampos?.length) { add(''); add('Endereço do imóvel:'); own.enderecoCampos.forEach((c) => add(`  ${c.rotulo}: ${c.valor}`)) }
    else if (own.enderecoImovel) { add(''); add(`Endereço do imóvel: ${own.enderecoImovel}`) }
    if (own.dados?.length) { add(''); add('Outros dados do cadastro:'); own.dados.forEach((d) => add(`  ${d.rotulo}: ${d.valor}`)) }
  } else {
    add('(Proprietário ainda não captado — abra este imóvel no painel e clique em "Proprietário" para captar do Imoview.)')
  }
  add(''); add(sep); add('IMÓVEL'); add(sep)
  if (imv.titulo) add(`Título: ${imv.titulo}`)
  add(`Tipo: ${imv.tipo || '—'}`); if (imv.finalidade || imv.operacao) add(`Finalidade: ${imv.finalidade || imv.operacao}`)
  add(`Bairro: ${imv.bairro || '—'}`); add(`Cidade: ${imv.cidade || 'Uberlândia'}`)
  if (imv.rua) add(`Endereço (anúncio): ${imv.rua}`)
  add(`Preço: ${real(imv.preco || imv.valorNum)}`)
  if (imv.condominio) add(`Condomínio: ${real(imv.condominio)}`)
  if (imv.iptu) add(`IPTU: ${real(imv.iptu)}`)
  if (imv.area) add(`Área: ${imv.area} m²`)
  if (imv.areaLote) add(`Área do lote: ${imv.areaLote} m²`)
  if (imv.quartos != null && imv.quartos !== '') add(`Quartos: ${imv.quartos}`)
  if (imv.suites) add(`Suítes: ${imv.suites}`)
  if (imv.banheiros) add(`Banheiros: ${imv.banheiros}`)
  if (imv.vagas != null && imv.vagas !== '') add(`Vagas: ${imv.vagas}`)
  if (imv.andar) add(`Andar: ${imv.andar}`)
  if (imv.elevador) add('Elevador: sim')
  if (imv.situacao) add(`Situação: ${imv.situacao}`)
  if (imv.aceitaFinanciamento) add('Aceita financiamento: sim')
  if (imv.aceitaPermuta) add('Aceita permuta: sim')
  if (imv.pontoReferencia) add(`Ponto de referência: ${imv.pontoReferencia}`)
  if (Array.isArray(imv.amenidades) && imv.amenidades.length) { add(''); add('Características / amenidades:'); imv.amenidades.forEach((a) => add(`  - ${a}`)) }
  else if (Array.isArray(imv.caracteristicas) && imv.caracteristicas.length) { add(''); add('Características:'); imv.caracteristicas.forEach((c) => add(`  - ${typeof c === 'string' ? c : (c?.nome || c?.titulo || '')}`)) }
  if (imv.descricao) { add(''); add('Descrição:'); add(String(imv.descricao).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()) }
  if (imv.link) { add(''); add(`Anúncio Rotina: ${imv.link}`) }
  add(''); add('Gerado pelo backup do site de Vinícius Graton — uso interno.')
  return L.join('\r\n')
}

export function subpastaImovel(imv, own) {
  const rua = (Array.isArray(own?.enderecoCampos) && (own.enderecoCampos.find((c) => c.rotulo === 'Endereço') || {}).valor) || imv.rua || ''
  return (sanitNome(`${imv.codigo} - ${rua}`).slice(0, 80)) || String(imv.codigo)
}

// Monta o(s) .zip(s) de UM bairro (lista já filtrada) e entrega cada parte via onParte.
// ownerMode: 'cache' (padrão; só proprietário já salvo, NÃO toca no Imoview) | 'live'.
// Particiona em partes de 80 (libera memória entre partes). Progresso na faixa [pctBase..pctBase+pctSpan].
// Retorna { comDono, totFotos, np } | { abort } (só no modo 'live').
export async function montarZipsBairro({ bairro, lista, postAdmin, ownerMode = 'cache', uploadShare = 0, onProg, onParte, pctBase = 0, pctSpan = 100 }) {
  const prog = (pct, txt) => { if (onProg) onProg(pct, txt) }
  const ini = pctBase + pctSpan * 0.02
  const ownersFim = pctBase + pctSpan * 0.35
  prog(ini, `Proprietários (${ownerMode === 'cache' ? 'cache' : 'Imoview'})… 0/${lista.length}`)
  const owners = {}
  const CH = 4
  for (let i = 0; i < lista.length; i += CH) {
    const part = lista.slice(i, i + CH).map((x) => x.codigo)
    let j = null
    try { j = await postAdmin('owner-lote', { codigos: part, soCache: ownerMode === 'cache' }) } catch {}
    if (j && j.error) return { abort: j.error === 'sessao' ? 'sessao' : 'erro' }
    if (j && j.motivo === 'imoview-login') return { abort: 'imoview-login' }
    if (j && j.owners) Object.assign(owners, j.owners)
    const ate = Math.min(i + CH, lista.length)
    prog(ini + (ate / lista.length) * (ownersFim - ini), `Proprietários… ${ate}/${lista.length}`)
  }

  const { default: JSZip } = await importRetry(() => import('jszip'))
  const PART = 80
  const np = Math.ceil(lista.length / PART)
  const buildBase = ownersFim
  const faixa = ((pctBase + pctSpan) - buildBase) / np
  const buildShare = 1 - (uploadShare || 0)
  let feitos = 0, comDono = 0, totFotos = 0, fotosCortadas = 0
  let parteBase = buildBase, feitosNaParte = 0, parteLen = 1

  const procImovel = async (raiz, imv) => {
    try {
      const det = await fetch(`/api/rotina-imovel?codigo=${imv.codigo}&soFotos=1`).then((r) => r.json()).catch(() => null)
      const fotos = (det && det.imovel && Array.isArray(det.imovel.fotos) && det.imovel.fotos.length) ? det.imovel.fotos : (imv.img ? [imv.img] : [])
      const imvFull = (det && det.imovel) ? { ...imv, ...det.imovel, descricao: det.imovel.descricao || imv.descricao } : imv
      const own = owners[imv.codigo] || null
      if (own) comDono++
      const pasta = raiz.folder(subpastaImovel(imvFull, own))
      pasta.file('dados.txt', dossieTxt(imvFull, own))
      const fdir = pasta.folder('fotos')
      const lim = fotos.slice(0, 60)
      if (fotos.length > lim.length) fotosCortadas++
      for (let i = 0; i < lim.length; i++) {
        try {
          const r = await fetch('/api/img-proxy?u=' + encodeURIComponent(lim[i]))
          if (r.ok) { const blob = await r.blob(); const ext = ((lim[i].match(/\.(jpe?g|png|webp)(?=$|\?)/i) || [])[1] || 'jpg').toLowerCase(); fdir.file(String(i + 1).padStart(2, '0') + '.' + ext, blob); totFotos++ }
        } catch {}
      }
    } catch {}
    feitos++; feitosNaParte++
    prog(Math.round(parteBase + (feitosNaParte / parteLen) * faixa * buildShare), `${bairro}: ${feitos}/${lista.length} imóveis · ${totFotos} fotos`)
  }

  for (let p = 0; p < np; p++) {
    parteBase = buildBase + p * faixa
    feitosNaParte = 0
    const parteImoveis = lista.slice(p * PART, (p + 1) * PART)
    parteLen = parteImoveis.length || 1
    const zip = new JSZip()
    const raiz = zip.folder(sanitNome(bairro) || 'bairro')
    const fila = parteImoveis.map((imv) => () => procImovel(raiz, imv))
    await Promise.all(Array.from({ length: Math.min(3, fila.length) }, async () => { while (fila.length) { const job = fila.shift(); if (job) await job() } }))
    raiz.file('_RESUMO.txt', `Bairro: ${bairro}${np > 1 ? ` (parte ${p + 1} de ${np})` : ''}\r\nImóveis nesta parte: ${parteImoveis.length}${np > 1 ? ` (de ${lista.length})` : ''}\r\nCom proprietário (cache): ${comDono}\r\nFotos: ${totFotos}\r\n${fotosCortadas ? `Imóveis com galeria cortada em 60 fotos: ${fotosCortadas}\r\n` : ''}Uso interno — Vinícius Graton.\r\n`)
    const nome = np > 1 ? `${sanitNome(bairro)} - parte ${p + 1} de ${np}.zip` : `${sanitNome(bairro)} - ${lista.length} imoveis.zip`
    const blob = await zip.generateAsync({ type: 'blob' })
    await onParte(blob, nome, p, np, parteBase + faixa * buildShare, faixa * (uploadShare || 0))
  }
  return { comDono, totFotos, np }
}
