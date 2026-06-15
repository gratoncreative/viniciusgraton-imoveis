/**
 * Cloudflare Pages Function — analisa um imóvel a partir de uma URL pública.
 * Faz o fetch server-side (sem CORS), extrai os dados e usa env.AI para
 * análise qualitativa da descrição.
 *
 *   POST /api/analisar-url  { url: string }
 *     -> { ok: true, dados: {...}, analise: {...} }
 *     -> { ok: false, erro: string }
 */

const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

// ── Segurança: bloqueia SSRF ─────────────────────────────────────────────────
function urlSafe(raw) {
  let u
  try { u = new URL(raw) } catch { return null }
  if (!['http:', 'https:'].includes(u.protocol)) return null
  const h = u.hostname.toLowerCase()
  if (/^(localhost|::1|0\.0\.0\.0)$/.test(h)) return null
  if (/^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|127\.\d+\.\d+\.\d+|169\.254\.\d+\.\d+)$/.test(h)) return null
  if (/^\[.*\]$/.test(h)) return null // IPv6 literals (fc00::, fe80::, ::1, etc.)
  return u.href
}

function nomeSite(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    if (h.includes('zapimoveis')) return 'ZAP Imóveis'
    if (h.includes('vivareal')) return 'Viva Real'
    if (h.includes('olx.com.br')) return 'OLX'
    if (h.includes('imovelweb')) return 'Imóvel Web'
    if (h.includes('chavesnamao')) return 'Chaves na Mão'
    if (h.includes('rotina.com.br')) return 'Rotina Imobiliária'
    return h.split('.').slice(-2, -1)[0] || h
  } catch { return 'desconhecido' }
}

function num(s) {
  if (s == null) return 0
  const n = Number(String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return isFinite(n) && n > 0 ? n : 0
}

// ── Extração: __NEXT_DATA__ (ZAP / Viva Real, Next.js) ─────────────────────
function extrairNextData(html) {
  const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

const TIPO_MAP = {
  APARTMENT: 'Apartamento', RESIDENTIAL: 'Apartamento', PENTHOUSE: 'Apartamento',
  FLAT: 'Apartamento', KITNET: 'Kitnet/Studio',
  HOME: 'Casa', HOUSE: 'Casa', CONDOMINIUM: 'Casa em Condomínio', TWO_STORY_HOUSE: 'Casa',
  ALLOTMENT_LAND: 'Terreno', LAND: 'Terreno', LOT: 'Terreno',
  COMMERCIAL: 'Comercial', OFFICE: 'Sala Comercial', STORE: 'Loja Comercial',
}

function extrairDeNextData(nd) {
  if (!nd) return null
  try {
    const props = nd?.props?.pageProps
    const listing =
      props?.listing?.listing ||
      props?.listing ||
      props?.property?.listing ||
      props?.property ||
      nd?.props?.initialState?.listing?.data?.listing
    if (!listing) return null

    const addr  = listing.address || {}
    const rooms = listing.quantitiesRooms || {}
    const prix  = (listing.pricingInfos || [])
    const preco = num(prix.find(p => p.businessType === 'SALE')?.price || prix[0]?.price || listing.price)
    const areas = listing.usableAreas || listing.totalAreas || []
    const area  = num(areas[0] || listing.area)
    const tipo  = TIPO_MAP[listing.unitTypes?.[0]] || TIPO_MAP[listing.unitSubTypes?.[0]] || listing.unitTypes?.[0] || 'Apartamento'

    return {
      titulo:     listing.title || listing.description?.slice(0, 100),
      preco,
      area,
      tipo,
      bairro:     addr.neighborhood || addr.district || '',
      cidade:     addr.city || '',
      estado:     addr.stateAcronym || '',
      quartos:    num(rooms.bedrooms || listing.bedrooms) || 0,
      banheiros:  num(rooms.bathrooms || listing.bathrooms) || 0,
      vagas:      num(rooms.parkingSpaces || listing.parkingSpaces) || 0,
      suites:     num(rooms.suites || listing.suites) || 0,
      descricao:  listing.description || '',
      amenidades: (listing.amenities || listing.facilities || [])
        .map(a => typeof a === 'string' ? a : a.label || a.name || '').filter(Boolean),
      fotos: (listing.medias || listing.images || [])
        .filter(m => (m.type === 'IMAGE' || m.mediaType === 'IMAGE') && (m.absoluteLink || m.url))
        .slice(0, 6).map(m => m.absoluteLink || m.url),
    }
  } catch { return null }
}

// ── Extração: JSON-LD ────────────────────────────────────────────────────────
function extrairJsonLd(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const lds = []
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1])
      const arr = Array.isArray(o) ? o : [o]
      for (const item of arr) {
        if (/RealEstate|Property|Listing|Apartment|House|Product|Offer/i.test(String(item['@type'] || '')))
          lds.push(item)
      }
    } catch {}
  }
  return lds
}

function extrairDeJsonLd(lds) {
  for (const ld of lds) {
    const preco = num(ld.offers?.price || ld.price)
    const area  = num(ld.floorSize?.value || ld.floorArea?.value || ld.area)
    if (preco > 0 || area > 0) {
      const addr = ld.address || {}
      return {
        titulo:    ld.name || ld.title || '',
        preco,
        area,
        tipo:      TIPO_MAP[ld['@type']] || ld['@type'] || 'Imóvel',
        bairro:    addr.addressLocality || addr.neighborhood || '',
        cidade:    addr.addressRegion || addr.addressLocality || '',
        quartos:   num(ld.numberOfRooms || ld.numberOfBedrooms) || 0,
        banheiros: num(ld.numberOfBathroomsTotal) || 0,
        vagas:     0,
        descricao: ld.description || '',
        amenidades: [],
        fotos: ld.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [],
      }
    }
  }
  return null
}

// ── Extração: meta tags OG ───────────────────────────────────────────────────
function extrairMeta(html) {
  const g = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
    return m ? m[1] : null
  }
  return {
    titulo:    g('og:title') || g('twitter:title'),
    descricao: g('og:description') || g('twitter:description'),
    imagem:    g('og:image'),
    preco:     num(g('og:price:amount') || g('product:price:amount') || g('price')),
  }
}

// ── Extração: IA (fallback) ──────────────────────────────────────────────────
async function extrairComIA(html, env) {
  if (!env?.AI) return null
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  try {
    const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Você extrai dados de anúncios imobiliários. Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON.' },
        { role: 'user', content: `Extraia os dados do imóvel e retorne JSON com: titulo, preco (número em reais), area (m², número), tipo (Apartamento/Casa/Terreno/etc), bairro, cidade, quartos (número), banheiros (número), vagas (garagem, número), descricao (texto do anúncio, máx 500 chars).\n\nTexto:\n${texto}` },
      ],
      max_tokens: 500,
    })
    const txt   = r?.response || (typeof r === 'string' ? r : '')
    const match = txt.match(/\{[\s\S]*\}/)
    if (!match) return null
    const obj = JSON.parse(match[0])
    if (!obj || (!(obj.preco > 0) && !(obj.area > 0))) return null
    return { amenidades: [], fotos: [], ...obj }
  } catch { return null }
}

// ── Análise qualitativa: IA ──────────────────────────────────────────────────
async function analisarComIA(dados, env) {
  if (!env?.AI) return null
  const descTxt = dados.descricao ? `Descrição: ${dados.descricao.slice(0, 600)}` : ''
  const amenTxt = dados.amenidades?.length ? `Amenidades declaradas: ${dados.amenidades.slice(0, 16).join(', ')}` : ''
  if (!descTxt && !amenTxt) return null

  try {
    const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'Você é um avaliador imobiliário experiente e objetivo. Responda SOMENTE com JSON válido, sem markdown.' },
        { role: 'user', content: `Analise o imóvel abaixo e retorne JSON com:
- condicao: "novo" | "reformado" | "bom" | "a_reformar"
- pontos_positivos: array de strings (máx 4, frases curtas sobre o que agrega valor)
- pontos_atencao: array de strings (máx 3, alertas que o comprador deve verificar; pode ser vazio [])
- premium: boolean (tem características de alto padrão?)
- resumo: string (1 frase objetiva sobre o imóvel como negócio)

Imóvel: ${dados.tipo || 'Imóvel'} de ${dados.area || '?'}m² em ${dados.bairro || 'bairro não informado'}${dados.cidade ? ', ' + dados.cidade : ''}, preço R$ ${dados.preco ? dados.preco.toLocaleString('pt-BR') : '?'}
${dados.quartos ? `Quartos: ${dados.quartos}` : ''} ${dados.vagas ? `· Vagas: ${dados.vagas}` : ''}
${descTxt}
${amenTxt}` },
      ],
      max_tokens: 450,
    })
    const txt   = r?.response || (typeof r === 'string' ? r : '')
    const match = txt.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch { return null }
}

// ── Rotina: busca dados diretamente na API da Rotina Imobiliária ─────────────
const AMEN_ROTINA = {
  piscina: 'Piscina', churrasqueira: 'Churrasqueira', academia: 'Academia',
  salaofestas: 'Salão de festas', playground: 'Playground', quadraesportiva: 'Quadra esportiva',
  sauna: 'Sauna', espacogourmet: 'Espaço gourmet', varandagourmet: 'Varanda gourmet',
  portaria24horas: 'Portaria 24h', seguranca24horas: 'Segurança 24h',
  mobiliado: 'Mobiliado', arcondicionado: 'Ar-condicionado',
  closet: 'Closet', areaservico: 'Área de serviço', jardim: 'Jardim',
  quintal: 'Quintal', aquecedorsolar: 'Aquecedor solar', portaoeletronico: 'Portão eletrônico',
}

function intParse(v) { const x = parseInt(String(v ?? '').replace(/\D/g, ''), 10); return isFinite(x) ? x : 0 }

async function buscarRotina(codigo) {
  const r = await fetch('https://www.rotina.com.br/retornar-imoveis-codigo', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Mozilla/5.0 (compatible; ViniciusGratonImoveis/1.0)' },
    body: 'codigo=' + encodeURIComponent(codigo) + '&pagina=1',
    signal: AbortSignal.timeout(7000),
  })
  if (!r.ok) return null
  const list = await r.json()
  const im = Array.isArray(list) ? list[0] : (list?.dados?.[0] || null)
  if (!im || !im.codigo) return null

  const amenidades = []
  for (const k in AMEN_ROTINA) if (intParse(im[k]) > 0) amenidades.push(AMEN_ROTINA[k])

  return {
    codigo:    String(im.codigo),
    titulo:    im.titulo || `${im.tipo} no ${im.bairro}`,
    preco:     intParse(im.valortratado),
    area:      intParse(im.areaprincipaltratado) / 100 || 0,
    tipo:      im.tipo || 'Apartamento',
    bairro:    im.bairro || '',
    cidade:    im.cidade || 'Uberlândia',
    quartos:   intParse(im.numeroquartos),
    banheiros: intParse(im.numerobanhos),
    vagas:     intParse(im.numerovagas),
    suites:    intParse(im.numerosuites),
    descricao: (im.descricao || '').trim(),
    amenidades,
    fotos: [im.urlfotoprincipal, ...(Array.isArray(im.fotos) ? im.fotos.map(f => f?.url) : [])].filter(Boolean).slice(0, 6),
    fonte: 'Rotina Imobiliária',
  }
}

// ── Handler principal ────────────────────────────────────────────────────────
export async function onRequestPost({ env, request }) {
  try {
    const body   = await request.json().catch(() => ({}))
    const rawUrl = String(body?.url || '').trim()
    if (!rawUrl) return json({ ok: false, erro: 'Informe a URL do anúncio.' }, 400)

    const safeUrl = urlSafe(rawUrl)
    if (!safeUrl) return json({ ok: false, erro: 'URL inválida. Informe um link de anúncio imobiliário (https://…).' }, 400)

    let dados = null

    // Rotina Imobiliária — usa a própria API
    const rotinaM = safeUrl.match(/rotina\.com\.br\/imovel\/[^/?#]+\/(\d+)/)
      || safeUrl.match(/rotina\.com\.br\/[^?#]*[?&]codigos=(\d+)/)
      || safeUrl.match(/rotina\.com\.br\/[^?#]*[?&]codigo=(\d+)/)
    if (rotinaM) {
      try { dados = await buscarRotina(rotinaM[1]) } catch {}
    }

    // HTML scraping (ZAP, Viva Real, OLX, outros)
    if (!dados) {
      let html
      try {
        const res = await fetch(safeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
          signal: AbortSignal.timeout(9000),
        })
        if (!res.ok) return json({ ok: false, erro: `A página devolveu erro ${res.status}. Verifique se o link está correto.` }, 422)
        html = await res.text()
        if (html.length > 900000) html = html.slice(0, 900000)
      } catch (e) {
        const msg = String(e.message || '').toLowerCase()
        if (msg.includes('timeout') || msg.includes('timed out')) return json({ ok: false, erro: 'A página demorou muito para responder. Tente novamente.' }, 422)
        return json({ ok: false, erro: `Não foi possível acessar a URL.` }, 422)
      }

      // Strategy 1: __NEXT_DATA__ (ZAP, Viva Real)
      dados = extrairDeNextData(extrairNextData(html))

      // Strategy 2: JSON-LD
      if (!dados || !(dados.area > 0)) {
        const ldDados = extrairDeJsonLd(extrairJsonLd(html))
        dados = (!dados || !(dados.area > 0)) ? ldDados : dados
      }

      // Strategy 3: AI fallback
      if (!dados || (!(dados.preco > 0) && !(dados.area > 0))) {
        const aiDados = await extrairComIA(html, env)
        dados = aiDados || dados
      }

      // Complementa com meta tags se faltou imagem ou titulo
      if (dados) {
        const meta = extrairMeta(html)
        if (!dados.fotos?.length && meta.imagem) dados.fotos = [meta.imagem]
        if (!dados.titulo && meta.titulo) dados.titulo = meta.titulo
      }
    }

    if (!dados || !(dados.area > 0)) {
      return json({ ok: false, erro: 'Não consegui extrair os dados do imóvel. Tente com o link direto do anúncio (ex: zapimoveis.com.br/…, vivareal.com.br/…, rotina.com.br/…).' }, 422)
    }

    // Normaliza tipo
    if (TIPO_MAP[dados.tipo]) dados.tipo = TIPO_MAP[dados.tipo]
    dados.fonte     = dados.fonte || nomeSite(safeUrl)
    dados.urlOriginal = safeUrl

    // Análise qualitativa com IA
    const analise = await analisarComIA(dados, env).catch(() => null)

    return json({ ok: true, dados, analise })
  } catch (e) {
    console.error('analisar-url:', e)
    return json({ ok: false, erro: 'Erro interno ao processar a URL.' }, 500)
  }
}
