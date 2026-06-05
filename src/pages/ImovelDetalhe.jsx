import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import CardImovel from '../components/CardImovel'
import { getImovel, fotosDe, formatPreco, formatArea, resumoImovel, IMOVEIS, linkWhatsApp, waImovel, CONFIG } from '../data'
import { IconWhats, IconArrow, ICONS } from './../components/icons'

const plural = (n, s, p) => (n > 1 ? p : s)

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <div className="det-spec">
      {Icon && <span className="det-spec-ico"><Icon width={22} height={22} /></span>}
      <div>
        <b>{valor}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const im = getImovel(codigo)
  const fotos = fotosDe(im)

  useEffect(() => {
    if (im) document.title = `${im.tipo} no ${im.bairro} — ${formatPreco(im.preco)} | ${CONFIG.nome}`
    return () => { document.title = `${CONFIG.marca}` }
  }, [im])

  // Dados estruturados (SEO / rich results no Google)
  useEffect(() => {
    if (!im) return
    const origin = window.location.origin
    const abs = (u) => (u && u.startsWith('http') ? u : origin + u)
    const props = [
      im.quartos > 0 && { '@type': 'PropertyValue', name: 'Quartos', value: im.quartos },
      im.suites > 0 && { '@type': 'PropertyValue', name: 'Suítes', value: im.suites },
      im.banheiros > 0 && { '@type': 'PropertyValue', name: 'Banheiros', value: im.banheiros },
      im.vagas > 0 && { '@type': 'PropertyValue', name: 'Vagas', value: im.vagas },
      im.area > 0 && { '@type': 'PropertyValue', name: 'Área', value: im.area, unitText: 'm²' },
    ].filter(Boolean)
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${im.tipo} no ${im.bairro}, Uberlândia`,
      description: resumoImovel(im),
      image: fotos.map(abs),
      category: 'Imóvel à venda',
      additionalProperty: props,
      offers: {
        '@type': 'Offer',
        price: im.preco,
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: window.location.href,
        seller: { '@type': 'RealEstateAgent', name: CONFIG.marca, areaServed: 'Uberlândia - MG' },
      },
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-imovel'
    el.text = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { document.getElementById('ld-imovel')?.remove() }
  }, [im, fotos])

  if (!im) {
    return (
      <main className="section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Imóvel não encontrado</h1>
          <p className="section-sub" style={{ margin: '12px 0 28px' }}>
            Esse imóvel pode ter sido vendido ou saído do catálogo.
          </p>
          <Link className="btn btn-gold" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: 'área interna' },
  ].filter(Boolean)

  // outros imóveis (prioriza o mesmo tipo)
  const relacionados = [
    ...IMOVEIS.filter((i) => i.codigo !== im.codigo && i.tipo === im.tipo),
    ...IMOVEIS.filter((i) => i.codigo !== im.codigo && i.tipo !== im.tipo),
  ].slice(0, 3)

  const compartilhar = async () => {
    const url = window.location.href
    const texto = `${im.tipo} no ${im.bairro} — ${formatPreco(im.preco)} | Vinícius Graton Imóveis`
    if (navigator.share) {
      try { await navigator.share({ title: texto, url }) } catch (e) { /* cancelado */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`, '_blank', 'noopener')
    }
  }

  return (
    <main className="section--light det">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <span className="det-tag">{im.tipo}</span>
            <Galeria fotos={fotos} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} />
          </div>

          {/* Painel de info */}
          <aside className="det-info">
            <Reveal>
              <p className="det-local">{im.cidade} — {im.uf} · Cód. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-preco">{formatPreco(im.preco)}</p>

              <div className="det-specs">
                {specs.map((s, i) => <Spec key={i} {...s} />)}
              </div>

              <p className="det-desc">{resumoImovel(im)}</p>

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse neste imóvel
              </a>
              <a
                className="btn btn-ghost det-visita"
                href={linkWhatsApp(`Olá Vinícius! Quero agendar uma visita ao imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}).`)}
                target="_blank"
                rel="noopener"
              >
                Agendar uma visita
              </a>
              <button type="button" className="det-share" onClick={compartilhar}>
                <IconArrow width={16} height={16} /> Compartilhar este imóvel
              </button>

              <p className="det-aviso">
                Valores e disponibilidade sujeitos a confirmação. Atendimento direto comigo, do
                primeiro contato à entrega das chaves.
              </p>
            </Reveal>
          </aside>
        </div>

        {relacionados.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Veja também</h2>
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {relacionados.map((r) => <CardImovel key={r.codigo} im={r} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <Link className="btn btn-ghost" to="/imoveis"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para o catálogo</Link>
        </div>
      </div>
    </main>
  )
}
