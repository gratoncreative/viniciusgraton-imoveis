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
    descricao: (im.descricao || '').trim(),
    foto: im.urlfotoprincipal || im.urlfotoprincipalm || '',
    video: im.urlvideo || '',
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

function categorizar(els) {
  const c = {}
  const nomes = {}
  const add = (cat, name) => { c[cat] = (c[cat] || 0) + 1; if (name && !nomes[cat]) nomes[cat] = name }
  for (const e of els) {
    const t = e.tags || {}
    const nome = t.name
    if (/^(supermarket|convenience|greengrocer|butcher)$/.test(t.shop || '') || t.amenity === 'marketplace') add('mercado', nome)
    else if (/^(department_store|mall)$/.test(t.shop || '')) add('shopping', nome)
    else if (t.shop === 'bakery') add('comida', nome)
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
  const nm = (cat) => nomes[cat] ? ` (ex.: ${nomes[cat]})` : ''
  const cand = [
    c.mercado && `${c.mercado} ${c.mercado > 1 ? 'supermercados e mercados' : 'supermercado'} a poucos minutos${nm('mercado')}`,
    c.educacao && `${c.educacao} ${c.educacao > 1 ? 'escolas, creches e cursos' : 'escola'} no entorno${nm('educacao')}`,
    c.farmacia && `${c.farmacia} ${c.farmacia > 1 ? 'farmácias' : 'farmácia'} pertinho pra qualquer urgência`,
    c.saude && `Saúde por perto${nm('saude')} — hospitais e clínicas a menos de 1km`,
    c.comida && `${c.comida} opções de restaurantes, cafés e padarias na vizinhança${nm('comida')}`,
    c.praca && `Praças e áreas verdes pra caminhar e relaxar${nm('praca')}`,
    c.academia && `${c.academia} ${c.academia > 1 ? 'academias' : 'academia'} pra treinar sem pegar trânsito`,
    c.banco && `${c.banco} agências e caixas eletrônicos a 1km`,
    c.onibus && `Transporte fácil — ${c.onibus} pontos de ônibus num raio de 1km`,
    c.shopping && `Shopping e lojas de departamento a poucos minutos${nm('shopping')}`,
    c.esporte && `Espaços esportivos e quadras pra família${nm('esporte')}`,
    c.posto && `${c.posto} ${c.posto > 1 ? 'postos' : 'posto'} de combustível no caminho`,
    c.cultura && `Cultura e lazer por perto${nm('cultura')} — cinema, teatro ou biblioteca`,
    c.igreja && `Igrejas e templos na própria vizinhança`,
  ].filter(Boolean)
  return cand.slice(0, 10)
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

  const cacheKey = 'rotina:' + codigo
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
