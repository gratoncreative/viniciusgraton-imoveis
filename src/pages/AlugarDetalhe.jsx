import { useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { formatPreco, formatArea, slugify, linkWhatsApp } from '../data'
import { useAlugueis } from '../useAlugueis'
import { useSEO } from '../useSEO'
import { IconWhats, IconPin, IconArrow, IconShield } from '../components/icons'
import { onImgError } from '../img'

export default function AlugarDetalhe() {
  const { codigo } = useParams()
  const { alugueis, carregando } = useAlugueis()
  const im = useMemo(() => alugueis.find((i) => String(i.codigo) === String(codigo)) || null, [alugueis, codigo])

  const titulo = im ? `${im.tipo} para alugar no ${im.bairro}, Uberlândia` : 'Imóvel para alugar'
  useSEO({
    title: im ? `${titulo} - ${formatPreco(im.preco)}/mês · Cód. ${im.codigo}` : 'Imóvel para alugar',
    description: im ? `${im.tipo} para alugar no ${im.bairro}, Uberlândia por ${formatPreco(im.preco)}/mês${im.quartos ? ` · ${im.quartos} quartos` : ''}${im.area ? ` · ${im.area}m²` : ''}. Fale com o Vinícius Graton sobre garantia e visita.`.slice(0, 158) : '',
    path: `/alugar/imovel/${codigo || ''}`,
  })

  useEffect(() => {
    if (!im) return
    const url = `https://viniciusgraton.com.br/alugar/imovel/${im.codigo}`
    const el = document.createElement('script')
    el.type = 'application/ld+json'; el.id = 'alugar-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['Product', 'Residence'], name: titulo, url,
          description: (im.descricao || titulo).slice(0, 300),
          ...(im.img ? { image: im.img } : {}),
          offers: { '@type': 'Offer', priceCurrency: 'BRL', price: im.preco, businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut', availability: 'https://schema.org/InStock', url, seller: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', areaServed: 'Uberlândia - MG' } },
        },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
          { '@type': 'ListItem', position: 2, name: 'Alugar', item: 'https://viniciusgraton.com.br/alugar' },
          { '@type': 'ListItem', position: 3, name: `${im.tipo} no ${im.bairro}`, item: url },
        ] },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('alugar-jsonld')?.remove() }
  }, [im, titulo])

  if (!im) {
    if (carregando) return <main className="pagina section--light"><div className="container" style={{ textAlign: 'center', padding: '60px 0' }}><p className="section-sub">Carregando imóvel…</p></div></main>
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Imóvel não encontrado</h1>
          <p className="section-sub" style={{ margin: '14px auto 28px', maxWidth: 460 }}>Esse imóvel de aluguel pode ter saído do ar. Veja os disponíveis.</p>
          <Link className="btn btn-gold" to="/alugar">Ver imóveis para alugar <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const specs = [
    im.quartos > 0 && `${im.quartos} ${im.quartos === 1 ? 'quarto' : 'quartos'}`,
    im.suites > 0 && `${im.suites} ${im.suites === 1 ? 'suíte' : 'suítes'}`,
    im.banheiros > 0 && `${im.banheiros} ${im.banheiros === 1 ? 'banheiro' : 'banheiros'}`,
    im.vagas > 0 && `${im.vagas} ${im.vagas === 1 ? 'vaga' : 'vagas'}`,
    im.area > 0 && formatArea(im.area),
  ].filter(Boolean)

  const msg = `Olá Vinícius! Tenho interesse no imóvel para alugar cód. ${im.codigo} (${im.tipo} no ${im.bairro} · ${formatPreco(im.preco)}/mês). Pode me passar as condições (garantia) e agendar uma visita?`
  const relacionados = alugueis.filter((i) => i.bairro === im.bairro && String(i.codigo) !== String(im.codigo)).slice(0, 3)

  return (
    <main className="pagina section--light det">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/alugar">Alugar</Link> <span>/</span> <Link to={`/alugar/uberlandia/${slugify(im.bairro || '')}`}>{im.bairro}</Link> <span>/</span> <b>Cód. {im.codigo}</b>
        </nav>

        <div className="det-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 28, alignItems: 'start' }}>
          <div>
            <figure className="det-foto" style={{ marginBottom: 18 }}>
              <img src={im.img} alt={`${im.tipo} para alugar no ${im.bairro}, Uberlândia`} loading="eager" onError={onImgError} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </figure>
            <span className="eyebrow"><IconPin width={14} height={14} /> {im.cidade || 'Uberlândia'} - {im.uf || 'MG'} · Cód. {im.codigo}</span>
            <h1 className="section-title" style={{ margin: '6px 0 4px' }}>{im.tipo} para alugar no <em>{im.bairro}</em></h1>
            {im.rua && <p className="det-local"><IconPin width={15} height={15} /> {im.rua}</p>}
            {specs.length > 0 && <p className="det-specs-txt" style={{ fontWeight: 600, color: '#1C2A44', margin: '12px 0' }}>{specs.join(' · ')}</p>}
            {im.descricao && <p style={{ lineHeight: 1.7, color: 'var(--text)' }}>{im.descricao}</p>}
          </div>

          <aside style={{ position: 'sticky', top: 90, background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: '0 20px 50px -30px rgba(28,42,68,.4)' }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.9rem', color: '#1C2A44', fontWeight: 800, lineHeight: 1.1 }}>
              {im.preco >= 200
                ? <>{formatPreco(im.preco)}<span style={{ fontSize: '1rem', color: '#8a909c', fontWeight: 600 }}>/mês</span></>
                : <span style={{ fontSize: '1.2rem' }}>Aluguel sob consulta</span>}
            </p>
            {im.condominio > 0 && <p className="painel-meta" style={{ marginTop: 4 }}>+ condomínio R$ {Number(im.condominio).toLocaleString('pt-BR')}</p>}
            <a className="btn btn-gold" href={linkWhatsApp(msg)} target="_blank" rel="noopener noreferrer" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
              <IconWhats /> Tenho interesse
            </a>
            <div className="det-trust" style={{ marginTop: 16 }}>
              <IconShield width={20} height={20} />
              <p><b>Garantia facilitada.</b> Trabalho com fiador, seguro-fiança e caução - te explico qual encaixa melhor no seu caso e agendo a visita.</p>
            </div>
          </aside>
        </div>

        {relacionados.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 className="det-rel-titulo">Outros imóveis para alugar no {im.bairro}</h2>
            <div className="cat-grid">{relacionados.map((r) => <CardImovel key={r.codigo} im={r} />)}</div>
          </section>
        )}
      </div>
    </main>
  )
}
