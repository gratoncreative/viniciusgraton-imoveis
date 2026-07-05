import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import { getBairroSeo, imoveisDoBairro, linkWhatsApp, slugify } from '../data'
import { TIPOS_SEO, tipoSeoPorSlug } from '../tiposSeo'
import { useFeed } from '../useFeed'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin } from '../components/icons'
import '../styles/detalhe.css'
import '../styles/catalogo.css'
import '../styles/construtoras.css'
import '../styles/bairros.css'

const SITE = 'https://viniciusgraton.com.br'
const artigo = (t) => (t.singular === 'casa' ? 'uma casa' : `um ${t.singular}`)

// Página long-tail: imóveis de um TIPO em um BAIRRO (ex.: apartamentos no Santa Mônica).
export default function BairroTipo() {
  const { bairro: slug, tipo: tipoSlug } = useParams()
  const b = getBairroSeo(slug)
  const t = tipoSeoPorSlug(tipoSlug)

  const { feed, carregando } = useFeed()
  // mostra o catálogo COMPLETO do bairro (curados + feed da Rotina), igual ao que o Google vê no prerender
  const todosBairro = (() => {
    if (!b) return []
    const map = new Map()
    for (const im of imoveisDoBairro(b.nome)) if (im && im.codigo != null) map.set(String(im.codigo), im)
    for (const im of feed) if (im && im.bairro && slugify(im.bairro) === b.slug && im.codigo != null && !map.has(String(im.codigo))) map.set(String(im.codigo), im)
    return [...map.values()]
  })()
  const lista = b && t ? todosBairro.filter((im) => t.re.test(im.tipo || '')) : []
  const fmtC = (v) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1).replace('.', ',')} mi` : v > 0 ? `R$ ${Math.round(v / 1000)} mil` : ''
  const fmtM2 = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}/m²`
  const precos = lista.filter((im) => im.preco > 0 && im.preco < 5e7).map((im) => im.preco).sort((a, z) => a - z)
  const m2 = lista.filter((im) => im.preco > 0 && im.area > 0).map((im) => im.preco / im.area).filter((v) => v >= 1000 && v <= 30000).sort((a, z) => a - z)
  const pctf = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0
  const m2med = m2.length ? m2[Math.floor(m2.length / 2)] : 0
  const precoLo = pctf(precos, 0.1), precoHi = pctf(precos, 0.9)
  const m2lo = pctf(m2, 0.1), m2hi = pctf(m2, 0.9)

  // tipos com estoque no bairro (links internos)
  const tiposNoBairro = TIPOS_SEO.map((x) => ({ ...x, n: todosBairro.filter((im) => x.re.test(im.tipo || '')).length })).filter((x) => x.n > 0)

  const faq = []
  if (b && t && precos.length) faq.push({ q: `Quanto custa ${artigo(t)} no ${b.nome}, Uberlândia?`, a: `${t.plural} à venda no ${b.nome} vão de ${fmtC(precoLo)} a ${fmtC(precoHi)}${lista.length >= 3 ? `, com ${lista.length} opções na curadoria agora` : ''}.` })
  if (b && t && m2.length >= 3) faq.push({ q: `Quanto custa o metro quadrado de ${t.plural.toLowerCase()} no ${b.nome}?`, a: `O m² de ${t.plural.toLowerCase()} no ${b.nome} fica em torno de ${fmtM2(m2med)} (a maioria entre ${fmtM2(m2lo)} e ${fmtM2(m2hi)}), a partir dos anúncios à venda hoje. Para avaliar um imóvel específico, use o estudo do m² ou fale comigo.` })
  if (b && t) faq.push({ q: `Tem ${t.plural.toLowerCase()} à venda no ${b.nome}?`, a: lista.length ? `Sim - no momento tenho ${lista.length} ${lista.length === 1 ? t.singular : t.plural.toLowerCase()} à venda no ${b.nome}. Veja abaixo ou me chame no WhatsApp.` : `Posso buscar pra você. Me chame no WhatsApp que eu trago ${t.plural.toLowerCase()} no ${b.nome} que cabem no seu perfil.` })

  useSEO({
    title: b && t ? `${t.plural} à venda em ${b.nome}, Uberlândia - preços` : 'Página não encontrada',
    description: b && t
      ? `${lista.length ? `${lista.length} ` : ''}${t.plural.toLowerCase()} à venda em ${b.nome}, Uberlândia${precos.length ? ` de ${fmtC(precoLo)} a ${fmtC(precoHi)}` : ''}.${m2.length >= 3 ? ` m² em torno de ${fmtM2(m2med)}.` : ''} Curadoria de Vinícius Graton.`.slice(0, 158)
      : 'Página não encontrada.',
    path: `/imoveis/uberlandia/${slug || ''}/${tipoSlug || ''}`,
  })

  useEffect(() => {
    if (!b || !t) return
    const url = `${SITE}/imoveis/uberlandia/${slug}/${tipoSlug}/`
    const bairroUrl = `${SITE}/imoveis/uberlandia/${slug}/`
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'bairrotipo-jsonld'
    const graph = [
      { '@type': 'CollectionPage', url, name: `${t.plural} à venda em ${b.nome}, Uberlândia`, about: { '@type': 'Place', name: `${b.nome}, Uberlândia, MG`, containedInPlace: { '@type': 'City', name: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' } }, publisher: { '@type': 'RealEstateAgent', name: 'Vinícius Graton Imóveis', url: SITE } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${SITE}/imoveis` },
        { '@type': 'ListItem', position: 3, name: b.nome, item: bairroUrl },
        { '@type': 'ListItem', position: 4, name: t.plural, item: url },
      ] },
    ]
    if (faq.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    document.head.appendChild(el)
    return () => { document.getElementById('bairrotipo-jsonld')?.remove() }
  }, [b, t, slug, tipoSlug])

  if (!b || !t) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Página não encontrada</h1>
          <p className="section-sub" style={{ margin: '14px auto 28px', maxWidth: 460 }}>
            {b ? <>Veja todos os imóveis em <Link to={`/imoveis/uberlandia/${slug}`}>{b.nome}</Link>.</> : 'Veja todos os imóveis de Uberlândia.'}
          </p>
          <Link className="btn btn-gold" to={b ? `/imoveis/uberlandia/${slug}` : '/imoveis'}>Ver imóveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina bairro-pg">
      <header className="construtora-hero">
        <div className="container">
          <nav className="det-bread">
            <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <Link to={`/imoveis/uberlandia/${slug}`}>{b.nome}</Link> <span>/</span> <b>{t.plural}</b>
          </nav>
          <span className="eyebrow"><IconPin width={14} height={14} /> {b.nome}, Uberlândia</span>
          <h1 className="section-title">{t.plural} à venda em <em>{b.nome}</em></h1>
          <p className="construtora-desc">
            {lista.length ? `${lista.length} ${lista.length === 1 ? t.singular : t.plural.toLowerCase()} à venda no ${b.nome}` : `${t.plural} no ${b.nome}`}{precos.length ? `, de ${fmtC(precoLo)} a ${fmtC(precoHi)}` : ''}{m2.length >= 3 ? ` · m² em torno de ${fmtM2(m2med)}` : ''}. Curadoria pessoal do Vinícius Graton.
          </p>
          <div className="construtora-hero-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Quero ver ${t.plural.toLowerCase()} à venda em ${b.nome}, Uberlândia.`)} target="_blank" rel="noopener noreferrer">
              <IconWhats /> Quero {t.plural.toLowerCase()} em {b.nome}
            </a>
            <Link className="btn btn-ghost" to={`/imoveis?bairro=${encodeURIComponent(b.nome)}`}>Ver no catálogo <IconArrow /></Link>
          </div>
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          {tiposNoBairro.length > 1 && (
            <p className="bairro-faq-links" style={{ marginBottom: 18 }}>
              No {b.nome}:{' '}
              {tiposNoBairro.map((x, i) => (
                <span key={x.slug}>{i > 0 ? ' · ' : ''}{x.slug === t.slug ? <b>{x.plural} ({x.n})</b> : <Link to={`/imoveis/uberlandia/${slug}/${x.slug}`}>{x.plural} ({x.n})</Link>}</span>
              ))}
              {' · '}<Link to={`/imoveis/uberlandia/${slug}`}>tudo no {b.nome}</Link>
            </p>
          )}
          {lista.length ? (
            <>
              <h2 className="det-rel-titulo">{lista.length} {lista.length === 1 ? t.singular : t.plural.toLowerCase()} em {b.nome}</h2>
              <div className="im-grid" style={{ perspective: '1400px' }}>
                {lista.map((im, i) => (<Reveal key={im.codigo} delay={(i % 3) * 0.06}><CardImovel im={im} /></Reveal>))}
              </div>
            </>
          ) : carregando ? (
            <p className="section-sub" style={{ textAlign: 'center', padding: '24px 0' }}>Carregando imóveis…</p>
          ) : (
            <div className="cat-vazio">
              <p>Ainda não tenho {t.plural.toLowerCase()} publicado no {b.nome} - mas tenho acesso a muito mais opções na região. Me conta o que você procura.</p>
              <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Procuro ${t.singular} no ${b.nome}, Uberlândia. Pode me ajudar?`)} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Me conta o que você procura
              </a>
            </div>
          )}
          <AviseMe contexto={`${t.plural} no ${b.nome}`} />
        </div>
      </section>

      {faq.length > 0 && (
        <section className="section--light bairro-faq">
          <div className="container">
            <h2 className="det-rel-titulo">Perguntas sobre {t.plural.toLowerCase()} no {b.nome}</h2>
            <div className="bairro-faq-lista">
              {faq.map((f, i) => (
                <div className="bairro-faq-item" key={i}>
                  <h3 className="bairro-faq-q">{f.q}</h3>
                  <p className="bairro-faq-a">{f.a}</p>
                </div>
              ))}
            </div>
            <p className="bairro-faq-links">
              <Link to={`/imoveis/uberlandia/${slug}`}>Todos os imóveis no {b.nome}</Link> · <Link to="/mercado">preço do m² por bairro</Link> · <Link to="/simulador-financiamento">simular financiamento</Link>
            </p>
          </div>
        </section>
      )}
    </main>
  )
}
