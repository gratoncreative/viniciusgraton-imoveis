/**
 * Cloudflare Pages Function — ferramenta interna do corretor (área Rotina).
 * Recebe o código de um imóvel da Rotina, busca os dados públicos no site da
 * Rotina (endpoint oficial usado pela busca deles) e os pontos de interesse
 * REAIS num raio de 1km (OpenStreetMap / Overpass, grátis e sem chave).
 *
 *   GET /api/rotina-imovel?codigo=1601
 *     -> { imovel: {...}, beneficios: [10 strings] }
 *
 * NÃO retorna dados confidenciais (captador, anotações internas, proprietário).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } })
const n = (v) => { const x = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10); return isFinite(x) ? x : 0 }
const f = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null }

// amenidades booleanas -> rótulo (só as que valorizam e são públicas)
const AMEN = {
  piscina: 'Piscina', churrasqueira: 'Churrasqueira', academia: 'Academia', salaofestas: 'Salão de festas',
  salaojogos: 'Salão de jogos', playground: 'Playground', quadraesportiva: 'Quadra esportiva', sauna: 'Sauna',
  espacogourmet: 'Espaço gourmet', varandagourmet: 'Varanda gourmet', portaria24horas: 'Portaria 24h',
  seguranca24horas: 'Segurança 24h', interfone: 'Interfone', mobiliado: 'Mobiliado', arcondicionado: 'Ar-condicionado',
  closet: 'Closet', despensa: 'Despensa', areaservico: 'Área de serviço', jardim: 'Jardim', quintal: 'Quintal',
  aquecedorsolar: 'Aquecedor solar', cercaeletrica: 'Cerca elétrica', portaoeletronico: 'Portão eletrônico',
}

function montarImovel(im) {
  const operacao = /alug|locac/i.test(im.titulo || '') ? 'locação' : 'venda'
  const amenidades = []
  for (const k in AMEN) if (n(im[k]) > 0) amenidades.push(AMEN[k])
  return {
    codigo: String(im.codigo),
    tipo: im.tipo || '',
    bairro: im.bairro || '',
    cidade: im.cidade || 'Uberlândia',
    estado: im.estado || 'MG',
    operacao,
    titulo: im.titulo || '',
    valor: im.valor || '',
    valorNum: n(im.valortratado),
    condominio: n(im.valorcondominio),
    iptu: n(im.valoriptu),
    quartos: n(im.numeroquartos),
    suites: n(im.numerosuites),
    banheiros: n(im.numerobanhos),
    vagas: n(im.numerovagas),
    area: im.areaprincipal || '',
    areaNum: n(im.areaprincipaltratado) / 100 || 0,
    andar: n(im.numeroandar),
    elevador: n(im.numeroelevador) > 0,
    rua: im.endereco || '',
    situacao: im.situacao || '',
    aceitaFinanciamento: n(im.aceitafinanciamento) > 0,
    aceitaPermuta: n(im.aceitapermuta) > 0,
    descricao: (im.descricao || '').trim(),
    foto: im.urlfotoprincipal || im.urlfotoprincipalm || '',
    fotos: Array.isArray(im.fotos) ? im.fotos.map((x) => x && x.url).filter(Boolean) : [],
    // ignora o vídeo PUBLICITÁRIO genérico da Rotina (mesmo p/ todos os imóveis) — só vale vídeo real do imóvel
    video: (im.urlvideo && !/NnAmly9Gb9s/.test(im.urlvideo)) ? im.urlvideo : '',
    tour360: (() => { const f = im.fotos360; if (typeof f === 'string' && /^https?:/.test(f)) return f; if (Array.isArray(f) && f[0]) return f[0].url || f[0]; return '' })(),
    lat: f(im.latitude),
    lng: f(im.longitude),
    amenidades,
    link: im.url_amigavel ? `https://www.rotina.com.br/imovel/${im.url_amigavel}/${im.codigo}` : `https://www.rotina.com.br/venda?codigos=${im.codigo}`,
  }
}

// ---- Benefícios reais num raio de 1km (Overpass / OpenStreetMap) ----
async function beneficios1km(lat, lng) {
  const q = `[out:json][timeout:18];(` +
    `node(around:1000,${lat},${lng})[amenity~"school|kindergarten|college|university|language_school|pharmacy|hospital|clinic|doctors|bank|atm|restaurant|cafe|fast_food|fuel|marketplace|place_of_worship|cinema|theatre|library|bus_station"];` +
    `node(around:1000,${lat},${lng})[shop~"supermarket|mall|bakery|convenience|department_store|greengrocer|butcher"];` +
    `node(around:1000,${lat},${lng})[leisure~"park|garden|fitness_centre|sports_centre|playground|stadium|pitch"];` +
    `way(around:1000,${lat},${lng})[leisure~"park|garden|sports_centre|stadium"];` +
    `node(around:1000,${lat},${lng})[highway=bus_stop];` +
    `);out tags 400;`
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
  for (const url of mirrors) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'ViniciusGratonImoveis/1.0 (viniciusgraton.com.br)' },
        body: 'data=' + encodeURIComponent(q),
      })
      if (!r.ok) continue
      const j = await r.json()
      const els = (j && j.elements) || []
      if (els.length) return categorizar(els)
    } catch { /* tenta próximo mirror */ }
  }
  return []
}

// nomes em CAIXA ALTA ficam mais legíveis em Caixa de Título; mantém siglas curtas
const _titulo = (s) => String(s || '').replace(/\s+/g, ' ').trim().split(' ').map((w) => (w.length > 3 && w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ')

function categorizar(els) {
  const cats = {}
  const add = (cat, name) => {
    if (!cats[cat]) cats[cat] = { count: 0, names: [] }
    cats[cat].count++
    const nm = _titulo(name)
    if (nm && nm.length >= 3 && !/^(sem nome|unnamed)$/i.test(nm) && !cats[cat].names.includes(nm) && cats[cat].names.length < 3) cats[cat].names.push(nm)
  }
  for (const e of els) {
    const t = e.tags || {}
    const nome = t.name
    if (/^(supermarket|convenience|greengrocer|butcher)$/.test(t.shop || '') || t.amenity === 'marketplace') add('mercado', nome)
    else if (/^(department_store|mall)$/.test(t.shop || '')) add('shopping', nome)
    else if (t.shop === 'bakery') add('padaria', nome)
    else if (/^(school|kindergarten|college|university|language_school)$/.test(t.amenity || '')) add('educacao', nome)
    else if (t.amenity === 'pharmacy') add('farmacia', nome)
    else if (/^(hospital|clinic|doctors)$/.test(t.amenity || '')) add('saude', nome)
    else if (/^(restaurant|cafe|fast_food)$/.test(t.amenity || '')) add('comida', nome)
    else if (/^(bank|atm)$/.test(t.amenity || '')) add('banco', nome)
    else if (t.amenity === 'fuel') add('posto', nome)
    else if (t.amenity === 'place_of_worship') add('igreja', nome)
    else if (/^(cinema|theatre|library)$/.test(t.amenity || '')) add('cultura', nome)
    else if (t.leisure === 'fitness_centre') add('academia', nome)
    else if (/^(park|garden)$/.test(t.leisure || '')) add('praca', nome)
    else if (/^(sports_centre|stadium|pitch|playground)$/.test(t.leisure || '')) add('esporte', nome)
    else if (t.highway === 'bus_stop' || t.amenity === 'bus_station') add('onibus', null)
  }
  const C = (cat) => (cats[cat] && cats[cat].count) || 0
  const N = (cat, max = 2) => ((cats[cat] && cats[cat].names) || []).slice(0, max)
  const cit = (cat, max = 2) => { const ns = N(cat, max); return ns.length ? ` como ${ns.join(' e ')}` : '' }

  const cand = [
    C('mercado') && { t: `${C('mercado')} ${C('mercado') > 1 ? 'supermercados e mercados' : 'supermercado'} a poucos minutos${cit('mercado')}`, nomeado: N('mercado').length },
    C('shopping') && { t: `Shopping e lojas a poucos minutos${cit('shopping')}`, nomeado: N('shopping').length },
    C('educacao') && { t: `${C('educacao')} ${C('educacao') > 1 ? 'escolas, creches e cursos' : 'escola'} no entorno${cit('educacao')}`, nomeado: N('educacao').length },
    C('saude') && { t: `Saúde por perto — hospitais e clínicas a menos de 1km${cit('saude')}`, nomeado: N('saude').length },
    C('farmacia') && { t: `${C('farmacia')} ${C('farmacia') > 1 ? 'farmácias' : 'farmácia'} pertinho pra qualquer urgência${cit('farmacia')}`, nomeado: N('farmacia').length },
    C('comida') && { t: `Restaurantes e cafés na vizinhança${cit('comida')}`, nomeado: N('comida').length },
    C('padaria') && { t: `Padaria${C('padaria') > 1 ? 's' : ''} no dia a dia, a pé${cit('padaria')}`, nomeado: N('padaria').length },
    C('praca') && { t: `Praças e áreas verdes pra caminhar e relaxar${cit('praca')}`, nomeado: N('praca').length },
    C('academia') && { t: `${C('academia')} ${C('academia') > 1 ? 'academias' : 'academia'} pra treinar pertinho${cit('academia')}`, nomeado: N('academia').length },
    C('esporte') && { t: `Espaços esportivos e quadras pra família${cit('esporte')}`, nomeado: N('esporte').length },
    C('cultura') && { t: `Cultura e lazer por perto${cit('cultura')}`, nomeado: N('cultura').length },
    C('banco') && { t: `${C('banco')} agências e caixas eletrônicos a 1km${cit('banco')}`, nomeado: N('banco').length },
    C('onibus') && { t: `Transporte fácil — ${C('onibus')} pontos de ônibus num raio de 1km`, nomeado: 0 },
    C('posto') && { t: `${C('posto')} ${C('posto') > 1 ? 'postos' : 'posto'} de combustível no caminho${cit('posto')}`, nomeado: N('posto').length },
    C('igreja') && { t: `Igrejas e templos na própria vizinhança${cit('igreja')}`, nomeado: N('igreja').length },
  ].filter(Boolean)
  // prioriza os benefícios que citam NOMES REAIS
  cand.sort((a, b) => (b.nomeado ? 1 : 0) - (a.nomeado ? 1 : 0))
  return cand.map((x) => x.t).slice(0, 10)
}

const FALLBACK = (bairro) => [
  `${bairro} é um bairro consolidado e bem servido de comércio e serviços`,
  'Padarias, mercados e farmácias no dia a dia, a pé',
  'Boas escolas e creches na região',
  'Fácil acesso às principais avenidas de Uberlândia',
  'Transporte público e mobilidade descomplicada',
  'Restaurantes, lanchonetes e cafés por perto',
  'Praças e áreas de convivência próximas',
  'Região com boa valorização e liquidez',
  'Vizinhança tranquila e residencial',
  'Bancos, lotéricas e serviços essenciais a poucos minutos',
]

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const codigo = (url.searchParams.get('codigo') || '').replace(/\D/g, '')
  if (!codigo) return json({ erro: 'Informe o código do imóvel.' }, 400)

  const cacheKey = 'rotina:v3:' + codigo
  const temKV = env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function'
  if (temKV) {
    try { const cached = await env.ENGAGEMENT.get(cacheKey, 'json'); if (cached && cached.imovel) return json(cached) } catch {}
  }

  let raw
  try {
    const r = await fetch('https://www.rotina.com.br/retornar-imoveis-codigo', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Mozilla/5.0 (compatible; ViniciusGratonImoveis/1.0)' },
      body: 'codigo=' + encodeURIComponent(codigo) + '&pagina=1',
    })
    raw = await r.json()
  } catch {
    return json({ erro: 'Não consegui acessar a Rotina agora. Tente novamente em instantes.' }, 502)
  }
  if (!raw || !raw.lista || !raw.lista.length) {
    return json({ erro: `Nenhum imóvel encontrado para o código ${codigo}. Confira o código na Rotina.` }, 404)
  }

  const imovel = montarImovel(raw.lista[0])
  let beneficios = []
  if (imovel.lat && imovel.lng) beneficios = await beneficios1km(imovel.lat, imovel.lng)
  if (beneficios.length < 10) {
    const fb = FALLBACK(imovel.bairro || 'O bairro')
    for (const b of fb) { if (beneficios.length >= 10) break; if (!beneficios.includes(b)) beneficios.push(b) }
  }

  const out = { imovel, beneficios }
  if (temKV) { try { await env.ENGAGEMENT.put(cacheKey, JSON.stringify(out), { expirationTtl: 86400 }) } catch {} }
  return json(out)
}
