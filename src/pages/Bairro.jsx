import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import { getBairroSeo, imoveisDoBairro, BAIRROS_SEO, linkWhatsApp, slugify } from '../data'
import { useFeed } from '../useFeed'
import { getBairroEditorial, getBairroFotoInfo } from '../bairros-editorial'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin, IconShield } from '../components/icons'
import '../styles/detalhe.css'
import '../styles/catalogo.css'
import '../styles/construtoras.css'
import '../styles/bairros.css'

export default function Bairro() {
  const { bairro: slug } = useParams()
  // ── Dados REAIS do bairro (catálogo) → meta única, FAQ e schema hiperlocais ──
  const { feed, carregando } = useFeed()
  const bSeo = getBairroSeo(slug)
  // Nome real do bairro a partir do feed — faz a página funcionar para QUALQUER bairro
  // com imóveis (ex.: os 38 do ranking /investir, fora da curadoria SEO).
  const feedNome = bSeo ? null : (feed.find((im) => im && im.bairro && slugify(im.bairro) === slug)?.bairro || null)
  const b = bSeo || (feedNome ? { nome: feedNome, slug, desc: `Imóveis à venda em ${feedNome}, Uberlândia. Veja as opções na carteira e fale comigo.` } : null)
  const ed = getBairroEditorial(slug)
  // catálogo completo do bairro (curados + feed da Rotina), igual ao prerender que o Google vê
  const lista = (() => {
    if (!b) return []
    const map = new Map()
    for (const im of imoveisDoBairro(b.nome)) if (im && im.codigo != null) map.set(String(im.codigo), im)
    for (const im of feed) if (im && im.bairro && slugify(im.bairro) === b.slug && im.codigo != null && !map.has(String(im.codigo))) map.set(String(im.codigo), im)
    return [...map.values()]
  })()
  const fmtC = (v) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1).replace('.', ',')} mi` : v > 0 ? `R$ ${Math.round(v / 1000)} mil` : ''
  const fmtM2 = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}/m²`
  const precos = lista.filter((im) => im.preco > 0 && im.preco < 5e7).map((im) => im.preco).sort((a, z) => a - z)
  const m2 = lista.filter((im) => im.preco > 0 && im.area > 0).map((im) => im.preco / im.area).filter((v) => v >= 1000 && v <= 30000).sort((a, z) => a - z)
  const m2med = m2.length ? m2[Math.floor(m2.length / 2)] : 0
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0
  const precoLo = pct(precos, 0.1), precoHi = pct(precos, 0.9) // faixa típica (sem outliers)
  const m2lo = pct(m2, 0.1), m2hi = pct(m2, 0.9)
  const nApto = lista.filter((im) => /apart|kit|st[uú]dio|loft|flat|cobertura/i.test(im.tipo || '')).length
  const nCasa = lista.filter((im) => /casa|sobrado/i.test(im.tipo || '')).length
  const nLote = lista.filter((im) => /lote|terreno/i.test(im.tipo || '')).length
  // FAQ hiperlocal a partir de DADO real (única por bairro — não duplica entre páginas)
  const faq = []
  if (b && m2.length >= 3) faq.push({ q: `Quanto custa o metro quadrado no ${b.nome}?`, a: `Considerando os imóveis à venda hoje no ${b.nome}, o preço fica em torno de ${fmtM2(m2med)} (a maioria entre ${fmtM2(m2lo)} e ${fmtM2(m2hi)}). É uma referência de mercado a partir dos anúncios - para avaliar um imóvel específico, use o estudo do m² ou fale comigo.` })
  if (b && precos.length) faq.push({ q: `Quanto custa um imóvel no ${b.nome}, Uberlândia?`, a: `Os imóveis à venda no ${b.nome} vão de ${fmtC(precoLo)} a ${fmtC(precoHi)}.` })
  const tp = []; if (nApto) tp.push(`${nApto} ${nApto === 1 ? 'apartamento' : 'apartamentos'}`); if (nCasa) tp.push(`${nCasa} ${nCasa === 1 ? 'casa' : 'casas'}`); if (nLote) tp.push(`${nLote} ${nLote === 1 ? 'lote/terreno' : 'lotes/terrenos'}`)
  if (b && tp.length) faq.push({ q: `Tem apartamento ou casa à venda no ${b.nome}?`, a: `No momento tenho ${tp.join(', ')} à venda no ${b.nome}. Veja todas no catálogo filtrado por bairro ou me chame no WhatsApp que eu trago opções que cabem no seu perfil.` })
  if (b && ed && ed.perfil) faq.push({ q: `Vale a pena morar no ${b.nome}?`, a: `${ed.perfil}${ed.destaques && ed.destaques.length ? ` Destaques do bairro: ${ed.destaques.slice(0, 3).join(', ')}.` : ''}` })

  useSEO({
    title: b ? `Imóveis à venda em ${b.nome}, Uberlândia - preços e guia do bairro` : 'Bairro não encontrado',
    description: b
      ? `Imóveis à venda em ${b.nome}, Uberlândia${precos.length ? ` de ${fmtC(precoLo)} a ${fmtC(precoHi)}` : ''}.${m2.length >= 3 ? ` Preço médio ${fmtM2(m2med)}.` : ''} Curadoria de Vinícius Graton.`.slice(0, 158)
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
        ...(faq.length ? [{
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }] : []),
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('bairro-jsonld')?.remove() }
  }, [b, slug, ed])

  if (!b) {
    if (carregando) {
      return (
        <main className="pagina section--light det-vazio">
          <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="section-sub">Carregando imóveis…</p>
          </div>
        </main>
      )
    }
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
          {(() => {
            const tlinks = [
              { slug: 'apartamentos', plural: 'Apartamentos', n: nApto },
              { slug: 'casas', plural: 'Casas', n: nCasa },
              { slug: 'terrenos', plural: 'Terrenos', n: nLote },
            ].filter((x) => x.n > 0)
            return tlinks.length ? (
              <p className="bairro-faq-links" style={{ marginBottom: 18 }}>
                Por tipo no {b.nome}:{' '}
                {tlinks.map((x, i) => (
                  <span key={x.slug}>{i > 0 ? ' · ' : ''}<Link to={`/imoveis/uberlandia/${b.slug}/${x.slug}`}>{x.plural}</Link></span>
                ))}
              </p>
            ) : null
          })()}
          {lista.length ? (
            <>
              <h2 className="det-rel-titulo">Imóveis em {b.nome}</h2>
              <div className="im-grid" style={{ perspective: '1400px' }}>
                {lista.map((im, i) => (
                  <Reveal key={im.codigo} delay={(i % 3) * 0.06}><CardImovel im={im} /></Reveal>
                ))}
              </div>
            </>
          ) : carregando ? (
            <p className="section-sub" style={{ textAlign: 'center', padding: '24px 0' }}>Carregando imóveis…</p>
          ) : (
            <div className="cat-vazio">
              <p>Ainda não tenho um imóvel publicado em {b.nome} - mas tenho acesso a muito mais opções na região. Me conta o que você procura.</p>
              <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Procuro imóvel em ${b.nome}, Uberlândia. Pode me ajudar?`)} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Me conta o que você procura
              </a>
            </div>
          )}
          <AviseMe contexto={b.nome} />
        </div>
      </section>

      {faq.length > 0 && (
        <section className="section--light bairro-faq">
          <div className="container">
            <h2 className="det-rel-titulo">Perguntas sobre imóveis no {b.nome}</h2>
            <div className="bairro-faq-lista">
              {faq.map((f, i) => (
                <div className="bairro-faq-item" key={i}>
                  <h3 className="bairro-faq-q">{f.q}</h3>
                  <p className="bairro-faq-a">{f.a}</p>
                </div>
              ))}
            </div>
            <p className="bairro-faq-links">
              Ferramentas: <Link to="/mercado">preço do m² por bairro em Uberlândia</Link> · <Link to="/ferramentas">calculadoras e estudo do m²</Link> · <Link to={`/imoveis?bairro=${encodeURIComponent(b.nome)}`}>ver imóveis no {b.nome}</Link>
            </p>
          </div>
        </section>
      )}

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
