import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import { getBairroSeo, imoveisDoBairro, BAIRROS_SEO, linkWhatsApp } from '../data'
import { getBairroEditorial, getBairroFotoInfo } from '../bairros-editorial'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin, IconShield } from '../components/icons'

export default function Bairro() {
  const { bairro: slug } = useParams()
  const b = getBairroSeo(slug)
  const ed = getBairroEditorial(slug)

  useSEO({
    title: b ? `Imóveis à venda em ${b.nome}, Uberlândia — guia do bairro` : 'Bairro não encontrado',
    description: b
      ? `${ed ? ed.intro.slice(0, 150) : b.desc} Casas e apartamentos à venda em ${b.nome}, Uberlândia, com Vinícius Graton.`
      : 'Bairro não encontrado.',
    path: `/imoveis/uberlandia/${slug || ''}`,
  })

  useEffect(() => {
    if (!b) return
    const url = `https://viniciusgraton.com.br/imoveis/uberlandia/${slug}`
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'bairro-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          url,
          name: `Imóveis à venda em ${b.nome}, Uberlândia`,
          description: ed ? ed.intro.slice(0, 200) : b.desc,
          about: { '@type': 'Place', name: b.nome, containedInPlace: { '@type': 'City', name: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' } },
          publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', url: 'https://viniciusgraton.com.br' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://viniciusgraton.com.br/' },
            { '@type': 'ListItem', position: 2, name: 'Imóveis', item: 'https://viniciusgraton.com.br/imoveis' },
            { '@type': 'ListItem', position: 3, name: b.nome, item: url },
          ],
        },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('bairro-jsonld')?.remove() }
  }, [b, slug, ed])

  if (!b) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Bairro não encontrado</h1>
          <p className="section-sub" style={{ margin: '14px auto 28px', maxWidth: 460 }}>Veja todos os imóveis e regiões de Uberlândia.</p>
          <Link className="btn btn-gold" to="/imoveis">Ver imóveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const lista = imoveisDoBairro(b.nome)
  const outros = BAIRROS_SEO.filter((x) => x.slug !== b.slug)
  const fotoInfo = getBairroFotoInfo(slug)

  return (
    <main className="pagina bairro-pg">
      <header className="construtora-hero">
        <div className="container">
          <nav className="det-bread">
            <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{b.nome}</b>
          </nav>
          <span className="eyebrow"><IconPin width={14} height={14} /> Uberlândia</span>
          <h1 className="section-title">Imóveis à venda em <em>{b.nome}</em></h1>
          <p className="construtora-desc">{ed ? ed.intro : b.desc}</p>
          <div className="construtora-hero-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Quero ver imóveis à venda em ${b.nome}, Uberlândia.`)} target="_blank" rel="noopener noreferrer">
              <IconWhats /> Quero opções em {b.nome}
            </a>
            <Link className="btn btn-ghost" to={`/imoveis?bairro=${encodeURIComponent(b.nome)}`}>Ver no catálogo <IconArrow /></Link>
          </div>
        </div>
      </header>

      <figure className="bairro-foto">
        <img src={fotoInfo.src} alt={`Foto de ${fotoInfo.local}`} loading="lazy" referrerPolicy="no-referrer" />
        <figcaption><IconPin width={13} height={13} /> {fotoInfo.local} · <span className="bairro-foto-cred">{fotoInfo.cred}</span></figcaption>
      </figure>

      {ed && (
        <section className="section--light bairro-editorial">
          <div className="container">
            <div className="bairro-ed-grid">
              <div className="bairro-ed-main">
                {ed.historia && (
                  <>
                    <h2 className="det-rel-titulo">A história do {b.nome}</h2>
                    <p className="bairro-ed-texto">{ed.historia}</p>
                  </>
                )}
                {(ed.curiosidades || []).length > 0 && (
                  <>
                    <h3 className="bairro-ed-sub">Curiosidades e o que tem por perto</h3>
                    <ul className="bairro-ed-curios">
                      {ed.curiosidades.map((c, i) => <li key={i}><span>★</span> {c}</li>)}
                    </ul>
                  </>
                )}
              </div>
              <aside className="bairro-ed-side">
                {(ed.destaques || []).length > 0 && (
                  <div className="bairro-ed-card">
                    <h3 className="bairro-ed-sub">Por que morar aqui</h3>
                    <ul className="empre-amen">
                      {ed.destaques.map((d, i) => <li key={i}><span className="det-carac-check">✓</span> {d}</li>)}
                    </ul>
                  </div>
                )}
                {ed.perfil && (
                  <div className="det-trust" style={{ marginTop: 16 }}>
                    <IconShield width={20} height={20} />
                    <p><b>Pra quem é:</b> {ed.perfil}</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      )}

      <section className="section--light" style={ed ? { paddingTop: 0 } : undefined}>
        <div className="container">
          {lista.length ? (
            <>
              <h2 className="det-rel-titulo">{lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'} em {b.nome}</h2>
              <div className="im-grid" style={{ perspective: '1400px' }}>
                {lista.map((im, i) => (
                  <Reveal key={im.codigo} delay={(i % 3) * 0.06}><CardImovel im={im} /></Reveal>
                ))}
              </div>
            </>
          ) : (
            <div className="cat-vazio">
              <p>Ainda não tenho um imóvel publicado em {b.nome} — mas tenho acesso a muito mais opções na região. Me conta o que você procura.</p>
              <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Procuro imóvel em ${b.nome}, Uberlândia. Pode me ajudar?`)} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Me conta o que você procura
              </a>
            </div>
          )}
          <AviseMe contexto={b.nome} />
        </div>
      </section>

      <section className="construtora-outras">
        <div className="container">
          <h2 className="det-rel-titulo">Imóveis em outros bairros de Uberlândia</h2>
          <div className="bairros-links">
            {outros.map((x) => (
              <Link key={x.slug} className="bairro-link" to={`/imoveis/uberlandia/${x.slug}`}>{x.nome}</Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
