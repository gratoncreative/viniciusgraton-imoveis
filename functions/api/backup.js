import { kvStore } from '../_lib/store.js'

/**
 * Backup de segurança do cadastro — Cloudflare Pages Function (admin).
 *
 * Grava TODO o catálogo no Cloudflare R2 (bucket próprio do Vinícius), organizado por
 * bairro, com 1 .zip por imóvel contendo: dados.txt (público + proprietário JÁ CACHEADO)
 * e a pasta /fotos com todas as imagens. Na raiz ficam catalogo.json + imoveis.csv.
 *
 * Roda em LOTES dirigidos pelo cliente (resumível via manifesto no kvStore), pra caber
 * nos limites de uma Function: as fotos vêm direto do CDN público (não toca no Imoview),
 * e o proprietário vem só do cache `imovel:<cod>` (nunca faz 3.400 logins — bloquearia
 * a conta). Imóveis ainda não captados entram só com os dados públicos.
 *
 *   POST { action:'iniciar', token }                     -> { ok, total }
 *   POST { action:'lote', token, from, count }           -> { ok, from, next, total, copiadas, comDono, concluido }
 *   POST { action:'status', token }                      -> { ok, manifest }
 *   POST { action:'baixar', token, key }                 -> stream do arquivo (attachment)
 *
 * Sem o binding R2 `BACKUPS`, responde { ok:false, motivo:'r2' } e nada quebra
 * (ver docs/backup-r2-setup.md).
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const eqStr = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
async function hmacHex(key, msg) { const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(msg))) }
async function validToken(signKey, token) {
  if (!signKey || !token || typeof token !== 'string' || token.indexOf('.') < 0) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Date.now() > Number(exp)) return false
  return eqStr(await hmacHex(signKey, exp), sig)
}

const _norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const slug = (s) => (_norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || 'sem-bairro'
const real = (v) => (v ? 'R$ ' + Number(v).toLocaleString('pt-BR') : '—')

// Dossiê .txt (igual ao do download por imóvel): público + proprietário cacheado.
function txtDe(imv, own) {
  const L = []; const add = (s = '') => L.push(s)
  const sep = '═'.repeat(46)
  add(`DOSSIÊ DO IMÓVEL — CÓD. ${imv.codigo}`)
  add(`Anúncio: https://viniciusgraton.com.br/imovel/${imv.codigo}`); add('')
  add(sep); add('PROPRIETÁRIO'); add(sep)
  if (own && (own.nome || own.fone || (own.dados && own.dados.length) || own.enderecoImovel)) {
    add(`Nome: ${own.nome || '—'}`); add(`Telefone: ${own.fone || '—'}`); add(`E-mail: ${own.email || '—'}`)
    if (own.enderecoCampos && own.enderecoCampos.length) { add(''); add('Endereço do imóvel:'); own.enderecoCampos.forEach((c) => add(`  ${c.rotulo}: ${c.valor}`)) }
    else if (own.enderecoImovel) { add(''); add(`Endereço do imóvel: ${own.enderecoImovel}`) }
    if (own.dados && own.dados.length) { add(''); add('Outros dados do cadastro:'); own.dados.forEach((d) => add(`  ${d.rotulo}: ${d.valor}`)) }
  } else {
    add('(Proprietário ainda não captado — abra este imóvel no painel admin e clique em "Proprietário" para captar do Imoview.)')
  }
  add(''); add(sep); add('IMÓVEL'); add(sep)
  if (imv.titulo) add(`Título: ${imv.titulo}`)
  add(`Tipo: ${imv.tipo || '—'}`); if (imv.finalidade || imv.operacao) add(`Finalidade: ${imv.finalidade || imv.operacao}`)
  add(`Bairro: ${imv.bairro || '—'}`); add(`Cidade: ${imv.cidade || 'Uberlândia'}`)
  add(`Preço: ${real(imv.preco || imv.valorNum)}`)
  if (imv.condominio) add(`Condomínio: ${real(imv.condominio)}`)
  if (imv.area || imv.areaNum) add(`Área: ${imv.area || imv.areaNum} m²`)
  if (imv.quartos != null && imv.quartos !== '') add(`Quartos: ${imv.quartos}`)
  if (imv.suites) add(`Suítes: ${imv.suites}`)
  if (imv.banheiros) add(`Banheiros: ${imv.banheiros}`)
  if (imv.vagas != null && imv.vagas !== '') add(`Vagas: ${imv.vagas}`)
  if (imv.areaLote) add(`Área do lote: ${imv.areaLote} m²`)
  if (imv.iptu) add(`IPTU: ${real(imv.iptu)}`)
  if (imv.andar) add(`Andar: ${imv.andar}`)
  if (imv.elevador) add('Elevador: sim')
  if (imv.situacao) add(`Situação: ${imv.situacao}`)
  if (imv.aceitaFinanciamento) add('Aceita financiamento: sim')
  if (imv.aceitaPermuta) add('Aceita permuta: sim')
  if (imv.pontoReferencia) add(`Ponto de referência: ${imv.pontoReferencia}`)
  if (imv.rua) add(`Endereço (anúncio): ${imv.rua}`)
  if (Array.isArray(imv.amenidades) && imv.amenidades.length) { add(''); add('Características / amenidades:'); imv.amenidades.forEach((a) => add(`  - ${a}`)) }
  if (imv.descricao) { add(''); add('Descrição:'); add(String(imv.descricao).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()) }
  if (imv.link) { add(''); add(`Anúncio Rotina: ${imv.link}`) }
  add(''); add('Gerado pelo backup do site de Vinícius Graton — uso interno.')
  return L.join('\r\n')
}

export async function onRequestPost({ request, env }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  // defesa-em-profundidade: rejeita origem cruzada (espelha o originOk do /api/admin)
  const _orig = request.headers.get('origin')
  if (_orig && _orig !== new URL(request.url).origin) return json({ error: 'origem' }, 403)
  let b = {}; try { b = await request.json() } catch {}

  // — autenticação admin (mesmo esquema do /api/admin) —
  const auth = await env.ENGAGEMENT.get('admin:auth', 'json').catch(() => null)
  const signKey = (auth && auth.tokenKey) || env.ADMIN_PASS || null
  const token = b.token || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!(await validToken(signKey, token))) return json({ error: 'sessao', msg: 'Sessão expirada. Faça login de novo.' }, 401)

  const R2 = env.BACKUPS
  if (!R2) return json({ ok: false, motivo: 'r2', msg: 'O armazenamento do backup ainda não está ligado. Crie o bucket R2 "vg-backups" e o binding BACKUPS (veja docs/backup-r2-setup.md).' })

  const action = b.action

  // ——— inicia: snapshot do catálogo + CSV + lista de trabalho + zera manifesto ———
  if (action === 'iniciar') {
    const cat = await fetch(new URL('/catalogo.json', request.url)).then((r) => r.json()).catch(() => null)
    const imoveis = (cat && Array.isArray(cat.imoveis)) ? cat.imoveis : []
    if (!imoveis.length) return json({ ok: false, msg: 'Não consegui ler o catálogo agora. Tente de novo.' })

    await R2.put('backup/atual/catalogo.json', JSON.stringify(cat), { httpMetadata: { contentType: 'application/json; charset=utf-8' } })

    const head = ['codigo', 'tipo', 'finalidade', 'bairro', 'cidade', 'preco', 'quartos', 'suites', 'vagas', 'area', 'rua', 'anuncio'].join(';')
    const linhas = imoveis.map((im) => [im.codigo, im.tipo, im.finalidade, im.bairro, im.cidade, im.preco, im.quartos, im.suites, im.vagas, im.area, String(im.rua || '').replace(/[;\r\n]/g, ' '), `https://viniciusgraton.com.br/imovel/${im.codigo}`].join(';'))
    const csv = '﻿' + [head, ...linhas].join('\r\n')
    await R2.put('backup/atual/imoveis.csv', csv, { httpMetadata: { contentType: 'text/csv; charset=utf-8' } })

    await R2.put('backup/atual/_lista.json', JSON.stringify(imoveis.map((im) => ({ c: String(im.codigo), b: im.bairro || '', img: im.img || '' }))), { httpMetadata: { contentType: 'application/json' } })

    const manifest = { iniciadoEm: Date.now(), atualizadoEm: Date.now(), total: imoveis.length, cursor: 0, fotos: 0, comDono: 0, concluido: false }
    await env.ENGAGEMENT.put('backup:manifest', JSON.stringify(manifest))
    return json({ ok: true, total: imoveis.length })
  }

  // ——— lote: processa 1..3 imóveis (fotos do CDN + owner do cache) -> zip no R2 ———
  if (action === 'lote') {
    const from = Math.max(0, parseInt(b.from, 10) || 0)
    const count = 1 // 1 imóvel por chamada — a concorrência é do cliente; evita estourar a memória do Worker
    const listaObj = await R2.get('backup/atual/_lista.json')
    const lista = listaObj ? await listaObj.json().catch(() => []) : []
    if (!lista.length) return json({ ok: false, msg: 'Rode "iniciar" antes de processar os lotes.' })

    const slice = lista.slice(from, from + count)
    let copiadas = 0, comDono = 0, tentadas = 0, previstas = 0
    const falhou = [] // imóveis cujo .zip NÃO foi gravado (não marcamos concluído por cima de buraco)
    const { default: JSZip } = await import('jszip')

    for (const it of slice) {
      const cod = String(it.c), bairro = it.b || ''
      let gravou = false
      try {
        const det = await fetch(new URL(`/api/rotina-imovel?codigo=${encodeURIComponent(cod)}&soFotos=1`, request.url)).then((r) => r.json()).catch(() => null)
        const imv = (det && det.imovel) ? { ...det.imovel, codigo: cod, bairro: det.imovel.bairro || bairro } : { codigo: cod, bairro }
        const fotos = (det && det.imovel && Array.isArray(det.imovel.fotos) && det.imovel.fotos.length) ? det.imovel.fotos : (it.img ? [it.img] : [])
        previstas += fotos.length

        const saved = await env.ENGAGEMENT.get('imovel:' + cod, 'json').catch(() => null)
        const own = (saved && saved.owner && (saved.owner.nome || saved.owner.fone || saved.owner.enderecoImovel || (Array.isArray(saved.owner.dados) && saved.owner.dados.length))) ? saved.owner : null
        if (own) comDono++

        const zip = new JSZip()
        zip.file('dados.txt', txtDe(imv, own))
        const fdir = zip.folder('fotos')
        const lim = fotos.slice(0, 38) // teto p/ caber nos ~50 subrequests da Function (com folga)
        let acc = 0 // orçamento de memória do Worker (~128MB)
        for (let i = 0; i < lim.length; i++) {
          tentadas++
          try {
            const r = await fetch(lim[i], { headers: { 'user-agent': 'ViniciusGratonBackup/1.0' }, signal: AbortSignal.timeout(12000) })
            if (r.ok) {
              const cl = +(r.headers.get('content-length') || 0)
              if (cl && cl > 8 * 1024 * 1024) continue // pula imagem gigante sem materializar
              const buf = await r.arrayBuffer()
              acc += buf.byteLength
              if (acc > 90 * 1024 * 1024) break // não chega perto dos 128MB do Worker
              const ext = ((String(lim[i]).match(/\.(jpe?g|png|webp)(?=$|\?)/i) || [])[1] || 'jpg').toLowerCase()
              fdir.file(String(i + 1).padStart(2, '0') + '.' + ext, buf)
              copiadas++
            }
          } catch {}
        }
        if (fotos.length > lim.length) zip.file('_FOTOS-CORTADAS.txt', `Este imóvel tem ${fotos.length} fotos; o backup guardou as primeiras ${lim.length} (limite por lote).\r\nTodas seguem no anúncio: ${imv.link || ('https://viniciusgraton.com.br/imovel/' + cod)}\r\n`)
        const out = await zip.generateAsync({ type: 'arraybuffer' })
        await R2.put(`backup/imoveis/${slug(bairro)}/${cod}.zip`, out, { httpMetadata: { contentType: 'application/zip' } })
        gravou = true
      } catch (e) { try { console.error('backup lote', cod, String((e && e.message) || e).slice(0, 140)) } catch {} }
      if (!gravou) falhou.push(cod)
    }

    const next = from + slice.length
    // O cursor é avançado pelo CLIENTE via action 'progresso' (Math.max) — aqui NÃO tocamos o
    // manifesto, pra economizar subrequests no caminho quente e não competir com os 3 workers.
    // 'falhou' volta pro cliente decidir reprocessar; 'concluido' nunca é true com imóvel pendente.
    return json({ ok: true, from, next, total: lista.length, copiadas, tentadas, previstas, comDono, falhou, gravou: !falhou.length, concluido: next >= lista.length && !falhou.length })
  }

  if (action === 'status') {
    const manifest = await env.ENGAGEMENT.get('backup:manifest', 'json').catch(() => null)
    return json({ ok: true, r2: true, manifest: manifest || null })
  }

  // ——— progresso: o CLIENTE (único) grava os contadores autoritativos (sem corrida) ———
  if (action === 'progresso') {
    const m = (await env.ENGAGEMENT.get('backup:manifest', 'json')) || {}
    if (Number.isFinite(b.cursor)) m.cursor = Math.max(m.cursor || 0, b.cursor)
    if (Number.isFinite(b.fotos)) m.fotos = Math.max(m.fotos || 0, b.fotos)       // monotônico: escrita atrasada não regride o contador
    if (Number.isFinite(b.comDono)) m.comDono = Math.max(m.comDono || 0, b.comDono)
    if (Number.isFinite(b.total)) m.total = b.total
    if (b.concluido && (m.cursor || 0) >= (m.total || 0)) m.concluido = true       // nunca "concluído" com cursor atrás
    m.atualizadoEm = Date.now()
    await env.ENGAGEMENT.put('backup:manifest', JSON.stringify(m))
    return json({ ok: true })
  }

  // ——— baixar um arquivo do backup (stream como attachment) ———
  if (action === 'baixar') {
    const key = String(b.key || '').replace(/^\/+/, '')
    if (!/^backup\//.test(key)) return json({ ok: false, msg: 'Chave inválida.' }, 400)
    const obj = await R2.get(key)
    if (!obj) return json({ ok: false, msg: 'Arquivo não encontrado no backup.' }, 404)
    const nome = key.split('/').pop() || 'backup'
    return new Response(obj.body, {
      headers: {
        'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'content-disposition': `attachment; filename="${nome}"`,
        'cache-control': 'no-store',
      },
    })
  }

  return json({ ok: false, msg: 'Ação desconhecida.' }, 400)
}
