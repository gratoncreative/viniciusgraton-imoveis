import { kvStore } from '../_lib/store.js'
import { imoviewLogin } from '../_lib/imoview.js'
/**
 * Cloudflare Pages Function — Painel ADMIN do Vinícius (seguro).
 *
 * AUTENTICAÇÃO:
 *  - Se existir `admin:auth` no KV (definido pelo painel), a senha é verificada
 *    por HASH PBKDF2 (salt + 100k iterações) e o token é assinado com uma chave
 *    secreta aleatória (tokenKey) guardada só no KV — impossível de forjar.
 *  - Senão (bootstrap), cai para a variável de ambiente ADMIN_PASS.
 *  - Trocar a senha pelo painel (action 'set-password') grava o hash no KV e
 *    passa a IGNORAR a ADMIN_PASS antiga (rotação real, sem mexer na Cloudflare).
 *
 *   POST /api/admin { action:'login', email, senha }            -> { ok, token }
 *   POST /api/admin { action:'data', token }                    -> { anuncios, leads, clientes }
 *   POST /api/admin { action:'del', token, key }                -> { ok }
 *   POST /api/admin { action:'aprovar', token, key, aprovado }  -> { ok }
 *   POST /api/admin { action:'patch', token, key, patch }       -> { ok }
 *   POST /api/admin { action:'set-password', token, novaSenha } -> { ok }
 */
// MD5 compacto — necessário para autenticação Imoview (SubtleCrypto não suporta MD5)
function md5hex(s) {
  const r=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21]
  const K=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296))
  const bytes=new TextEncoder().encode(s),len=bytes.length
  const pad=len%64<56?56-len%64:120-len%64
  const buf=new Uint8Array(len+pad+8);buf.set(bytes);buf[len]=0x80
  const dv=new DataView(buf.buffer)
  dv.setUint32(buf.length-8,(len*8)>>>0,true);dv.setUint32(buf.length-4,Math.floor(len/536870912),true)
  let a=0x67452301,b=0xEFCDAB89|0,c=0x98BADCFE|0,d=0x10325476
  for(let i=0;i<buf.length;i+=64){
    const W=Array.from({length:16},(_,j)=>dv.getInt32(i+j*4,true))
    let A=a,B=b,C=c,D=d
    for(let j=0;j<64;j++){
      let f,g
      if(j<16){f=(B&C)|(~B&D);g=j}else if(j<32){f=(D&B)|(~D&C);g=(5*j+1)%16}else if(j<48){f=B^C^D;g=(3*j+5)%16}else{f=C^(B|~D);g=(7*j)%16}
      const t=D;D=C;C=B;const x=(A+f+K[j]+W[g])|0;B=(B+((x<<r[j])|(x>>>(32-r[j]))))|0;A=t
    }
    a=(a+A)|0;b=(b+B)|0;c=(c+C)|0;d=(d+D)|0
  }
  const out=new Uint8Array(16),ov=new DataView(out.buffer)
  ov.setInt32(0,a,true);ov.setInt32(4,b,true);ov.setInt32(8,c,true);ov.setInt32(12,d,true)
  return[...out].map(x=>x.toString(16).padStart(2,'0')).join('')
}

const ADMIN_EMAIL_DEFAULT = 'contato@viniciusgraton.com.br'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // sessão admin de 30 dias (era 12h — causava "sessão expirada" no uso entre dias)
const ORIGIN = 'https://viniciusgraton.com.br'
const originOk = (req) => { const o = req.headers.get('origin'); return !o || o === ORIGIN }

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const temKV = (env) => env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
const enc = new TextEncoder()
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)))
const eqStr = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function pbkdf2(password, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: iter, hash: 'SHA-256' }, key, 256)
  return toHex(bits)
}
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg))
  return toHex(sig)
}
async function makeToken(signKey) {
  const exp = Date.now() + TTL_MS
  return `${exp}.${await hmacHex(signKey, String(exp))}`
}
async function validToken(signKey, token) {
  if (!signKey || !token || typeof token !== 'string' || token.indexOf('.') < 0) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Date.now() > Number(exp)) return false
  return eqStr(await hmacHex(signKey, exp), sig)
}
async function getAuth(env) {
  if (!temKV(env)) return null
  try { return await env.ENGAGEMENT.get('admin:auth', 'json') } catch { return null }
}

// Leitura em LOTE tolerante: usa entries() da facade (1 query no D1 + KV só do legado)
// quando existir; senão (sem D1) cai no list+get do KV. Evita o "D1 miss + KV get" por
// chave que dobrava os subrequests e derrubava a ação 'data' (admin "inoperante").
async function bulkEntries(store, prefix) {
  if (store && typeof store.entries === 'function') return store.entries({ prefix })
  const lk = await store.list({ prefix })
  const vals = await Promise.all((lk.keys || []).map((k) =>
    store.get(k.name, 'json').then((v) => (v ? { name: k.name, value: v, metadata: k.metadata } : null)).catch(() => null)
  ))
  return vals.filter(Boolean)
}

// Auto-cadastra o PROPRIETÁRIO captado como contato no sistema (aparece no /admin → Leads).
// Chave determinística por imóvel (lead:prop-<cod>) → atualiza sem duplicar.
async function registrarProprietario(env, cod, owner) {
  try {
    const key = 'lead:prop-' + cod
    const prev = await env.ENGAGEMENT.get(key, 'json').catch(() => null)
    const lead = {
      tipo: 'lead', papel: 'proprietario',
      nome: String(owner.nome || '').slice(0, 120),
      fone: String(owner.fone || '').slice(0, 40),
      email: String(owner.email || '').slice(0, 160),
      bairro: `Proprietário (captação) · imóvel ${cod}`,
      cod, imovel: cod,
      ts: (prev && prev.ts) || Date.now(),
      atualizadoEm: Date.now(),
    }
    await env.ENGAGEMENT.put(key, JSON.stringify(lead))
  } catch {}
}

// Mapeia o nome técnico do campo do Imoview (PessoaF/PessoaJ) para um rótulo em PT.
function rotuloCampo(name) {
  const n = String(name || '').toLowerCase().replace(/[^a-z]/g, '')
  const map = [['cnpj', 'CNPJ'], ['cpf', 'CPF'], ['orgaoemissor', 'Órgão emissor'], ['orgaoexpedidor', 'Órgão emissor'], ['rg', 'RG'], ['datanasc', 'Data de nascimento'], ['nascimento', 'Data de nascimento'], ['nomepai', 'Nome do pai'], ['nomemae', 'Nome da mãe'], ['conjuge', 'Cônjuge'], ['nomecompleto', 'Nome'], ['razaosocial', 'Razão social'], ['nomefantasia', 'Nome fantasia'], ['nome', 'Nome'], ['email', 'E-mail'], ['celular', 'Celular'], ['whatsapp', 'WhatsApp'], ['telefonecomercial', 'Telefone comercial'], ['telefoneresidencial', 'Telefone residencial'], ['telefone', 'Telefone'], ['logradouro', 'Endereço'], ['endereco', 'Endereço'], ['numero', 'Número'], ['complemento', 'Complemento'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['estadocivil', 'Estado civil'], ['estado', 'Estado'], ['uf', 'UF'], ['cep', 'CEP'], ['profissao', 'Profissão'], ['nacionalidade', 'Nacionalidade'], ['naturalidade', 'Naturalidade'], ['inscricaoestadual', 'Inscrição estadual'], ['inscricao', 'Inscrição'], ['observa', 'Observações'], ['rendamensal', 'Renda mensal'], ['renda', 'Renda'], ['banco', 'Banco'], ['agencia', 'Agência'], ['conta', 'Conta']]
  for (const [k, l] of map) if (n.includes(k)) return l
  return ''
}
const _CAMPO_LIXO = /token|verifi|__|viewstate|\bhash\b|guid|senha|password|captcha|csrf|antiforgery|codigo|hidden/i
// Extrai TODOS os campos do proprietário do HTML da página PessoaF/PessoaJ (inputs + selects + textarea).
function extrairCampos(html) {
  const out = []; const seen = new Set()
  const add = (rot, val) => {
    val = String(val || '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#?[a-z0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
    if (!rot || !val || val.length < 2 || val.length > 200 || seen.has(rot)) return
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val)) return // GUID
    seen.add(rot); out.push({ rotulo: rot, valor: val })
  }
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0]
    if (_CAMPO_LIXO.test(tag)) continue
    if (/type=["'](?:hidden|submit|button|checkbox|radio|password|file)["']/i.test(tag)) continue
    const val = (tag.match(/\bvalue=["']([^"']*)["']/i) || [])[1]
    if (!val || !val.trim()) continue
    const rot = rotuloCampo((tag.match(/\b(?:name|id)=["']([^"']+)["']/i) || [])[1] || '')
    if (rot) add(rot, val)
  }
  for (const m of html.matchAll(/<select\b[^>]*\b(?:name|id)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const rot = rotuloCampo(m[1]); if (!rot) continue
    const sel = (m[2].match(/<option[^>]*\bselected\b[^>]*>([^<]*)</i) || [])[1]
    if (sel) add(rot, sel)
  }
  for (const m of html.matchAll(/<textarea\b[^>]*\b(?:name|id)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi)) {
    add(rotuloCampo(m[1]) || 'Observações', m[2].replace(/<[^>]+>/g, ''))
  }
  return out.slice(0, 40)
}

// Extrai todos os campos de um OBJETO JSON de pessoa (proprietário) do Imoview.
function camposDeObjeto(obj) {
  const out = []; const seen = new Set()
  const add = (rot, val) => {
    val = String(val == null ? '' : (Array.isArray(val) ? val.join(', ') : val)).trim()
    if (!rot || !val || val.length > 200 || seen.has(rot)) return
    if (/^(?:0|false|null|undefined|n[ãa]o informad[oa])$/i.test(val)) return
    seen.add(rot); out.push({ rotulo: rot, valor: val })
  }
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 2) return
    for (const k in o) {
      const v = o[k]
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, depth + 1)
      else { const rot = rotuloCampo(k); if (rot) add(rot, v) }
    }
  }
  walk(obj, 0)
  return out.slice(0, 40)
}

// Extrai o ENDEREÇO DO IMÓVEL da página /Imovel/Detalhes do Imoview (texto server-rendered).
function extrairEnderecoImovel(html) {
  const body = (html.split(/<\/head>/i)[1] || html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const limpa = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#?[a-z0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
  let end = ''
  // 1) campo/rótulo "Endereço" seguido do valor
  const m = body.match(/Endere[çc]o\s*<\/[^>]+>\s*<[^>]*>\s*([^<]{6,140})/i) || body.match(/Endere[çc]o[^<]{0,4}<\/[^>]+>([\s\S]{0,180}?)<\/(?:td|div|span|p|li|h\d)>/i)
  if (m) end = limpa(m[1])
  // 2) logradouro explícito no texto (fallback)
  if (!end || end.length < 6 || /^endere/i.test(end)) {
    const t = limpa(body)
    const lg = t.match(/\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Trav\.?|Pra[çc]a|Alameda|Al\.?|Rodovia|Estrada|Quadra)\s+[A-Za-zÀ-ÿ0-9 .'-]{3,60}(?:,?\s*n[ºo°.]?\s*\d{1,6}[A-Za-z]?)?/i)
    if (lg) end = lg[0].trim()
  }
  const cep = (limpa(body).match(/\b\d{5}-?\d{3}\b/) || [])[0] || ''
  return [end, cep && ('CEP ' + cep)].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

// Extrai os CAMPOS estruturados do endereço do imóvel (CEP, Endereço, Nº, Tipo complemento,
// Complemento, Torre/bloco, Bairro) dos inputs/selects do formulário do imóvel no Imoview.
function extrairEnderecoCampos(html) {
  const inputs = {}
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0]
    if (/type=["'](?:submit|button|checkbox|radio|file)["']/i.test(tag)) continue
    const name = (tag.match(/\b(?:name|id)=["']([^"']+)["']/i) || [])[1]; if (!name) continue
    const val = (tag.match(/\bvalue=["']([^"']*)["']/i) || [])[1] || ''
    if (val.trim() && !inputs[name.toLowerCase()]) inputs[name.toLowerCase()] = val.trim()
  }
  for (const m of html.matchAll(/<select\b[^>]*\b(?:name|id)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const sel = (m[2].match(/<option[^>]*\bselected\b[^>]*>([^<]*)</i) || [])[1]
    const nm = m[1].toLowerCase()
    if (sel && sel.trim() && !inputs[nm]) inputs[nm] = sel.trim()
  }
  const pick = (inc, exc) => { for (const n in inputs) if (inc.test(n) && (!exc || !exc.test(n))) return inputs[n]; return '' }
  // "numero" é traiçoeiro: o imóvel tem numeroquartos/vagas/andar/etc. — excluímos esses.
  const NUM_EXC = /quartos|vagas|andar|banh|su[ií]te|elevador|deposit|garagem|pavimento|filho|pessoa|dormitor|telefone|celular|whats|fax|documento|matricula|inscricao|iptu|contrato|processo|registro|edificio|pavto/i
  const campos = [
    ['CEP', pick(/cep/i)],
    ['Endereço', pick(/logradouro|^endereco$|enderecologradouro|nomerua|^rua$/i)],
    ['Nº', pick(/numero|^nro$|^num$|^n[ºo°]$/i, NUM_EXC)],
    ['Tipo complemento', pick(/tipocomplemento|complementotipo|tipo.?complemento/i)],
    ['Complemento', pick(/complemento/i, /tipo/i)],
    ['Torre/bloco', pick(/torre|bloco/i, /desbloq|bloquead|bloqueio/i)],
    ['Bairro', pick(/bairro/i)],
  ]
  return campos.filter(([, v]) => v && v.length <= 120).map(([rotulo, valor]) => ({ rotulo, valor }))
}

// Parser do HTML de /Atendimento/Pesquisar (lista renderizada). Resiliente, baseado nos
// rótulos visíveis: "Atendimento N", nome, WhatsApp, e-mail, Situação, Fase, Mídia, Corretor.
function parseAtendimentosHtml(html) {
  let txt = String(html || '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d|\/td|\/span|\/a)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&([aeiou])acute;/gi, '$1́').normalize('NFC')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n')
  const re = /Atendimento\s+(\d{4,})/g
  const marks = []
  let m
  while ((m = re.exec(txt))) marks.push({ idx: m.index, cod: m[1] })
  const leads = []
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].idx
    const end = i + 1 < marks.length ? marks[i + 1].idx : txt.length
    const before = txt.slice(Math.max(0, start - 600), start)
    const tituloM = before.match(/((?:VENDA|LOCA[ÇC][ÃA]O|ALUGUEL)\s*\|[^\n]+)\s*$/i)
    const seg = txt.slice(start, end)
    const get = (label) => { const mm = seg.match(new RegExp(label + '\\s*[:.]?\\s*([^\\n]+)', 'i')); return mm ? mm[1].trim() : '' }
    const foneM = seg.match(/\(\d{2}\)\s?\d{4,5}[-.\s]?\d{4}/)
    const emailM = seg.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)
    const linhas = seg.split('\n').map((s) => s.trim()).filter(Boolean)
    let nome = ''
    for (let k = 1; k < linhas.length; k++) {
      const L = linhas[k]
      if (/^\(\d{2}\)/.test(L) || /@/.test(L) || /^(Situa|Fase|M[íi]dia|Usu[áa]rio|Corretor|Gerente|Unidade|Quartos|Vagas|Carrinho|Visitas|Proposta|Indicadores|A[çc][õo]es|Term[ôo]metro)/i.test(L)) continue
      nome = L; break
    }
    leads.push({
      id: marks[i].cod,
      nome: nome.slice(0, 120),
      fone: foneM ? foneM[0].trim() : '',
      email: emailM ? emailM[0] : '',
      origem: get('M[íi]dia de origem').slice(0, 60),
      interesse: (tituloM ? tituloM[1].trim() : '').slice(0, 300),
      imovelCod: '',
      situacao: get('Situa[çc][ãa]o').slice(0, 60),
      fase: get('Fase atendimento').slice(0, 80),
      ultimoContatoEm: get('[ÚU]ltima intera[çc][ãa]o').slice(0, 40),
      criadoEm: '',
      historico: '',
      corretor: get('Corretor').slice(0, 80),
    })
  }
  return leads
}

export async function onRequestPost({ env, request }) {
  env = { ...env, ENGAGEMENT: kvStore(env) }
  try {
  if (!originOk(request)) return json({ error: 'origem' }, 403)
  const email = String(env.ADMIN_EMAIL || ADMIN_EMAIL_DEFAULT).trim().toLowerCase()
  const b = await request.json().catch(() => ({}))
  const action = b.action
  const auth = await getAuth(env)
  const signKey = (auth && auth.tokenKey) || env.ADMIN_PASS || null

  if (action === 'login') {
    if (!auth && !env.ADMIN_PASS) return json({ error: 'config', msg: 'Defina a variável ADMIN_PASS na Cloudflare (ou troque a senha pelo painel) para ativar o login.' }, 503)
    // proteção contra força-bruta: máx. 5 tentativas falhas por IP a cada 15 min
    const kv = env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function' ? env.ENGAGEMENT : null
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:adminlogin:' + ip
    if (kv) {
      const tentativas = parseInt(await kv.get(rlKey), 10) || 0
      if (tentativas >= 5) return json({ error: 'limite', msg: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, 429)
    }
    const okEmail = String(b.email || '').trim().toLowerCase() === email
    let okPass = false
    if (auth) okPass = eqStr(await pbkdf2(String(b.senha || ''), auth.salt, auth.iter), auth.hash)
    else okPass = eqStr(String(b.senha || ''), String(env.ADMIN_PASS))
    if (!okEmail || !okPass) {
      if (kv) { const t = parseInt(await kv.get(rlKey), 10) || 0; try { await kv.put(rlKey, String(t + 1), { expirationTtl: 900 }) } catch {} }
      await new Promise((r) => setTimeout(r, 600)) // atraso fixo contra brute-force
      return json({ error: 'credenciais', msg: 'E-mail ou senha incorretos.' }, 401)
    }
    if (kv) { try { await kv.delete(rlKey) } catch {} }
    return json({ ok: true, token: await makeToken(signKey) })
  }

  // Demais ações exigem token válido
  if (!signKey) return json({ error: 'config' }, 503)
  const token = b.token || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!(await validToken(signKey, token))) return json({ error: 'sessao', msg: 'Sessão expirada. Faça login de novo.' }, 401)
  if (!temKV(env)) return json({ error: 'kv', msg: 'Banco (KV) não configurado neste ambiente.' }, 200)

  if (action === 'set-password') {
    const nova = String(b.novaSenha || '')
    if (nova.length < 8) return json({ error: 'curta', msg: 'A nova senha precisa ter pelo menos 8 caracteres.' }, 400)
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
    const iter = 100000
    const hash = await pbkdf2(nova, salt, iter)
    const tokenKey = toHex(crypto.getRandomValues(new Uint8Array(32)))
    await env.ENGAGEMENT.put('admin:auth', JSON.stringify({ salt, hash, iter, tokenKey, atualizadoEm: Date.now() }))
    return json({ ok: true, novoToken: await makeToken(tokenKey) })
  }

  if (action === 'publicar-social') {
    const fotos = (Array.isArray(b.fotos) ? b.fotos : []).filter((u) => typeof u === 'string' && /^https?:/.test(u)).slice(0, 10)
    const legenda = String(b.legenda || '').slice(0, 2200)
    const redes = b.redes || { ig: true, fb: true }
    const metaToken = String(env.META_TOKEN || '')
    const igUser = String(env.IG_USER_ID || '')
    const fbPage = String(env.FB_PAGE_ID || '')
    if (!fotos.length) return json({ error: 'fotos', msg: 'Sem fotos para publicar.' }, 400)
    if (!metaToken || (redes.ig && !igUser) || (redes.fb && !fbPage)) return json({ error: 'config', msg: 'Configure META_TOKEN + IG_USER_ID/FB_PAGE_ID nas variáveis do Cloudflare.' }, 503)
    // normaliza p/ 4:5 (1080x1350) c/ fundo branco — atende a proporção exigida pelo Instagram (proxy grátis)
    const norm = (u) => `https://images.weserv.nl/?url=${encodeURIComponent(u.replace(/^https?:\/\//, ''))}&w=1080&h=1350&fit=contain&cbg=ffffff`
    const G = 'https://graph.facebook.com/v19.0'
    const out = {}
    if (redes.ig && igUser) {
      try {
        const ids = []
        for (const f of fotos) {
          const r = await fetch(`${G}/${igUser}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_url: norm(f), is_carousel_item: true, access_token: metaToken }) })
          const j = await r.json(); if (j.id) ids.push(j.id); else throw new Error((j.error && j.error.message) || 'falha na foto')
        }
        const c = await fetch(`${G}/${igUser}/media`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ media_type: 'CAROUSEL', children: ids, caption: legenda, access_token: metaToken }) })
        const cj = await c.json(); if (!cj.id) throw new Error((cj.error && cj.error.message) || 'falha no carrossel')
        const p = await fetch(`${G}/${igUser}/media_publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ creation_id: cj.id, access_token: metaToken }) })
        const pj = await p.json(); out.instagram = pj.id ? { ok: true, id: pj.id } : { ok: false, erro: (pj.error && pj.error.message) || 'falha ao publicar' }
      } catch (e) { out.instagram = { ok: false, erro: e.message } }
    }
    if (redes.fb && fbPage) {
      try {
        const att = []
        for (const f of fotos) {
          const r = await fetch(`${G}/${fbPage}/photos`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: f, published: false, access_token: metaToken }) })
          const j = await r.json(); if (j.id) att.push({ media_fbid: j.id })
        }
        const post = await fetch(`${G}/${fbPage}/feed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: legenda, attached_media: att, access_token: metaToken }) })
        const pj = await post.json(); out.facebook = pj.id ? { ok: true, id: pj.id } : { ok: false, erro: (pj.error && pj.error.message) || 'falha ao publicar' }
      } catch (e) { out.facebook = { ok: false, erro: e.message } }
    }
    return json({ ok: true, resultados: out })
  }

  if (action === 'data') {
    try {
      const out = { anuncios: [], leads: [], clientes: [], news: [] }
      // leitura em LOTE (entries) corta o double-read D1+KV por chave → não estoura subrequests.
      // aprovado:/crm: só precisam das CHAVES+metadata (list é barato), não do valor.
      const [anuncios, leads, contas, news, apr, crm] = await Promise.all([
        bulkEntries(env.ENGAGEMENT, 'anuncio:'),
        bulkEntries(env.ENGAGEMENT, 'lead:'),
        bulkEntries(env.ENGAGEMENT, 'conta:'),
        bulkEntries(env.ENGAGEMENT, 'news:'),
        env.ENGAGEMENT.list({ prefix: 'aprovado:' }),
        env.ENGAGEMENT.list({ prefix: 'crm:' }),
      ])
      const push = (arr, ents) => { for (const e of ents) { const v = e.value; if (v) { v._key = e.name; arr.push(v) } } }
      push(out.anuncios, anuncios); push(out.leads, leads); push(out.clientes, contas); push(out.news, news)
      out.anuncios.sort((a, b) => (b.ts || 0) - (a.ts || 0))
      out.leads.sort((a, b) => (b.ts || 0) - (a.ts || 0))
      out.clientes.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
      out.news.sort((a, b) => (b.ts || 0) - (a.ts || 0))
      out.aprovados = (apr?.keys || []).map((k) => k.name.slice('aprovado:'.length))
      const crmKeys = crm?.keys || []
      out.crmTotal = crmKeys.length
      out.crmNovos = 0; out.crmNovidades = 0
      for (const k of crmKeys) {
        if (k.metadata?.novo) out.crmNovos++
        if (k.metadata?.temNovidade) out.crmNovidades++
      }
      return json(out)
    } catch (e) {
      // nunca derruba o painel inteiro: devolve 200 com o que tem + a causa real
      return json({ error: 'data', msg: 'Falha ao carregar dados: ' + String((e && e.message) || e).slice(0, 160), anuncios: [], leads: [], clientes: [], news: [], aprovados: [], crmTotal: 0, crmNovos: 0, crmNovidades: 0 }, 200)
    }
  }

  if (action === 'del') {
    const key = String(b.key || '')
    if (!/^(anuncio|lead|conta|news):/.test(key)) return json({ error: 'key invalida' }, 400)
    await env.ENGAGEMENT.delete(key)
    return json({ ok: true })
  }

  if (action === 'aprovar') {
    const key = String(b.key || '')
    if (!/^anuncio:/.test(key)) return json({ error: 'key invalida' }, 400)
    const v = await env.ENGAGEMENT.get(key, 'json')
    if (!v) return json({ error: 'nao encontrado' }, 404)
    v.aprovado = b.aprovado !== false
    await env.ENGAGEMENT.put(key, JSON.stringify(v))
    return json({ ok: true, aprovado: v.aprovado })
  }

  // Atualiza campos de GESTÃO (CRM) num registro: status e nota (leads/anúncios/contas)
  if (action === 'patch') {
    const key = String(b.key || '')
    if (!/^(anuncio|lead|conta|news):/.test(key)) return json({ error: 'key invalida' }, 400)
    const v = await env.ENGAGEMENT.get(key, 'json')
    if (!v) return json({ error: 'nao encontrado' }, 404)
    const patch = b.patch && typeof b.patch === 'object' ? b.patch : {}
    if ('status' in patch) v.status = String(patch.status || '').slice(0, 24)
    if ('nota' in patch) v.nota = String(patch.nota || '').slice(0, 1200)
    if ('aprovado' in patch) v.aprovado = patch.aprovado !== false
    await env.ENGAGEMENT.put(key, JSON.stringify(v))
    return json({ ok: true })
  }

  // Edição de imóvel publicado + dados do PROPRIETÁRIO (confidenciais, só admin)
  if (action === 'imovel-get') {
    const codigo = String(b.codigo || '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const v = await env.ENGAGEMENT.get('imovel:' + codigo, 'json')
    return json({ ok: true, registro: v || null })
  }
  if (action === 'imovel-save') {
    const codigo = String(b.codigo || '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const existing = await env.ENGAGEMENT.get('imovel:' + codigo, 'json') || {}
    // owner só é sobrescrito se vier no payload; senão preserva o que já existe (o editor de anúncio não mexe nele)
    const o = b.owner && typeof b.owner === 'object' ? b.owner : null
    const owner = o
      ? { nome: String(o.nome || '').slice(0, 120), email: String(o.email || '').slice(0, 160), fone: String(o.fone || '').slice(0, 40) }
      : (existing.owner || { nome: '', email: '', fone: '' })
    const c = b.campos && typeof b.campos === 'object' ? b.campos : {}
    const campos = {}
    for (const k of ['preco', 'precoAnterior', 'quartos', 'suites', 'banheiros', 'vagas', 'area', 'condominio', 'areaLote']) if (k in c) campos[k] = Number(c[k]) || 0
    for (const k of ['tipo', 'bairro', 'finalidade', 'cidade']) if (k in c) campos[k] = String(c[k] || '').slice(0, 60)
    if ('titulo' in c) campos.titulo = String(c.titulo || '').slice(0, 140)
    if ('descricao' in c) campos.descricao = String(c.descricao || '').slice(0, 3000)
    for (const k of ['endereco', 'pontoReferencia']) if (k in c) campos[k] = String(c[k] || '').slice(0, 200)
    for (const k of ['video', 'tour360']) if (k in c) campos[k] = String(c[k] || '').slice(0, 400)
    for (const k of ['destaque', 'oculto']) if (k in c) campos[k] = !!c[k]
    // apartamento: andar (0 = térreo) e elevador (true/false). Só grava se informado.
    if (c.andar !== '' && c.andar !== null && c.andar !== undefined) campos.andar = Number(c.andar) || 0
    if (typeof c.elevador === 'boolean') campos.elevador = c.elevador
    if (Array.isArray(c.fotos)) campos.fotos = c.fotos.filter((s) => typeof s === 'string').slice(0, 40).map((s) => s.slice(0, 400))
    // mescla sobre o que já estava salvo (edições parciais não apagam o resto)
    const camposFinais = { ...(existing.campos || {}), ...campos }
    await env.ENGAGEMENT.put('imovel:' + codigo, JSON.stringify({ ...existing, owner, campos: camposFinais, atualizadoEm: Date.now() }))
    return json({ ok: true, campos: camposFinais })
  }

  // ————— Publicidade editável (peça de lançamento) — admin —————
  if (action === 'promo-get') {
    const v = await env.ENGAGEMENT.get('config:promo', 'json')
    return json({ ok: true, promo: v || null })
  }
  if (action === 'promo-save') {
    const p = b.promo && typeof b.promo === 'object' ? b.promo : {}
    const lim = (s, n) => String(s == null ? '' : s).slice(0, n)
    const promo = {
      ativo: p.ativo !== false,
      capa: lim(p.capa, 400),
      selo: lim(p.selo, 40),
      titulo: lim(p.titulo, 80),
      subtitulo: lim(p.subtitulo, 160),
      descricao: lim(p.descricao, 300),
      precoLabel: lim(p.precoLabel, 60),
      ctaTexto: lim(p.ctaTexto, 40),
      ctaUrl: lim(p.ctaUrl, 600),
      waMsg: lim(p.waMsg, 600),
      atualizadoEm: Date.now(),
    }
    try {
      await env.ENGAGEMENT.put('config:promo', JSON.stringify(promo))
    } catch (e) {
      return json({ error: 'kv', msg: 'Não consegui gravar a publicidade (KV): ' + String((e && e.message) || e).slice(0, 180) }, 500)
    }
    return json({ ok: true, promo })
  }

  // Upload de foto nova do imóvel: recebe data URL (já redimensionada no navegador),
  // guarda a imagem no KV do próprio dono e devolve a URL pública servida por /api/img.
  if (action === 'img-upload') {
    const codigo = String(b.codigo || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    const dataUrl = String(b.dataUrl || '')
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return json({ error: 'imagem', msg: 'Formato de imagem inválido (use JPG, PNG ou WEBP).' }, 400)
    const ct = m[1]
    const b64 = m[2]
    if (b64.length > 2200000) return json({ error: 'grande', msg: 'Imagem muito grande. Tente uma com menos resolução.' }, 413)
    const id = `imgupload:${codigo}:${crypto.randomUUID()}`
    await env.ENGAGEMENT.put(id, JSON.stringify({ ct, b64, codigo, ts: Date.now() }))
    return json({ ok: true, url: `/api/img?id=${id}` })
  }

  // Aprovar (publicar) ou recusar um imóvel IMPORTADO que está pendente.
  if (action === 'imovel-aprovar') {
    const codigo = String(b.codigo || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    if (!codigo) return json({ error: 'codigo' }, 400)
    if (b.aprovado === false) await env.ENGAGEMENT.delete('aprovado:' + codigo)
    else await env.ENGAGEMENT.put('aprovado:' + codigo, JSON.stringify({ ts: Date.now() }))
    return json({ ok: true, aprovado: b.aprovado !== false })
  }

  // imóveis em DESTAQUE no topo do catálogo (no máx. 3) — lido pelo /api/destaque
  if (action === 'catalogo-destaque') {
    if (!temKV(env)) return json({ error: 'kv', msg: 'Armazenamento (KV) indisponível neste ambiente.' }, 503)
    const codigos = Array.isArray(b.codigos)
      ? [...new Set(b.codigos.map((x) => String(x).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)).filter(Boolean))].slice(0, 3)
      : []
    try {
      await env.ENGAGEMENT.put('config:catalogo-topo', JSON.stringify({ codigos, ts: Date.now() }))
    } catch (e) {
      return json({ error: 'destaque', msg: 'Falha ao gravar destaque (KV): ' + String((e && e.message) || e).slice(0, 160) }, 500)
    }
    return json({ ok: true, codigos })
  }

  // ————— CRM "Meus clientes" (preferências + sugestões + página personalizada) —————
  if (action === 'crm-list') {
    // leitura em LOTE (entries) — evita o double-read D1+KV por chave (subrequests).
    const ents = await bulkEntries(env.ENGAGEMENT, 'crm:')
    const out = []
    for (const e of ents) {
      const v = e.value
      if (!v) continue
      // Strip foto (até ~700KB) e os logs grandes (atendimentos/notas) — carregados sob demanda no crm-get.
      // Mantém tags/status (pequenos) para os chips da lista e um contador de atendimentos.
      const { foto, atendimentos, notas, ...rest } = v
      out.push({ ...rest, temFoto: !!foto, nAtend: Array.isArray(atendimentos) ? atendimentos.length : 0 })
    }
    out.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    return json({ ok: true, clientes: out })
  }
  if (action === 'crm-get') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (!id) return json({ error: 'id' }, 400)
    const v = await env.ENGAGEMENT.get('crm:' + id, 'json')
    return json({ ok: true, cliente: v || null })
  }
  if (action === 'crm-save') {
    const c = b.cliente && typeof b.cliente === 'object' ? b.cliente : {}
    const wa = String(c.whatsapp || '').replace(/\D/g, '').slice(0, 15)
    if (wa.length < 10) return json({ error: 'whatsapp', msg: 'Informe o WhatsApp com DDD (obrigatório).' }, 400)
    let id = String(c.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    let reg = {}
    try {
      if (id) reg = (await env.ENGAGEMENT.get('crm:' + id, 'json')) || {}
      else id = crypto.randomUUID()
    } catch (e) {
      return json({ error: 'interno', msg: 'Erro ao ler cadastro existente. Tente de novo.' }, 500)
    }
    const lim = (s, n) => String(s == null ? '' : s).slice(0, n)
    const arrStr = (a, max, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, max).map((x) => lim(x, n)) : [])
    // sugeridos: tolera códigos numéricos (converte pra string antes de filtrar)
    const arrCod = (a, max) => (Array.isArray(a) ? a.map((x) => String(x)).filter((x) => x && x.length <= 20).slice(0, max) : [])
    // #1 atendimentos registrados (liguei/visitei/mensagem) e #2 notas datadas e #13 etiquetas
    const arrAtend = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === 'object').slice(0, 120).map((x) => ({ tipo: lim(x.tipo, 24), em: Number(x.em) || Date.now(), obs: lim(x.obs, 600) })) : [])
    const arrNotas = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === 'object' && String(x.texto || '').trim()).slice(0, 200).map((x) => ({ em: Number(x.em) || Date.now(), texto: lim(x.texto, 2000) })) : [])
    const atendimentos = arrAtend(c.atendimentos != null ? c.atendimentos : reg.atendimentos)
    const notas = arrNotas(c.notas != null ? c.notas : reg.notas)
    const ultAtend = atendimentos.reduce((mx, a) => Math.max(mx, Number(a.em) || 0), 0)
    const novo = {
      id, criadoEm: reg.criadoEm || Date.now(), atualizadoEm: Date.now(),
      nome: lim(c.nome, 80), whatsapp: wa, finalidade: lim(c.finalidade, 20),
      email: lim(c.email, 120) || reg.email || '',
      tipos: arrStr(c.tipos, 8, 30), bairros: arrStr(c.bairros, 40, 60),
      precoMin: Number(c.precoMin) || 0, precoMax: Number(c.precoMax) || 0,
      quartosMin: Number(c.quartosMin) || 0, suitesMin: Number(c.suitesMin) || 0,
      vagasMin: Number(c.vagasMin) || 0, areaMin: Number(c.areaMin) || 0,
      obs: lim(c.obs, 1500), sugeridos: arrCod(c.sugeridos, 60),
      papeis: arrStr(c.papeis, 8, 24),
      nota: lim(c.nota, 1000), status: lim(c.status, 24),
      tags: arrStr(c.tags != null ? c.tags : reg.tags, 16, 28),
      avisados: arrStr(c.avisados != null ? c.avisados : reg.avisados, 500, 16),
      atendimentos, notas,
      foto: lim(c.foto, 200000), // dataURL da foto do cliente (JPEG ~480px, ≈150KB base64)
      // preserva o que o PRÓPRIO cliente refinou na página dele (nunca sobrescrever no save do admin)
      feedback: reg.feedback && typeof reg.feedback === 'object' ? reg.feedback : {},
      refinadoEm: reg.refinadoEm || 0,
      // origem/prazo vêm do chat de busca; ao salvar, deixa de ser "novo"
      origem: reg.origem || lim(c.origem, 20) || '',
      prazo: lim(c.prazo, 40) || reg.prazo || '',
      novo: false,
      // última ação reflete o atendimento manual mais recente (corrige o "parado há X dias")
      ultimaAcaoEm: Math.max(reg.ultimaAcaoEm || 0, Number(c.ultimaAcaoEm) || 0, ultAtend),
      temNovidade: false, // ao salvar, o Vinícius já viu
    }
    try {
      const valorJson = JSON.stringify(novo)
      await env.ENGAGEMENT.put('crm:' + id, valorJson, { metadata: { novo: false, temNovidade: false } })
    } catch (e) {
      return json({ error: 'interno', msg: 'Erro ao gravar cliente (KV): ' + String(e).slice(0, 120) }, 500)
    }
    return json({ ok: true, cliente: novo })
  }
  if (action === 'crm-visto') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (id) { const r = await env.ENGAGEMENT.get('crm:' + id, 'json'); if (r && r.temNovidade) { r.temNovidade = false; await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(r), { metadata: { novo: !!r.novo, temNovidade: false } }) } }
    return json({ ok: true })
  }
  // marca imóveis já AVISADOS a um cliente (some das "oportunidades de contato" e não repete)
  if (action === 'crm-avisado') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    const cods = Array.isArray(b.codigos) ? b.codigos.map((x) => String(x).replace(/[^\w-]/g, '').slice(0, 16)).filter(Boolean) : []
    if (!id || !cods.length) return json({ ok: true })
    const r = await env.ENGAGEMENT.get('crm:' + id, 'json')
    if (r) {
      r.avisados = [...new Set([...(Array.isArray(r.avisados) ? r.avisados : []), ...cods])].slice(-500)
      r.atualizadoEm = Date.now()
      await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(r), { metadata: { novo: !!r.novo, temNovidade: !!r.temNovidade } })
    }
    return json({ ok: true })
  }
  if (action === 'crm-del') {
    const id = String(b.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
    if (id) await env.ENGAGEMENT.delete('crm:' + id)
    return json({ ok: true })
  }

  // ── ATENDIMENTOS EM ABERTO (Imoview) → conversão ──────────────────────────
  // Lista os atendimentos: API oficial (env.IMOVIEW_CHAVE) ou sessão web (fallback).
  // Inputs do cliente: só force/debug — nenhum texto livre vai pro Imoview. Cache 10min.
  if (action === 'atendimentos-list') {
    try {
      const cache = await env.ENGAGEMENT.get('atend:lista', 'json').catch(() => null)
      if (!b.force && !b.debug && cache && (Date.now() - (cache.geradoEm || 0)) < 10 * 60 * 1000) {
        return json({ ok: true, leads: cache.leads || [], geradoEm: cache.geradoEm, source: 'cache' })
      }
      const dbg = {}
      const chave = (env.IMOVIEW_CHAVE || '').trim()
      let raw = null
      let leadsHtml = null

      if (chave) {
        const url = 'https://api.imoview.com.br/Atendimento/RetornarAtendimentos?numeroRegistros=200&numeroPagina=1'
        const r = await fetch(url, { headers: { chave, accept: 'application/json' }, signal: AbortSignal.timeout(12000) }).catch(() => null)
        if (r) { dbg.apiStatus = r.status; const txt = await r.text(); if (b.debug) dbg.apiRaw = txt.slice(0, 4000); try { raw = JSON.parse(txt) } catch {} }
      } else {
        // Sem chave da API → sessão web. Endpoint real (descoberto inspecionando o "PESQUISAR"
        // em app.imoview.com.br/Atendimento): GET /Atendimento/Pesquisar devolve o HTML da lista
        // renderizada (Finalidade=2 Venda, Situacao=1 Em atendimento). Paginamos e parseamos.
        const ses = await imoviewLogin(env, { debug: b.debug === true })
        Object.assign(dbg, ses.dbg || {})
        if (ses.ok) {
          const qs = (pag) => `Finalidade=2&Situacao=1&Termometro=-1&CodigoUnidade=0&CodigoMotivoDescarte=Todos&Pagina=${pag}&Ordenacao=0&Funil=0`
          const headers = { cookie: ses.cookies, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'x-requested-with': 'XMLHttpRequest', accept: 'text/html, */*; q=0.01', referer: `${ses.baseUrl}/Atendimento` }
          leadsHtml = []
          const vistos = new Set()
          for (let pag = 1; pag <= 12; pag++) {
            const r = await fetch(`${ses.baseUrl}/Atendimento/Pesquisar?${qs(pag)}`, { headers, signal: AbortSignal.timeout(12000) }).catch(() => null)
            if (!r || !r.ok) { if (b.debug) dbg['pag' + pag] = r ? r.status : 'erro'; break }
            const html = await r.text()
            if (pag === 1 && b.debug) { dbg.status = r.status; dbg.htmlLen = html.length; dbg.snippet = html.slice(0, 3000) }
            const ls = parseAtendimentosHtml(html)
            let novos = 0
            for (const l of ls) { if (!vistos.has(l.id)) { vistos.add(l.id); leadsHtml.push(l); novos++ } }
            if (novos === 0) break
          }
          dbg.total = leadsHtml.length
        }
      }

      if (b.debug) return json({ ok: !!(raw || (leadsHtml && leadsHtml.length)), leads: (leadsHtml || []).slice(0, 3), dbg }, 200)

      if (leadsHtml) {
        await env.ENGAGEMENT.put('atend:lista', JSON.stringify({ geradoEm: Date.now(), leads: leadsHtml })).catch(() => {})
        return json({ ok: true, leads: leadsHtml, geradoEm: Date.now(), total: leadsHtml.length })
      }

      const arr = Array.isArray(raw) ? raw : (raw && (raw.lista || raw.dados || raw.Data || raw.data || raw.atendimentos || raw.Atendimentos)) || []
      const pick = (o, ...ks) => { for (const k of ks) { if (o && o[k] != null && o[k] !== '') return o[k] } return '' }
      const leads = (Array.isArray(arr) ? arr : []).map((a, i) => ({
        id: String(pick(a, 'codigo', 'Codigo', 'codigoatendimento', 'id', 'Id') || ('a' + i)),
        nome: String(pick(a, 'nome', 'Nome', 'nomecliente', 'NomeCliente', 'nomeLead') || '').slice(0, 120),
        fone: String(pick(a, 'celular', 'Celular', 'telefone', 'Telefone', 'fone') || '').slice(0, 40),
        email: String(pick(a, 'email', 'Email') || '').slice(0, 160),
        origem: String(pick(a, 'midia', 'Midia', 'origem', 'Origem', 'portal') || '').slice(0, 60),
        interesse: String(pick(a, 'imovel', 'Imovel', 'tituloimovel', 'imovelInteresse', 'descricao', 'Descricao') || '').slice(0, 300),
        imovelCod: String(pick(a, 'codigoimovel', 'CodigoImovel', 'imovelCodigo') || '').slice(0, 20),
        situacao: String(pick(a, 'situacao', 'Situacao', 'etapa', 'Etapa', 'status') || '').slice(0, 60),
        ultimoContatoEm: String(pick(a, 'dataultimainteracao', 'DataUltimaInteracao', 'dataUltimoContato', 'ultimaInteracao') || '').slice(0, 40),
        criadoEm: String(pick(a, 'datacadastro', 'DataCadastro', 'data', 'Data') || '').slice(0, 40),
        historico: String(pick(a, 'observacao', 'Observacao', 'historico', 'anotacoes', 'observacoes') || '').slice(0, 600),
        corretor: String(pick(a, 'corretor', 'Corretor', 'nomecorretor', 'usuario') || '').slice(0, 80),
      }))
      await env.ENGAGEMENT.put('atend:lista', JSON.stringify({ geradoEm: Date.now(), leads })).catch(() => {})
      return json({ ok: true, leads, geradoEm: Date.now(), total: leads.length })
    } catch (e) {
      return json({ ok: false, erro: String((e && e.message) || e).slice(0, 200), leads: [] }, 200)
    }
  }

  // Gera mensagem de WhatsApp + plano de ação personalizado p/ UM atendimento (IA Anthropic).
  if (action === 'atendimento-plano') {
    const apiKey = (env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return json({ error: 'config', msg: 'Defina ANTHROPIC_API_KEY na Cloudflare para gerar as mensagens.' }, 503)
    const lim = (s, n) => String(s == null ? '' : s).slice(0, n)
    const lead = (b.lead && typeof b.lead === 'object') ? b.lead : null
    if (!lead) return json({ error: 'lead' }, 400)
    const id = lim(String(lead.id || '').replace(/[^\w-]/g, ''), 40)
    if (id && !b.force) { const c = await env.ENGAGEMENT.get('plano:' + id, 'json').catch(() => null); if (c) return json({ ok: true, ...c, source: 'cache' }) }
    const SYSTEM = 'Você é o assistente de vendas do Vinícius Graton, consultor de imóveis da Rotina Imobiliária em Uberlândia/MG (CRECI em formação). Você escreve mensagens de WhatsApp NA VOZ dele. Regras invioláveis.. (1) trate-o como "consultor"/"consultor da Rotina", NUNCA "corretor"; (2) pontuação sóbria.. use ".." no lugar de dois-pontos e NUNCA travessão; (3) mensagens CURTAS, no máximo 1 emoji; (4) abra com "Me conta.." em primeiro contato ou reaquecimento; (5) TODA mensagem termina com UMA pergunta aberta; (6) tom calmo, sem pressão; (7) cite o imóvel/bairro específico do lead; (8) nunca invente preço, condição ou metragem que não veio na entrada. Objetivo.. converter o atendimento em VISITA agendada. Responda APENAS com um JSON válido (sem markdown), no formato: {"mensagem_whatsapp": "...", "temperatura_confirmada": "quente|morno|frio", "plano": [{"passo": "...", "prazo": "..."}]}'
    const USER = `Gere a abordagem para este atendimento em aberto.\nNome.. ${lim(lead.nome, 120)}\nImóvel de interesse.. ${lim(lead.interesse, 300)}\nOrigem.. ${lim(lead.origem, 60)}\nSituação.. ${lim(lead.situacao, 60)}\nFase do atendimento.. ${lim(lead.fase, 80)}\nÚltimo contato.. ${lim(lead.ultimoContatoEm, 40)}\nHistórico.. ${lim(lead.historico, 400)}\nA "Fase do atendimento" indica em que ponto do funil o lead está (ex.. "Lead qualificado" = já conversou e tem perfil; "Seleção dos imóveis" = está vendo opções; "Primeiro contato" = ainda não falou). Adapte o tom e o próximo passo à fase.\nProduza (1) UMA mensagem de WhatsApp pronta pra copiar, respeitando TODAS as regras, e (2) um plano de 1 a 3 passos (próxima ação + prazo).`
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: (env.ATEND_MODEL || 'claude-opus-4-8'), max_tokens: 1200, system: SYSTEM, messages: [{ role: 'user', content: USER }] }),
        signal: AbortSignal.timeout(30000),
      })
      if (!r.ok) return json({ error: 'ia', msg: 'Falha na IA (' + r.status + ')', detalhe: (await r.text()).slice(0, 200) }, 200)
      const j = await r.json()
      const blk = (j.content || []).find((c) => c.type === 'text') || {}
      let out = {}
      try { out = JSON.parse(String(blk.text || '').replace(/^```json\s*|\s*```$/g, '').trim()) } catch {}
      const fix = (s) => String(s || '').replace(/([^\d]):\s/g, '$1.. ').replace(/[—–]/g, '..')
      const plano = {
        mensagem: fix(lim(out.mensagem_whatsapp || out.mensagem, 2000)),
        temperatura: out.temperatura_confirmada || out.temperatura || '',
        passos: (Array.isArray(out.plano) ? out.plano : []).slice(0, 3).map((p) => ({ passo: lim(p && p.passo, 300), prazo: lim(p && p.prazo, 60) })),
      }
      if (!plano.mensagem) return json({ error: 'ia', msg: 'A IA não retornou uma mensagem válida. Tente regerar.' }, 200)
      if (id) await env.ENGAGEMENT.put('plano:' + id, JSON.stringify({ ...plano, geradoEm: Date.now() }), { expirationTtl: 7 * 24 * 3600 }).catch(() => {})
      return json({ ok: true, ...plano, source: 'ia' })
    } catch (e) { return json({ error: 'ia', msg: String((e && e.message) || e).slice(0, 200) }, 200) }
  }

  // Busca dados do PROPRIETÁRIO via sessão web Imoview (4 passos):
  //   1) login  2) GET /Imovel/Detalhes → data-codigos da pessoa
  //   3) GET /PessoaF/Detalhes/{pessoaCode}  4) parse nome/fone/email do HTML
  if (action === 'owner-fetch') {
    const cod = String(b.codigo || '').replace(/[^\w]/g, '').slice(0, 12)
    if (!cod) return json({ error: 'codigo' }, 400)
    const isDebug = b.debug === true

    // 1. KV cache (ignorado se force=true)
    const force = b.force === true
    const saved = await env.ENGAGEMENT.get('imovel:' + cod, 'json')
    if (!force && saved && saved.owner && (saved.owner.nome || saved.owner.fone)) {
      return json({ ok: true, owner: saved.owner, source: 'saved' })
    }

    const imoviewEmail = (env.IMOVIEW_LOGIN || '').trim()
    const imoviewSenha = (env.IMOVIEW_SENHA || '').trim()
    const WEB = 'https://app.imoview.com.br'
    const UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

    const mergeCookies = (existing, setCookieHeader) => {
      const jar = {}
      const parse = (s) => { if (!s) return; s.split(';')[0].trim().split(',').forEach(c => { const [k,...v]=c.trim().split('='); if(k) jar[k.trim()]=v.join('=') }) }
      existing.split(';').forEach(c => { const [k,...v]=c.trim().split('='); if(k) jar[k.trim()]=v.join('=') })
      ;(setCookieHeader || '').split(/,(?=[^;]+=[^;]+;)/).forEach(c => parse(c))
      return Object.entries(jar).filter(([k])=>k).map(([k,v])=>`${k}=${v}`).join('; ')
    }

    const extractCsrf = (html) => {
      // Tenta múltiplos padrões de atributos (qualquer ordem)
      const inputM = html.match(/<input[^>]*__RequestVerificationToken[^>]*>/i)
      if (inputM) { const v = inputM[0].match(/value=["']([^"']+)["']/); if (v) return v[1] }
      const m1 = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)
      if (m1) return m1[1]
      const m2 = html.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/)
      if (m2) return m2[1]
      return ''
    }

    if (imoviewEmail && imoviewSenha) {
      let dbg = {}
      try {
        // Passo 0: GET /Login/RetornarConvenios → codigoConvenio e rota da Rotina
        const convR = await fetch(`${WEB}/Login/RetornarConvenios?email=${encodeURIComponent(imoviewEmail)}`, {
          headers:{'user-agent':UA, accept:'application/json'}, redirect:'follow', signal:AbortSignal.timeout(8000),
        })
        const convJson = await convR.json().catch(() => ({}))
        const convItem = (convJson.lista || [])[0] || {}
        const codigoConvenio = convItem.codigo || ''
        const rota = convItem.rota || ''
        dbg.codigoConvenio = codigoConvenio
        dbg.rota = rota

        // Passo 1: GET /Login/LogOn → cookie inicial de sessão
        const LOGIN_URL = `${WEB}/Login/LogOn?ReturnUrl=%2f`
        const pgR = await fetch(LOGIN_URL, { headers:{'user-agent':UA}, redirect:'follow', signal:AbortSignal.timeout(10000) })
        dbg.pgStatus = pgR.status
        let cookies = mergeCookies('', pgR.headers.get('set-cookie') || '')
        await pgR.text() // descarta body mas consome o stream

        // Passo 2: POST /Login/LogOn (JSON) → session cookie
        // Imoview usa application/json, não form-encoded (confirmado via Logon.js)
        const loginBody2 = JSON.stringify({
          codigoConvenio,
          rota,
          login: imoviewEmail,
          senha: imoviewSenha,
          gRecaptcha: '',
          urlReturn: '',
        })
        const loginR = await fetch(LOGIN_URL, {
          method:'POST',
          headers:{ 'content-type':'application/json; charset=utf-8', cookie:cookies, 'user-agent':UA, referer:LOGIN_URL, origin:WEB, 'x-requested-with':'XMLHttpRequest' },
          body: loginBody2,
          redirect:'manual',
          signal: AbortSignal.timeout(10000),
        })
        dbg.loginStatus   = loginR.status
        dbg.loginLocation = loginR.headers.get('location') || ''
        cookies = mergeCookies(cookies, loginR.headers.get('set-cookie') || '')
        dbg.hasCookies = cookies.length > 10

        // Resposta é JSON: {"Autorizado":true/false,"Url":"...","Mensagem":"..."}
        const loginBodyTxt = await loginR.text()
        let loginJson = {}
        try { loginJson = JSON.parse(loginBodyTxt) } catch(e) {}
        const loginOk = loginJson.Autorizado === true
        dbg.loginOk = loginOk
        if (isDebug) dbg.loginBodySnippet = loginBodyTxt.slice(0, 400)

        // Se autenticado, segue o Url retornado para consolidar cookies de sessão
        if (loginOk && loginJson.Url) {
          const loc = loginJson.Url.startsWith('http') ? loginJson.Url : `${WEB}${loginJson.Url}`
          const rr = await fetch(loc, { headers:{ cookie:cookies, 'user-agent':UA }, redirect:'manual', signal:AbortSignal.timeout(8000) })
          cookies = mergeCookies(cookies, rr.headers.get('set-cookie') || '')
        }

        if (loginOk) {
          // Passo 3: GET /Imovel/Detalhes/{cod}
          const imovelR = await fetch(`${WEB}/Imovel/Detalhes/${cod}`, {
            headers:{ cookie:cookies, 'user-agent':UA, accept:'text/html', 'x-requested-with':'XMLHttpRequest' },
            redirect:'follow', signal:AbortSignal.timeout(12000),
          })
          dbg.imovelStatus = imovelR.status
          const imovelHtml = await imovelR.text()
          if (isDebug) dbg.imovelSnippet = imovelHtml.slice(0, 2000)
          // ENDEREÇO DO IMÓVEL — está nesta mesma página (server-rendered)
          // ENDEREÇO DO IMÓVEL (campos estruturados). A página de EDIÇÃO traz os inputs preenchidos.
          let enderecoCampos = extrairEnderecoCampos(imovelHtml)
          try {
            const edImR = await fetch(`${WEB}/Imovel/Editar/${cod}`, { headers: { cookie: cookies, 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(12000) })
            dbg.imovelEditarStatus = edImR.status
            if (edImR.ok) {
              const eh = await edImR.text()
              const ec = extrairEnderecoCampos(eh)
              if (ec.length > enderecoCampos.length) enderecoCampos = ec
              if (isDebug) dbg.imovelInputs = (eh.match(/<input\b[^>]*>/gi) || []).filter((t) => /cep|endereco|logradouro|numero|complemento|bairro|torre|bloco|rua/i.test(t)).slice(0, 25).map((t) => t.replace(/\s+/g, ' ').slice(0, 150)).join('\n')
            }
          } catch {}
          const _byRot = (r) => (enderecoCampos.find((c) => c.rotulo === r) || {}).valor || ''
          const enderecoImovel = enderecoCampos.length
            ? [[_byRot('Endereço'), _byRot('Nº')].filter(Boolean).join(', '), _byRot('Complemento'), _byRot('Torre/bloco'), _byRot('Bairro'), _byRot('CEP') && ('CEP ' + _byRot('CEP'))].filter(Boolean).join(' · ')
            : extrairEnderecoImovel(imovelHtml)
          if (isDebug) {
            dbg.enderecoImovel = enderecoImovel; dbg.enderecoCampos = enderecoCampos
            const _bd = imovelHtml.split(/<\/head>/i)[1] || ''
            const _ie = _bd.search(/endere/i)
            dbg.imovelEndCtx = _ie >= 0 ? _bd.slice(Math.max(0, _ie - 120), _ie + 520).replace(/\s+/g, ' ') : 'sem "endereço" no corpo'
          }

          // === ESTRATÉGIA 1: Lista de Proprietários (endpoint AJAX dedicado) ===
          // Busca URL do endpoint diretamente no HTML (href, data-url, JS string)
          const propHrefM = imovelHtml.match(/(?:href|data-url|data-href|data-action|data-load)\s*=\s*["']([^"']*[Pp]roprietar[^"']*)["']/i)
            || imovelHtml.match(/['"]([^'"]*\/[Pp]roprietar[^'"]*\?[^'"]{3,100})['"]/i)
          const propHref = propHrefM ? propHrefM[1] : null
          if (isDebug) {
            dbg.propHref = propHref
            // Trecho do HTML em volta da 1ª menção a "proprietar" — para diagnóstico da URL correta
            const pi2 = imovelHtml.toLowerCase().indexOf('proprietar')
            dbg.propSection = pi2 >= 0 ? imovelHtml.slice(Math.max(0, pi2 - 80), pi2 + 500) : 'não encontrado'
          }

          const propCandidates = [
            ...(propHref ? [propHref.startsWith('http') ? propHref : `${WEB}${propHref}`] : []),
            `${WEB}/Proprietario/ListarProprietariosPorImovel?imovelCodigo=${cod}`,
            `${WEB}/Imovel/RetornarProprietarios?imovelCodigo=${cod}`,
          ]

          let owner = { nome: '', email: '', fone: '' }

          for (let pi = 0; pi < propCandidates.length; pi++) {
            const endpt = propCandidates[pi]
            try {
              const propR = await fetch(endpt, {
                headers:{ cookie:cookies, 'user-agent':UA, accept:'application/json,text/html,*/*', 'x-requested-with':'XMLHttpRequest' },
                redirect:'follow', signal:AbortSignal.timeout(7000),
              })
              if (isDebug) dbg[`propStatus${pi}`] = `${propR.status} ${endpt.replace(WEB,'').slice(0,60)}`
              if (!propR.ok) continue
              const propBody = await propR.text()

              // Tenta JSON
              try {
                const j = JSON.parse(propBody)
                const lista = Array.isArray(j) ? j : (j.lista || j.dados || j.proprietarios || j.Proprietarios || j.Data || j.data || [])
                if (Array.isArray(lista) && lista.length > 0) {
                  const p = lista.find(x => /J/i.test(x.tipo || x.Tipo || x.TipoProprietario || '')) || lista[0]
                  const n = String(p.nome || p.Nome || p.nomeCompleto || p.NomeProprietario || p.nomeProprietario || '').trim()
                  const f = String(p.telefone || p.Telefone || p.celular || p.Celular || p.TelefoneResidencial || p.TelefoneCelular || '').trim()
                  const e = String(p.email || p.Email || '').trim()
                  if (n || f) {
                    owner = { nome: n.slice(0, 120), email: e.slice(0, 160), fone: f.slice(0, 40) }
                    try { const dd = camposDeObjeto(p); if (dd.length) owner.dados = dd } catch {}
                    if (isDebug) dbg.propJson = JSON.stringify(p).slice(0, 1500)
                    break
                  }
                }
              } catch {}

              // Tenta HTML com tabela de proprietários
              if (!owner.nome && !owner.fone) {
                const rows = [...propBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
                for (const rm of rows) {
                  const cells = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g,'').trim())
                  if (cells.length >= 2) {
                    const nome = (cells[1] || cells[0]).trim()
                    if (nome && nome.length > 2 && !/^(?:nome|cód|código|tipo|email|telefone|percentual|ações)$/i.test(nome)) {
                      const foneCell = cells.find(c => /\(\d{2}\)/.test(c) || /\d{4,5}-\d{4}/.test(c)) || ''
                      const emailCell = cells.find(c => c.includes('@')) || ''
                      owner = { nome:nome.slice(0,120), email:emailCell.slice(0,160), fone:foneCell.slice(0,40) }
                      break
                    }
                  }
                }
                if (isDebug && !owner.nome) dbg[`propBody${pi}`] = propBody.slice(0, 400)
              }
              if (owner.nome || owner.fone) { if (isDebug) dbg.ownerStrategy = `lista-prop-${pi}`; break }
            } catch(e2) {
              if (isDebug) dbg[`propErr${pi}`] = String(e2).slice(0, 80)
            }
          }

          // === ESTRATÉGIA 2: PessoaF/PessoaJ — RELATÓRIO COMPLETO do proprietário ===
          // Roda SEMPRE que existir o código da pessoa (mesmo se a estratégia 1 já achou nome/fone),
          // para trazer todos os campos (CPF, RG, endereço, nascimento, profissão, estado civil...).
          {
            let pessoaCode = ''
            const lpEl = imovelHtml.match(/<[^>]*loadPessoas[^>]*>/i)
            if (lpEl) { const dc = lpEl[0].match(/data-codigos=["']?(\d+)["']?/); if (dc) pessoaCode = dc[1] }
            if (!pessoaCode) {
              const dcM = imovelHtml.match(/data-codigos=["'](\d+)["']/)
              if (dcM) pessoaCode = dcM[1]
            }
            dbg.pessoaCode = pessoaCode

            if (pessoaCode) {
              for (const tipo of ['PessoaF', 'PessoaJ']) {
                // /Detalhes é a fonte do NOME/TELEFONE (caminho comprovado). NUNCA deixar de usá-la.
                const pessoaR = await fetch(`${WEB}/${tipo}/Detalhes/${pessoaCode}`, {
                  headers: { cookie: cookies, 'user-agent': UA, accept: 'text/html' },
                  redirect: 'follow', signal: AbortSignal.timeout(12000),
                })
                dbg[`${tipo}Status`] = pessoaR.status
                const pessoaHtml = pessoaR.ok ? await pessoaR.text() : ''
                let dados = extrairCampos(pessoaHtml)
                // a página de EDIÇÃO costuma trazer endereço/CPF/etc. — usada SÓ para enriquecer 'dados'
                try {
                  const edR = await fetch(`${WEB}/${tipo}/Editar/${pessoaCode}`, {
                    headers: { cookie: cookies, 'user-agent': UA, accept: 'text/html' },
                    redirect: 'follow', signal: AbortSignal.timeout(12000),
                  })
                  dbg[`${tipo}EditarStatus`] = edR.status
                  if (edR.ok) {
                    const eh = await edR.text()
                    const ec = extrairCampos(eh)
                    if (ec.length > dados.length) dados = ec
                    if (isDebug) dbg[`${tipo}Inputs`] = (eh.match(/<input\b[^>]*>/gi) || []).slice(0, 25).map((t) => t.replace(/\s+/g, ' ').slice(0, 140)).join('\n')
                  }
                } catch {}
                if (isDebug) {
                  const _i = pessoaHtml.search(/endere|\bcep\b|cpf/i); dbg[`${tipo}Ctx`] = _i >= 0 ? pessoaHtml.slice(Math.max(0, _i - 220), _i + 420).replace(/\s+/g, ' ') : 'sem endereço/cpf no html'
                  // os painéis (endereços/contatos) carregam por AJAX — capturar as URLs p/ buscá-las depois
                  dbg[`${tipo}DataUrls`] = [...new Set([...pessoaHtml.matchAll(/data-url\s*=\s*["']([^"']+)["']/gi)].map((x) => x[1]))].slice(0, 25)
                  dbg[`${tipo}Refs`] = [...new Set([...pessoaHtml.matchAll(/["'](\/[^"'\s<>]*(?:[Ee]ndereco|[Cc]ontato|[Tt]elefone|[Ll]istar|[Rr]etornar)[^"'\s<>]*)["']/g)].map((x) => x[1]))].slice(0, 40)
                  const _j = pessoaHtml.search(/painelEnderecos|id=["'][^"']*[Ee]ndereco/)
                  dbg[`${tipo}EndBloco`] = _j >= 0 ? pessoaHtml.slice(_j, _j + 800).replace(/\s+/g, ' ') : 'bloco de endereço não localizado'
                }
                const nomeM = pessoaHtml.match(/<title>[^|<]+\|\s*([^<]+)<\/title>/)
                const nome  = nomeM ? nomeM[1].trim() : ''
                const waM = pessoaHtml.match(/api\.whatsapp\.com\/send\?phone=55(\d{10,11})/)
                let fone = ''
                if (waM) {
                  const d = waM[1]
                  fone = d.length === 11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
                } else {
                  const foneM = pessoaHtml.match(/\((\d{2})\)\s*(\d{4,5}[-.\s]?\d{4})/)
                  if (foneM) fone = `(${foneM[1]}) ${foneM[2].replace(/[-.\s]/g,'').replace(/(\d{4,5})(\d{4})$/,'$1-$2')}`
                }
                const emailM = pessoaHtml.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/)
                const email  = emailM ? emailM[0] : ''

                if (nome || fone || dados.length) {
                  owner.nome = owner.nome || nome.slice(0, 120)
                  owner.email = owner.email || email.slice(0, 160)
                  owner.fone = owner.fone || fone.slice(0, 40)
                  if (dados.length) owner.dados = dados
                  // completa lacunas (nome/email/fone) a partir do relatório, se ainda faltar
                  const acha = (re) => (dados.find((x) => re.test(x.rotulo)) || {}).valor || ''
                  if (!owner.nome) owner.nome = (acha(/^Nome$/) || acha(/Razão social/)).slice(0, 120)
                  if (!owner.email) owner.email = acha(/E-mail/).slice(0, 160)
                  if (!owner.fone) owner.fone = (acha(/Celular/) || acha(/WhatsApp/) || acha(/Telefone/)).slice(0, 40)
                  if (isDebug) { dbg.tipoUsado = tipo; dbg.ownerStrategy = (dbg.ownerStrategy ? dbg.ownerStrategy + '+' : '') + `pessoa-${tipo}`; dbg.nCampos = dados.length }
                  break
                }
                if (isDebug) dbg[`${tipo}Snippet`] = pessoaHtml.slice(0, 400)
              }
            }
          }

          if (enderecoImovel) owner.enderecoImovel = enderecoImovel
          if (enderecoCampos.length) owner.enderecoCampos = enderecoCampos
          if (owner.nome || owner.fone || (owner.dados && owner.dados.length) || enderecoImovel) {
            await env.ENGAGEMENT.put('imovel:'+cod, JSON.stringify({...(saved||{}), owner, atualizadoEm:Date.now()}))
            await registrarProprietario(env, cod, owner) // auto-cadastra no sistema (Leads)
            return json({ ok:true, owner, source:'imoview-web', ...(isDebug?{dbg}:{}) })
          }
          if (isDebug) return json({ ok:false, source:'parse-falhou', dbg })
        } else {
          if (isDebug) return json({ ok:false, source:'login-falhou', dbg })
        }
      } catch(e) {
        if (isDebug) return json({ ok:false, source:'erro', dbg, erro:String(e) })
      }
    }

    // Se force=true e scraping não encontrou nada, limpa o owner desatualizado do KV
    if (force && saved && saved.owner) {
      await env.ENGAGEMENT.put('imovel:'+cod, JSON.stringify({...(saved||{}), owner:null, atualizadoEm:Date.now()}))
    }

    // Alerta por email quando todas as estratégias de busca falham
    const resendKey = String(env.RESEND_KEY || '').trim()
    if (resendKey && !isDebug) {
      const adminEmail = String(env.ADMIN_EMAIL || 'viniciusgraton1985@gmail.com').trim()
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + resendKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: 'Vinícius Graton <laudo@viniciusgraton.com.br>',
            to: [adminEmail],
            subject: `⚠️ Proprietário não encontrado — imóvel ${cod}`,
            html: `<p>A busca automática de proprietário para o imóvel <b>${cod}</b> não retornou dados no Imoview.</p><p>Verifique o login/sessão do Imoview ou consulte o proprietário manualmente no painel.</p>`
          })
        })
      } catch {}
    }

    return json({ ok: true, owner: { nome: '', email: '', fone: '' }, source: 'none' })
  }

  // Salva apenas o proprietário preservando campos existentes do imóvel
  if (action === 'owner-save') {
    const cod = String(b.codigo || '').replace(/[^\w]/g, '').slice(0, 12)
    if (!cod) return json({ error: 'codigo' }, 400)
    const o = b.owner && typeof b.owner === 'object' ? b.owner : {}
    const owner = {
      nome: String(o.nome || '').slice(0, 120),
      email: String(o.email || '').slice(0, 160),
      fone: String(o.fone || '').replace(/[^\d+\s().-]/g, '').slice(0, 40),
    }
    const existing = await env.ENGAGEMENT.get('imovel:' + cod, 'json') || {}
    // preserva o relatório completo (dados) e o endereço do imóvel já captados ao salvar edição manual
    if (existing.owner && Array.isArray(existing.owner.dados)) owner.dados = existing.owner.dados
    if (existing.owner && existing.owner.enderecoImovel) owner.enderecoImovel = existing.owner.enderecoImovel
    if (existing.owner && Array.isArray(existing.owner.enderecoCampos)) owner.enderecoCampos = existing.owner.enderecoCampos
    await env.ENGAGEMENT.put('imovel:' + cod, JSON.stringify({ ...existing, owner, atualizadoEm: Date.now() }))
    if (owner.nome || owner.fone) await registrarProprietario(env, cod, owner) // auto-cadastra no sistema
    return json({ ok: true, owner })
  }

  // Cria um laudo técnico temporário (vinculado ao cliente CRM)
  if (action === 'laudo-criar') {
    const lim = (s, n) => String(s == null ? '' : s).slice(0, n)
    const arrN = (a, max) => (Array.isArray(a) ? a.slice(0, max) : [])
    const ttlDias = [30, 60, 90].includes(Number(b.ttlDias)) ? Number(b.ttlDias) : 30
    const ttlSec = ttlDias * 24 * 3600
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    const payload = {
      id,
      criadoEm: Date.now(),
      expiraEm: Date.now() + ttlSec * 1000,
      ttlDias,
      clienteId: lim(b.clienteId, 40),
      clienteNome: lim(b.clienteNome, 100),
      perfil: {
        finalidade: lim(b.perfil?.finalidade, 40),
        tipos: arrN(b.perfil?.tipos, 10).map((x) => lim(x, 40)),
        bairros: arrN(b.perfil?.bairros, 20).map((x) => lim(x, 60)),
        precoMin: Number(b.perfil?.precoMin) || 0,
        precoMax: Number(b.perfil?.precoMax) || 0,
        quartosMin: Number(b.perfil?.quartosMin) || 0,
        suitesMin: Number(b.perfil?.suitesMin) || 0,
        vagasMin: Number(b.perfil?.vagasMin) || 0,
        areaMin: Number(b.perfil?.areaMin) || 0,
        nota: lim(b.perfil?.nota, 600),
      },
      mercado: {
        totalCompativel: Number(b.mercado?.totalCompativel) || 0,
        precoMin: Number(b.mercado?.precoMin) || 0,
        precoMax: Number(b.mercado?.precoMax) || 0,
        areaMin: Number(b.mercado?.areaMin) || 0,
        areaMax: Number(b.mercado?.areaMax) || 0,
        m2Mediana: Number(b.mercado?.m2Mediana) || 0,
        tipos: arrN(b.mercado?.tipos, 10).map((x) => lim(x, 40)),
        bairros: arrN(b.mercado?.bairros, 20).map((x) => lim(x, 60)),
      },
      top3: arrN(b.top3, 3).map((item) => ({
        codigo: lim(item.codigo, 20),
        tipo: lim(item.tipo, 60),
        bairro: lim(item.bairro, 80),
        preco: Number(item.preco) || 0,
        precoAnterior: Number(item.precoAnterior) || 0,
        area: Number(item.area) || 0,
        quartos: Number(item.quartos) || 0,
        suites: Number(item.suites) || 0,
        banheiros: Number(item.banheiros) || 0,
        vagas: Number(item.vagas) || 0,
        andar: Number(item.andar) || 0,
        img: lim(item.img, 400),
        fotos: arrN(item.fotos, 12).map((x) => lim(x, 400)),
        descricao: lim(item.descricao, 1000),
        aceitaFinanciamento: !!item.aceitaFinanciamento,
        aceitaFgts: !!item.aceitaFgts,
        score: Number(item.score) || 0,
        m2: Number(item.m2) || 0,
        m2Mediana: Number(item.m2Mediana) || 0,
        diffPct: Number(item.diffPct) || 0,
        abaixoMercado: !!item.abaixoMercado,
        temDesconto: !!item.temDesconto,
        pctDesconto: Number(item.pctDesconto) || 0,
        pctAbaixo: Number(item.pctAbaixo) || 0,
        melhorDeTodas: !!item.melhorDeTodas,
      })),
      obs: lim(b.obs, 1000),
    }
    await env.ENGAGEMENT.put('laudo:' + id, JSON.stringify(payload), { expirationTtl: ttlSec })
    return json({ ok: true, id })
  }

  return json({ error: 'acao desconhecida' }, 400)
  } catch (e) {
    console.error('admin.js catch:', e)
    return json({ error: 'interno', msg: 'Erro interno no servidor. Tente novamente.' }, 500)
  }
}
