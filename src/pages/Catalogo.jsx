import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Fuse from 'fuse.js'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import FiltroSelect from '../components/FiltroSelect'
import FiltroPills from '../components/FiltroPills'
import InputMoeda from '../components/InputMoeda'
import VistosRecentemente from '../components/VistosRecentemente'
import AdminImovelEditor from '../components/AdminImovelEditor'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_IMOVEL, BAIRROS_SEO, linkWhatsApp, WA, aplicarOverrideEmUm } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconClose } from '../components/icons'

// Chips de tipo com ícone (referência Chaves na Mão) — cada um agrupa vários tipos
const TIPO_CHIPS = [
  { grupo: 'apartamento', label: 'Apartamento', re: /apart/i, d: 'M4 3h7v18H4zM13 8h7v13h-7zM7 6h.5M7 9h.5M7 12h.5M16 11h.5M16 14h.5M16 17h.5' },
  { grupo: 'casa', label: 'Casas & Sobrados', re: /casa|sobrado/i, d: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' },
  { grupo: 'kit', label: 'Kitnets & Stúdios', re: /kit|studio|stúdio|loft|flat/i, d: 'M5 3h14v18H5zM9 7h.5M13 7h.5M9 11h.5M13 11h.5M9 15h6v6H9z' },
  { grupo: 'comercial', label: 'Comercial', re: /comerc|sala|loja|ponto|gal/i, d: 'M4 9h16l-1-5H5L4 9zM5 9v11h14V9M9 20v-6h6v6' },
  { grupo: 'terreno', label: 'Terrenos & Lotes', re: /terreno|lote|área|chácara|sítio|fazenda/i, d: 'M3 20h18M5 20l3-9 4 5 3-7 4 11' },
]

// ícones dos filtros (um antes de cada campo)
const FICN = {
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
  tipo: 'M3 21h18M5 21V7l7-4 7 4v14M9 13h.01M9 17h.01M15 13h.01M15 17h.01',
  bairro: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  preco: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  quartos: 'M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 18h18M3 18v3M21 18v3M6 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3M13 11V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3',
  suites: 'M12 3l2.2 5.5L20 9l-4.5 4 1.3 6L12 16l-4.8 3 1.3-6L4 9l5.8-.5z',
  vagas: 'M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13m-14 0h14m-14 0v4m14-4v4M7 17h.01M17 17h.01',
  area: 'M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3',
  carac: 'M4 6h16M4 12h16M4 18h10M19 16l2 2 3-3',
  ordem: 'M3 6h13M3 12h9M3 18h5M19 4v14m0 0l-3-3m3 3l3-3',
}
const FIco = ({ n }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={FICN[n]} /></svg>
)

const AREAS = [50, 80, 100, 150, 200, 250, 300, 400, 500, 750, 1000]
// características agrupadas (estilo Rotina: Lazer / Conforto / Segurança / Estrutura)
const CARACS = [
  { v: 'Piscina', g: 'Lazer' }, { v: 'Churrasqueira', g: 'Lazer' }, { v: 'Academia', g: 'Lazer' }, { v: 'Salão de festas', g: 'Lazer' }, { v: 'Playground', g: 'Lazer' },
  { v: 'Varanda gourmet', g: 'Conforto' }, { v: 'Sacada', g: 'Conforto' }, { v: 'Closet', g: 'Conforto' }, { v: 'Mobiliado', g: 'Conforto' }, { v: 'Lavabo', g: 'Conforto' },
  { v: 'Portaria 24h', g: 'Segurança' }, { v: 'Portão eletrônico', g: 'Segurança' }, { v: 'Interfone', g: 'Segurança' }, { v: 'Alarme', g: 'Segurança' },
  { v: 'Elevador', g: 'Estrutura' }, { v: 'Energia solar', g: 'Estrutura' }, { v: 'Área de serviço', g: 'Estrutura' }, { v: 'Jardim', g: 'Estrutura' },
]


const blobDe = (im) => {
  const c = im.caracteristicas || {}
  return [...(c.internas || []), ...(c.externas || []), ...(c.extras || []), im.descricao || ''].join(' ').toLowerCase()
}

// números de página com reticências: 1 … 4 [5] 6 … 653
function janelasPaginas(atual, total) {
  const s = new Set([1, total, atual, atual - 1, atual + 1])
  const arr = [...s].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of arr) { if (p - prev > 1) out.push('…'); out.push(p); prev = p }
  return out
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  useSEO({
    title: 'Imóveis à venda em Uberlândia',
    description: 'Casas, apartamentos e imóveis de alto padrão à venda em Uberlândia. Filtre por bairro, preço, quartos, suítes e características e fale com o Vinícius.',
    path: '/imoveis',
  })

  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'catalogo-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          url: 'https://viniciusgraton.com.br/imoveis',
          name: 'Imóveis à venda em Uberlândia',
          description: 'Casas, apartamentos e imóveis de alto padrão à venda em Uberlândia-MG. Filtre por bairro, preço e características.',
          publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', url: 'https://viniciusgraton.com.br' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
            { '@type': 'ListItem', position: 2, name: 'Imóveis à venda', item: 'https://viniciusgraton.com.br/imoveis' },
          ],
        },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('catalogo-jsonld')?.remove() }
  }, [])

  // Espelho de TODOS os imóveis à venda da Rotina — feed leve carregado em runtime (não vai no bundle).
  const [feed, setFeed] = useState([])
  const [carregandoFeed, setCarregandoFeed] = useState(true)
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregandoFeed(false) })
    return () => { vivo = false }
  }, [])

  // Overrides do painel (edições do admin / ocultar) — aplicados em TODA a listagem, não só
  // nos curados. Assim, quando o admin edita um imóvel a partir da grade, a mudança vale no
  // catálogo inteiro (qualquer imóvel da Rotina), igual à página de detalhe.
  const [ovMap, setOvMap] = useState(null)
  useEffect(() => {
    let vivo = true
    fetch('/api/imoveis-pub').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d) setOvMap(d.ov ? d.ov : d) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  // une o feed com os imóveis curados do bundle (estes têm prioridade, com galeria/descrição completas)
  const TODOS = useMemo(() => {
    const mapa = new Map()
    for (const im of feed) mapa.set(String(im.codigo), im)
    // curados têm prioridade (galeria/descrição completas), mas herdam visto/novo do feed
    for (const im of IMOVEIS) {
      const cod = String(im.codigo)
      const base = mapa.get(cod)
      mapa.set(cod, base ? { ...base, ...im } : im)
    }
    let arr = [...mapa.values()]
    if (ovMap && typeof ovMap === 'object') {
      arr = arr
        .filter((im) => !(ovMap[String(im.codigo)] && ovMap[String(im.codigo)].oculto)) // ocultados somem
        .map((im) => { const o = ovMap[String(im.codigo)]; return o ? aplicarOverrideEmUm(im, o) : im })
    }
    return arr
  }, [feed, ovMap])
  const BAIRROS_TODOS = useMemo(() => [...new Set(TODOS.map((i) => (i.bairro || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [TODOS])

  // —— DESTAQUE no topo do catálogo (curadoria do admin; até 3) ——
  const ADMIN_LSK = 'vg_admin_token'
  const [isAdmin, setIsAdmin] = useState(false)
  const [destaqueCods, setDestaqueCods] = useState([])
  const [destaqueMsg, setDestaqueMsg] = useState('')
  const [destaqueOk, setDestaqueOk] = useState(false)
  const [editando, setEditando] = useState(null) // imóvel sendo editado pelo admin (a partir da grade)
  const catMainRef = useRef(null)
  useEffect(() => {
    const check = () => setIsAdmin(!!localStorage.getItem(ADMIN_LSK))
    check()
    window.addEventListener('storage', check)
    let vivo = true
    fetch('/api/destaque').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.codigos)) setDestaqueCods(d.codigos.map(String)) })
      .catch(() => {})
    return () => { vivo = false; window.removeEventListener('storage', check) }
  }, [])
  const salvarDestaque = async (novos) => {
    const token = localStorage.getItem(ADMIN_LSK)
    if (!token) return
    const anterior = destaqueCods
    setDestaqueCods(novos) // otimista
    try {
      const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'catalogo-destaque', token, codigos: novos }) })
      let j = null
      try { j = await r.json() } catch {}
      if (!r.ok || !j || !j.ok) {
        const motivo = r.status === 401 ? 'Sua sessão de admin expirou. Abra /admin, faça login de novo e volte aqui.'
          : r.status === 403 ? 'Bloqueado por permissão/origem.'
          : (j && (j.msg || j.error)) ? (j.msg || j.error)
          : `Falha ao salvar (HTTP ${r.status}).`
        throw new Error(motivo)
      }
      setDestaqueCods((j.codigos || []).map(String))
      setDestaqueMsg('') // limpa qualquer erro anterior
      setDestaqueOk(true); setTimeout(() => setDestaqueOk(false), 2500)
    } catch (e) {
      setDestaqueCods(anterior) // reverte
      setDestaqueMsg('⚠ ' + (e && e.message ? e.message : 'Não consegui salvar.')) // fica fixo até a próxima ação
    }
  }
  // o token é "<exp>.<assinatura>"; checa se ainda é válido (não venceu) antes de tentar
  const tokenValido = () => {
    const t = localStorage.getItem(ADMIN_LSK)
    if (!t || t.indexOf('.') < 0) return false
    const exp = Number(t.split('.')[0])
    return !!exp && Date.now() < exp
  }
  const toggleDestaque = (cod) => {
    setDestaqueMsg('')
    if (!tokenValido()) {
      setDestaqueMsg('⚠ Sua sessão de admin expirou (o login dura 12h). Abra /admin, faça login de novo e recarregue esta página para destacar.')
      return
    }
    const c = String(cod)
    const adicionando = !destaqueCods.includes(c)
    const novos = adicionando ? [...destaqueCods, c].slice(-3) : destaqueCods.filter((x) => x !== c)
    salvarDestaque(novos)
    // feedback VISÍVEL: sobe ao topo p/ o admin ver o imóvel entrar em destaque.
    // setTimeout (não rAF) p/ rodar DEPOIS do React inserir o card no topo —
    // senão a "ancoragem de rolagem" do navegador desfaz o scroll.
    if (adicionando) setTimeout(() => {
      if (catMainRef.current) catMainRef.current.scrollTop = 0
      try { window.scrollTo(0, 0) } catch {}
    }, 70)
  }
  const destaqueImoveis = useMemo(
    () => destaqueCods.map((c) => TODOS.find((i) => String(i.codigo) === c)).filter(Boolean),
    [destaqueCods, TODOS]
  )

  const LOTE = 12
  const [mostrar, setMostrar] = useState(LOTE)
  const sentinelaRef = useRef(null)
  useEffect(() => { setMostrar(LOTE) }, [params.toString()])

  const f = {
    q: params.get('q') || '',
    tipo: params.get('tipo') || '',
    bairros: (params.get('bairros') || params.get('bairro') || '').split(',').map((s) => s.trim()).filter(Boolean),
    precoMin: parseInt(params.get('precoMin') || '0', 10) || 0,
    precoMax: parseInt(params.get('precoMax') || '0', 10) || 0,
    quartos: parseInt(params.get('quartos') || '0', 10),
    suites: parseInt(params.get('suites') || '0', 10),
    vagas: parseInt(params.get('vagas') || '0', 10),
    area: parseInt(params.get('area') || '0', 10),
    carac: (params.get('carac') || '').split(',').map((s) => s.trim()).filter(Boolean),
    grupo: params.get('grupo') || '',
    ordem: params.get('ordem') || 'recentes',
  }

  // clica num chip de tipo → liga/desliga o grupo (e limpa o tipo exato pra não conflitar)
  const toggleGrupo = (g) => {
    const p = new URLSearchParams(params)
    p.delete('tipo')
    const selecionando = f.grupo !== g
    if (selecionando) p.set('grupo', g); else p.delete('grupo')
    setParams(p, { replace: true })
    // feedback claro: rola até a contagem/resultados (no celular eles ficam abaixo da dobra)
    if (selecionando) requestAnimationFrame(() => { setTimeout(() => document.querySelector('.cat-count')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) })
  }

  const up = (k, v) => {
    const p = new URLSearchParams(params)
    const vazio = v === '' || v == null || v === -1 || v === 0 || (k === 'ordem' && v === 'recentes')
    if (vazio) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  // seleção de MÚLTIPLOS bairros (guardada como lista separada por vírgula na URL)
  const setBairros = (arr) => {
    const p = new URLSearchParams(params)
    p.delete('bairro')
    if (arr && arr.length) p.set('bairros', arr.join(',')); else p.delete('bairros')
    setParams(p, { replace: true })
  }
  // seleção de MÚLTIPLAS características (imóvel precisa ter TODAS as marcadas)
  const setCarac = (arr) => {
    const p = new URLSearchParams(params)
    if (arr && arr.length) p.set('carac', arr.join(',')); else p.delete('carac')
    setParams(p, { replace: true })
  }

  // Fuse.js: busca fuzzy com tolerância a erros de digitação e acentuação
  const fuse = useMemo(() => new Fuse(TODOS, {
    keys: [
      { name: 'tipo', weight: 0.25 },
      { name: 'bairro', weight: 0.35 },
      { name: 'rua', weight: 0.45 },
      { name: 'codigo', weight: 0.2 },
      { name: 'cidade', weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    useExtendedSearch: false,
  }), [TODOS])

  const fuseIds = useMemo(() => {
    if (!f.q) return null
    const q = f.q.trim()
    // Busca só por dígitos → match direto no código (sem fuzzy, sem falsos positivos)
    if (/^\d+$/.test(q)) {
      const exact = TODOS.filter(im => String(im.codigo) === q)
      const matches = exact.length ? exact : TODOS.filter(im => String(im.codigo).startsWith(q))
      return new Set(matches.map(im => String(im.codigo)))
    }
    const res = fuse.search(q)
    return new Set(res.map((r) => String(r.item.codigo)))
  }, [fuse, f.q, TODOS])

  // sugestões de autocomplete da busca: ruas (o que o cliente digita) + bairros
  const sugestoesBusca = useMemo(() => {
    const ruas = new Set(), bairros = new Set()
    for (const im of TODOS) { const r = (im.rua || '').trim(); const b = (im.bairro || '').trim(); if (r) ruas.add(r); if (b) bairros.add(b) }
    // dedup final (uma rua pode ter o mesmo nome de um bairro — evita key duplicada no datalist)
    return [...new Set([
      ...[...ruas].sort((a, b) => a.localeCompare(b, 'pt-BR')).slice(0, 700),
      ...[...bairros].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ])]
  }, [TODOS])

  // Bairros mais buscados (por volume de imóveis) — faixa de chips acima dos resultados (estilo portal)
  const contBairros = useMemo(() => {
    const cont = new Map()
    for (const im of TODOS) { const b = (im.bairro || '').trim(); if (b) cont.set(b.toLowerCase(), (cont.get(b.toLowerCase()) || 0) + 1) }
    return cont
  }, [TODOS])
  const topBairros = useMemo(() => {
    const cont = new Map()
    for (const im of TODOS) { const b = (im.bairro || '').trim(); if (b) cont.set(b, (cont.get(b) || 0) + 1) }
    return [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([b]) => b)
  }, [TODOS])
  // Grade SEO: imóveis por bairro de Uberlândia (links internos p/ /imoveis/uberlandia/:slug)
  const bairrosSeoGrid = useMemo(() =>
    BAIRROS_SEO
      .map((b) => ({ ...b, n: contBairros.get(b.nome.toLowerCase()) || 0 }))
      .filter((b) => b.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 48)
  , [contBairros])

  const lista = useMemo(() => {
    let r = TODOS.filter((im) => {
      if (f.tipo && im.tipo !== f.tipo) return false
      if (f.grupo) { const g = TIPO_CHIPS.find((c) => c.grupo === f.grupo); if (g && !g.re.test(im.tipo || '')) return false }
      if (f.bairros.length && !f.bairros.includes((im.bairro || '').trim())) return false
      if (f.quartos && (im.quartos || 0) < f.quartos) return false
      if (f.suites && (im.suites || 0) < f.suites) return false
      if (f.vagas && (im.vagas || 0) < f.vagas) return false
      if (f.area && (im.area || 0) < f.area) return false
      if (f.carac.length && !f.carac.every((c) => blobDe(im).includes(c.toLowerCase()))) return false
      if (f.precoMin && (im.preco || 0) < f.precoMin) return false
      if (f.precoMax && (im.preco || 0) > f.precoMax) return false
      if (f.q && fuseIds && !fuseIds.has(String(im.codigo))) return false
      return true
    })
    // "Mais recentes" (padrão): imóveis recém-chegados (com data de 1ª aparição) primeiro
    if (f.ordem === 'recentes') r = [...r].sort((a, b) => String(b.visto || '').localeCompare(String(a.visto || '')))
    if (f.ordem === 'menor') r = [...r].sort((a, b) => a.preco - b.preco)
    if (f.ordem === 'maior') r = [...r].sort((a, b) => b.preco - a.preco)
    if (f.ordem === 'area-maior') r = [...r].sort((a, b) => (b.area || 0) - (a.area || 0))
    if (f.ordem === 'area-menor') r = [...r].sort((a, b) => (a.area || 0) - (b.area || 0))
    // anúncios impulsionados (publicidade) sobem para o topo da listagem, como nos portais
    r = [...r].sort((a, b) => (b.impulsionado ? 1 : 0) - (a.impulsionado ? 1 : 0))
    return r
  }, [TODOS, f.tipo, f.grupo, f.bairros.join(','), f.quartos, f.suites, f.vagas, f.area, f.carac.join(','), f.precoMin, f.precoMax, f.q, f.ordem])

  const visiveis = lista.slice(0, mostrar)
  const temMais = mostrar < lista.length
  // rolagem infinita: carrega mais um lote quando o sentinela aparece
  useEffect(() => {
    if (!temMais) return
    const el = sentinelaRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setMostrar((m) => Math.min(m + LOTE, lista.length))
    }, { rootMargin: '700px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [temMais, lista.length])

  // imóveis novos de hoje (para destaque no topo quando sem filtros)
  const [novosHoje, setNovosHoje] = useState([])
  useEffect(() => {
    fetch('/novidades.json').then(r => r.ok ? r.json() : null).then(d => {
      if (d && d.novos) setNovosHoje(d.novos.slice(0, 4))
    }).catch(() => {})
  }, [])

  const diaLabel = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  const limpar = () => setParams({}, { replace: true })
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const chips = [
    f.q && { k: 'q', label: `“${f.q}”`, onRemove: () => up('q', '') },
    f.tipo && { k: 'tipo', label: f.tipo, onRemove: () => up('tipo', '') },
    ...f.bairros.map((b) => ({ k: 'b:' + b, label: b, onRemove: () => setBairros(f.bairros.filter((x) => x !== b)) })),
    f.precoMin > 0 && { k: 'precoMin', label: `A partir de R$ ${f.precoMin.toLocaleString('pt-BR')}`, onRemove: () => up('precoMin', 0) },
    f.precoMax > 0 && { k: 'precoMax', label: `Até R$ ${f.precoMax.toLocaleString('pt-BR')}`, onRemove: () => up('precoMax', 0) },
    f.quartos > 0 && { k: 'quartos', label: `${f.quartos}+ quartos`, onRemove: () => up('quartos', 0) },
    f.suites > 0 && { k: 'suites', label: `${f.suites}+ suítes`, onRemove: () => up('suites', 0) },
    f.vagas > 0 && { k: 'vagas', label: `${f.vagas}+ vagas`, onRemove: () => up('vagas', 0) },
    f.area > 0 && { k: 'area', label: `${f.area}+ m²`, onRemove: () => up('area', 0) },
    ...f.carac.map((c) => ({ k: 'c:' + c, label: c, onRemove: () => setCarac(f.carac.filter((x) => x !== c)) })),
  ].filter(Boolean)

  const semFiltros = chips.length === 0

  return (
    <main className="section--light catalogo">
      <div className="container">
        <Reveal>
          <div className="cat-head">
            <nav className="cat-bread" aria-label="Navegação">
              <Link to="/">Início</Link>
              <span aria-hidden="true">›</span>
              <span>Imóveis à venda{f.bairros.length === 1 ? ` em ${f.bairros[0]}` : ' em Uberlândia'}</span>
            </nav>
            <h1 className="cat-h1">
              {carregandoFeed && !feed.length
                ? <>Imóveis à venda em <em>Uberlândia</em></>
                : <><b>{lista.length.toLocaleString('pt-BR')}</b> {lista.length === 1 ? 'imóvel' : 'imóveis'} à venda em <em>{f.bairros.length === 1 ? f.bairros[0] : 'Uberlândia'}</em></>}
            </h1>
            <p className="cat-head-sub">
              Imóveis da carteira da <b>Rotina Imobiliária</b>, com o meu atendimento pessoal do começo ao fim. Use os filtros para encontrar o que combina com você.
            </p>
          </div>
        </Reveal>

        {/* botão "Filtros" — só aparece no mobile via CSS */}
        <button
          type="button"
          className={`cat-mob-filtros-btn${chips.length > 0 ? ' tem-filtros' : ''}`}
          onClick={() => setFiltrosAbertos(true)}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros{chips.length > 0 && <span className="cat-mob-badge">{chips.length}</span>}
        </button>

        {/* backdrop mobile */}
        {filtrosAbertos && <div className="cat-mob-backdrop" onClick={() => setFiltrosAbertos(false)} aria-hidden="true" />}

        <div className="cat-layout">
        <aside className={`cat-rail${filtrosAbertos ? ' cat-rail--aberto' : ''}`} data-lenis-prevent>
        <div className="cat-painel">
        {/* cabeçalho do drawer mobile — close button */}
        <div className="cat-mob-header">
          <span className="cat-mob-titulo">Filtros</span>
          <button type="button" className="cat-mob-fechar" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros">
            <IconClose width={18} height={18} />
          </button>
        </div>
        {/* Campo de busca em destaque */}
        <div className="cat-busca-box">
          <span className="cat-busca-ico"><FIco n="search" /></span>
          <input
            className="cat-busca"
            type="search"
            placeholder="Buscar por rua, bairro ou código"
            value={f.q}
            onChange={(e) => up('q', e.target.value)}
            list="cat-busca-sug"
            autoComplete="off"
          />
          <datalist id="cat-busca-sug">
            {sugestoesBusca.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Filtros */}
        <div className="cat-filtros">
          <FiltroSelect icon={<FIco n="tipo" />} placeholder="Todos os tipos" neutral="" value={f.tipo} onChange={(v) => up('tipo', v)}
            options={[{ value: '', label: 'Todos os tipos' }, ...TIPOS_IMOVEL.map((t) => ({ value: t, label: t }))]} />
          <FiltroSelect icon={<FIco n="bairro" />} placeholder="Todos os bairros" multiple searchable multiNoun="bairros" value={f.bairros} onChange={setBairros}
            options={(BAIRROS_TODOS.length ? BAIRROS_TODOS : BAIRROS_IMOVEL).map((b) => ({ value: b, label: b }))} />
          <div className="cat-preco">
            <span className="cat-preco-tit"><span className="cat-preco-ico"><FIco n="preco" /></span> Preço</span>
            <div className="cat-preco-campos">
              <InputMoeda className="cat-preco-input" placeholder="Mínimo" value={f.precoMin || ''} onChange={(v) => up('precoMin', v || 0)} />
              <span className="cat-preco-ate">até</span>
              <InputMoeda className="cat-preco-input" placeholder="Máximo" value={f.precoMax || ''} onChange={(v) => up('precoMax', v || 0)} />
            </div>
          </div>
          <FiltroPills icon={<FIco n="quartos" />} label="Quartos" value={f.quartos} onChange={(v) => up('quartos', v)} />
          <FiltroPills icon={<FIco n="suites" />} label="Suítes" value={f.suites} onChange={(v) => up('suites', v)} />
          <FiltroPills icon={<FIco n="vagas" />} label="Vagas" value={f.vagas} onChange={(v) => up('vagas', v)} />
          <FiltroSelect icon={<FIco n="area" />} placeholder="Área mín. (m²)" neutral={0} value={f.area} onChange={(v) => up('area', v)}
            options={[{ value: 0, label: 'Qualquer área' }, ...AREAS.map((n) => ({ value: n, label: `${n.toLocaleString('pt-BR')}+ m²` }))]} />
          <FiltroSelect icon={<FIco n="carac" />} placeholder="Características" multiple searchable multiNoun="características" value={f.carac} onChange={setCarac}
            options={CARACS.map((c) => ({ value: c.v, label: c.v, grupo: c.g }))} />
          <FiltroSelect icon={<FIco n="ordem" />} placeholder="Mais recentes" neutral="recentes" value={f.ordem} onChange={(v) => up('ordem', v)}
            options={[{ value: 'recentes', label: 'Mais recentes' }, { value: 'menor', label: 'Menor preço' }, { value: 'maior', label: 'Maior preço' }, { value: 'area-maior', label: 'Maior área' }, { value: 'area-menor', label: 'Menor área' }]} />
        </div>
        {/* botão "Ver X imóveis" — só aparece no drawer mobile */}
        <button type="button" className="cat-mob-aplicar" onClick={() => setFiltrosAbertos(false)}>
          Ver {lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'}
        </button>
        </div>

        {chips.length > 0 && (
          <div className="cat-chips">
            {chips.map((c) => (
              <button key={c.k} className="cat-chip" onClick={c.onRemove}>
                {c.label} <IconClose width={13} height={13} />
              </button>
            ))}
            <button className="cat-limpar" onClick={limpar}>Limpar tudo</button>
          </div>
        )}
        </aside>

        <div className="cat-main" data-lenis-prevent ref={catMainRef}>
        {/* "Visto recentemente" só aparece no topo quando NÃO há busca/filtro ativo.
            Com filtro ativo, o resultado da pesquisa é prioridade (fica em cima) e o
            "visto recentemente" desce para o fim da lista. */}
        {semFiltros && <VistosRecentemente excluir={null} />}

        {/* CTA: estudo do m² de qualquer imóvel (mesmo fora do site) */}
        <Link to="/avaliar" className="cat-avaliar-cta">
          <span className="cat-avaliar-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>
          </span>
          <span className="cat-avaliar-txt">
            <b>Esse imóvel vale o que pedem?</b>
            <i>Avalie <u>qualquer imóvel</u> — até de outro site. Estudo do valor do m² com dados reais do bairro.</i>
          </span>
          <span className="cat-avaliar-seta" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </Link>

        {(destaqueImoveis.length > 0 || isAdmin) && (
          <section className="cat-destaque-topo">
            <div className="cat-destaque-head">
              <span className="eyebrow">{destaqueImoveis.length ? 'Imóvel em destaque' : 'Destaque do catálogo'}</span>
              {isAdmin && !destaqueOk && <span className="cat-destaque-dica">Admin · clique em <b>★ Destacar no topo</b> em qualquer imóvel (até 3)</span>}
              {isAdmin && destaqueOk && <span className="cat-destaque-ok">✓ Destaque atualizado</span>}
            </div>
            {destaqueImoveis.length > 0 ? (
              <div className="cat-grid">
                {destaqueImoveis.map((im) => (
                  <div className="cat-card-wrap cat-card-wrap--destaque" key={im.codigo}>
                    <CardImovel im={im} />
                    {isAdmin && (
                      <div className="cat-admin-acoes">
                        <button type="button" className="cat-destacar-bar cat-destacar-bar--rem" onClick={() => toggleDestaque(im.codigo)}>✕ remover destaque</button>
                        <button type="button" className="cat-editar-bar" onClick={() => setEditando(im)} title="Editar fotos, título e dados (admin)">✎ Editar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isAdmin ? (
              <p className="cat-destaque-vazio">Nenhum imóvel destacado ainda. Role a lista e clique em <b>★ Destacar no topo</b> no imóvel que quiser exibir aqui.</p>
            ) : null}
            {destaqueMsg && <p className="cat-destaque-erro">{destaqueMsg}</p>}
          </section>
        )}


        <p className="cat-count">{carregandoFeed && !feed.length ? 'Carregando imóveis da Rotina…' : `${lista.length} ${lista.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`}</p>

        {lista.length ? (
          <>
          <div className="cat-grid">
            {visiveis.filter((im) => !destaqueCods.includes(String(im.codigo))).map((im) => (
              isAdmin ? (
                <div className="cat-card-wrap" key={im.codigo}>
                  <CardImovel im={im} />
                  <div className="cat-admin-acoes">
                    <button type="button" className="cat-destacar-bar" onClick={() => toggleDestaque(im.codigo)} title="Destacar este imóvel no topo do catálogo">★ Destacar</button>
                    <button type="button" className="cat-editar-bar" onClick={() => setEditando(im)} title="Editar fotos, título e dados (admin)">✎ Editar</button>
                  </div>
                </div>
              ) : (
                <CardImovel key={im.codigo} im={im} />
              )
            ))}
          </div>
          {temMais && (
            <div ref={sentinelaRef} className="cat-infinito" aria-hidden="true">
              <span className="rota-spinner" /> Carregando mais imóveis…
            </div>
          )}
          </>
        ) : (
          <div className="cat-vazio">
            <p>Não encontrei imóveis com esses filtros. Deixa eu achar pra você?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link className="btn btn-gold" to="/encontrar-imovel">Encontrar meu imóvel</Link>
              <a className="btn btn-ghost" href={linkWhatsApp(WA.imoveis)} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Me chamar no WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Com busca/filtro ativo, "visto recentemente" aparece aqui embaixo — nunca acima dos resultados. */}
        {!semFiltros && <VistosRecentemente excluir={null} />}

        {/* Grade SEO de bairros (estilo portal) — links internos por bairro de Uberlândia */}
        {bairrosSeoGrid.length > 12 && (
          <section className="cat-seo-bairros" aria-label="Imóveis por bairro em Uberlândia">
            <h2 className="cat-seo-tit">Imóveis à venda nos bairros mais procurados de <em>Uberlândia</em></h2>
            <div className="cat-seo-grid">
              {bairrosSeoGrid.map((b) => (
                <Link key={b.slug} to={`/imoveis/uberlandia/${b.slug}`} className="cat-seo-link">
                  Imóveis no {b.nome} <span>{b.n}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <AviseMe />
        </div>
        </div>

        {/* Editor de anúncio (admin) — aberto a partir do botão ✎ Editar em qualquer card.
            Ao salvar, reflete na hora em toda a listagem via ovMap. */}
        {isAdmin && editando && (
          <AdminImovelEditor
            im={editando}
            controlled
            open={!!editando}
            onClose={() => setEditando(null)}
            onSaved={(campos) => {
              const cod = String(editando.codigo)
              setOvMap((prev) => ({ ...(prev || {}), [cod]: { ...((prev && prev[cod]) || {}), ...campos } }))
              if (campos && campos.oculto && destaqueCods.includes(cod)) toggleDestaque(cod)
            }}
          />
        )}
      </div>
    </main>
  )
}
