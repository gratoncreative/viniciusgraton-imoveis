import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IMOVEIS, BAIRROS_IMOVEL, linkWhatsApp, formatArea } from '../data'
import { cardVM, precoCompacto } from '../components/vg/vgData'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { CardVG } from '../components/vg/SecoesVG'

const POR_PAGINA = 24
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const ehTerreno = (im) => /terreno|lote|chácar|chacar/i.test(im?.tipo || '')

const WA_BUSCA = 'Olá Vinícius! Não encontrei o que procuro no site. Pode me ajudar com uma busca personalizada?'

export default function CatalogoVG() {
  useSEO({
    title: 'Imóveis à venda em Uberlândia',
    description:
      'Casas, apartamentos, coberturas e terrenos à venda em Uberlândia com curadoria do consultor Vinícius Graton. Filtre por bairro, tipo, preço e área.',
    path: '/imoveis',
  })

  const [params, setParams] = useSearchParams()
  const [feed, setFeed] = useState([])
  const [mostrar, setMostrar] = useState(POR_PAGINA)

  // Carteira completa (o bundle curado + o catálogo cheio da Rotina).
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return
        const lista = Array.isArray(d) ? d : d?.imoveis || []
        setFeed(lista)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  // Filtros vivem na URL (link compartilhável e volta do navegador funciona).
  const f = {
    q: params.get('q') || '',
    bairro: params.get('bairro') || '',
    tipo: params.get('tipo') || '',
    quartos: params.get('quartos') || '',
    vagas: params.get('vagas') || '',
    precoMin: params.get('precoMin') || '',
    precoMax: params.get('precoMax') || '',
    area: params.get('area') || '',
    ordem: params.get('ordem') || '',
    colecao: params.get('colecao') === 'alto-padrao',
  }

  const setF = (chave, valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(chave, valor)
    else p.delete(chave)
    setParams(p, { replace: true })
    setMostrar(POR_PAGINA)
  }
  const limpar = () => { setParams(new URLSearchParams(), { replace: true }); setMostrar(POR_PAGINA) }
  const temFiltro = !!(f.q || f.bairro || f.tipo || f.quartos || f.vagas || f.precoMin || f.precoMax || f.area || f.ordem || f.colecao)

  // Base: curados primeiro (têm as edições do painel), depois o resto da carteira.
  const base = useMemo(() => {
    const vistos = new Set(IMOVEIS.map((i) => String(i.codigo)))
    const extras = feed.filter((i) => i && !vistos.has(String(i.codigo)) && !i.oculto)
    return [...IMOVEIS, ...extras]
  }, [feed])

  const bairros = useMemo(() => {
    const s = new Set([...BAIRROS_IMOVEL, ...base.map((i) => i.bairro).filter(Boolean)])
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [base])

  const resultados = useMemo(() => {
    let l = base.filter((i) => i && !i.oculto && Number(i.preco) > 0)
    if (f.colecao) l = l.filter((x) => Number(x.preco) >= 1000000)
    if (f.q.trim()) {
      const q = norm(f.q.trim())
      l = l.filter((x) => norm(`${x.codigo} ${x.titulo || ''} ${x.bairro} ${x.tipo} ${x.descricao || ''}`).includes(q))
    }
    if (f.bairro) l = l.filter((x) => x.bairro === f.bairro)
    if (f.tipo) l = l.filter((x) => norm(x.tipo).includes(norm(f.tipo)))
    if (f.quartos) l = l.filter((x) => (x.quartos || 0) >= +f.quartos)
    if (f.vagas) l = l.filter((x) => (x.vagas || 0) >= +f.vagas)
    if (f.precoMin) l = l.filter((x) => x.preco >= +f.precoMin)
    if (f.precoMax === '99999999') l = l.filter((x) => x.preco > 2000000)
    else if (f.precoMax) l = l.filter((x) => x.preco <= +f.precoMax)
    if (f.area) l = l.filter((x) => (x.area || 0) >= +f.area)

    if (f.ordem === 'preco-asc') l = [...l].sort((a, b) => a.preco - b.preco)
    else if (f.ordem === 'preco-desc') l = [...l].sort((a, b) => b.preco - a.preco)
    else if (f.ordem === 'area-desc') l = [...l].sort((a, b) => (b.area || 0) - (a.area || 0))
    else if (f.ordem === 'm2-asc') l = [...l].sort((a, b) => (a.preco / (a.area || 1)) - (b.preco / (b.area || 1)))
    return l
  }, [base, params])

  // Renderiza aos poucos: com milhares de imóveis, jogar tudo de uma vez trava a página.
  const sentinela = useRef(null)
  useEffect(() => {
    const el = sentinela.current
    if (!el || mostrar >= resultados.length) return
    const io = new IntersectionObserver((entradas) => {
      if (entradas[0]?.isIntersecting) setMostrar((n) => n + POR_PAGINA)
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [mostrar, resultados.length])

  const visiveis = resultados.slice(0, mostrar)
  const wa = linkWhatsApp(WA_BUSCA)

  const vmDe = (im) => {
    const vm = cardVM(im)
    if (ehTerreno(im) && im.area > 0) {
      vm.specs = `${formatArea(im.area)} de terreno${im.preco > 0 ? ` · ${precoCompacto(im.preco / im.area)}/m²` : ''}`
    }
    return vm
  }

  return (
    <div className="vgx">
      <NavbarVG ativo="imoveis" />

      <section className="vgx-cat-hero">
        <div className="vgx-goldgrid" />
        <div className="vgx-cat-hero-in">
          <div>
            <span className="vgx-kicker vgx-kicker--gold">Catálogo · Imóveis à venda em Uberlândia</span>
            <h1>Encontre o seu imóvel em Uberlândia</h1>
            <p>
              Cada imóvel desta lista passou pela curadoria do Vinícius. Se não encontrar o que procura,
              ele busca por você na carteira completa da Rotina Imobiliária.
            </p>
          </div>
        </div>
      </section>

      <section className="vgx-cat">
        <div className="vgx-filtros">
          <div className="vgx-filtros-l1">
            {f.colecao && (
              <button className="vgx-chip-colecao" onClick={() => setF('colecao', '')}>
                Coleção alto padrão ✕
              </button>
            )}
            <input
              value={f.q}
              onChange={(e) => setF('q', e.target.value)}
              placeholder="Buscar por código, bairro ou palavra-chave"
              aria-label="Buscar"
            />
            <select value={f.bairro} onChange={(e) => setF('bairro', e.target.value)} aria-label="Bairro">
              <option value="">Todos os bairros</option>
              {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={f.tipo} onChange={(e) => setF('tipo', e.target.value)} aria-label="Tipo">
              <option value="">Todos os tipos</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Casa em condomínio">Casa em condomínio</option>
              <option value="Cobertura">Cobertura</option>
              <option value="Terreno">Terreno / lote</option>
            </select>
            <select value={f.ordem} onChange={(e) => setF('ordem', e.target.value)} aria-label="Ordenar">
              <option value="">Mais relevantes</option>
              <option value="preco-asc">Menor preço</option>
              <option value="preco-desc">Maior preço</option>
              <option value="area-desc">Maior área</option>
              <option value="m2-asc">Menor R$/m²</option>
            </select>
          </div>
          <div className="vgx-filtros-l2">
            <select value={f.quartos} onChange={(e) => setF('quartos', e.target.value)} aria-label="Quartos">
              <option value="">Quartos</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select value={f.vagas} onChange={(e) => setF('vagas', e.target.value)} aria-label="Vagas">
              <option value="">Vagas</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
            <select value={f.precoMin} onChange={(e) => setF('precoMin', e.target.value)} aria-label="Preço mínimo">
              <option value="">Preço mínimo</option>
              <option value="300000">R$ 300 mil</option>
              <option value="500000">R$ 500 mil</option>
              <option value="800000">R$ 800 mil</option>
              <option value="1000000">R$ 1 milhão</option>
              <option value="1500000">R$ 1,5 milhão</option>
              <option value="2000000">R$ 2 milhões</option>
            </select>
            <select value={f.precoMax} onChange={(e) => setF('precoMax', e.target.value)} aria-label="Preço máximo">
              <option value="">Preço máximo</option>
              <option value="500000">R$ 500 mil</option>
              <option value="800000">R$ 800 mil</option>
              <option value="1000000">R$ 1 milhão</option>
              <option value="1500000">R$ 1,5 milhão</option>
              <option value="2000000">R$ 2 milhões</option>
              <option value="99999999">Acima de R$ 2 milhões</option>
            </select>
            <select value={f.area} onChange={(e) => setF('area', e.target.value)} aria-label="Área mínima">
              <option value="">Área mínima</option>
              {[60, 100, 150, 200, 300].map((n) => <option key={n} value={n}>{n} m²</option>)}
            </select>
            {temFiltro && <button className="vgx-limpar" onClick={limpar}>Limpar filtros</button>}
          </div>
        </div>

        {visiveis.length > 0 && (
          <div className="vgx-cards">
            {visiveis.map((im) => <CardVG key={im.codigo} vm={vmDe(im)} />)}
          </div>
        )}

        {mostrar < resultados.length && <div className="vgx-mais" ref={sentinela} />}

        {!resultados.length && (
          <div className="vgx-vazio">
            <h3>Não encontramos com esses filtros</h3>
            <p>
              Mas isso não significa que o seu imóvel não existe. Conte ao Vinícius o que procura e ele
              busca na carteira completa da Rotina Imobiliária.
            </p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red" style={{ marginTop: 8 }}>
              Pedir uma busca personalizada
            </a>
          </div>
        )}

        {resultados.length > 0 && (
          <div className="vgx-faixa">
            <div className="vgx-faixa-col">
              <span className="vgx-kicker vgx-kicker--gold">Não encontrou o imóvel ideal?</span>
              <h3>O que está no site é só a curadoria. A carteira completa da Rotina vai muito além.</h3>
              <p>
                Diga ao Vinícius o bairro, o perfil e o orçamento. Ele filtra a carteira da Rotina e volta
                só com o que faz sentido para você.
              </p>
            </div>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">
              Pedir uma busca personalizada
            </a>
          </div>
        )}
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
