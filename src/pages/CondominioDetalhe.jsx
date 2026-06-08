import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Galeria from '../components/Galeria'
import CondominioLead from '../components/CondominioLead'
import { getCondominio, CONDOMINIOS, CONFIG } from '../data'
import { useSEO } from '../useSEO'
import { onCondImgError, CAPA_COND_PADRAO } from '../img'
import { IconArrow, IconPin, IconBuilding } from '../components/icons'

export default function CondominioDetalhe() {
  const { slug } = useParams()
  const c = getCondominio(slug)

  useSEO({
    title: c ? `${c.nome} — condomínio fechado em ${c.regiao}, Uberlândia` : 'Condomínio não encontrado',
    description: c
      ? `${(c.descricao || '').slice(0, 150)} Fale com o Vinícius Graton para morar no ${c.nome}, em Uberlândia.`
      : 'Condomínio não encontrado.',
    path: `/condominios/${slug || ''}`,
  })

  // Dados estruturados (SEO / rich results no Google e leitura por IAs)
  useEffect(() => {
    if (!c) return
    const origin = window.location.origin
    const abs = (u) => (u && u.startsWith('http') ? u : origin + u)
    const imgs = [c.capa, ...(c.galeria || [])].filter(Boolean).map((u) => abs(u.split('?')[0]))
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Residence',
      name: c.nome,
      description: c.descricao || `${c.nome}, condomínio fechado em ${c.regiao}, Uberlândia.`,
      ...(imgs.length ? { image: imgs } : {}),
      address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
      ...(c.amenidades?.length ? { amenityFeature: c.amenidades.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })) } : {}),
      brand: { '@type': 'RealEstateAgent', name: CONFIG.marca, areaServed: 'Uberlândia - MG', url: 'https://viniciusgraton.com.br' },
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-condominio'
    el.text = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { document.getElementById('ld-condominio')?.remove() }
  }, [c])

  if (!c) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Condomínio não encontrado</h1>
          <Link className="btn btn-gold" to="/condominios" style={{ marginTop: 20 }}>Ver condomínios <IconArrow /></Link>
        </div>
      </main>
    )
  }

  // Condomínio com FASES (ex.: Terra Nova 1, 2 e 3) — mostra as fases como cards
  if (c.fases && c.fases.length) {
    const fases = c.fases.map((s) => getCondominio(s)).filter(Boolean)
    return (
      <main className="pagina section--light det condos-pg">
        <div className="container">
          <nav className="det-bread">
            <Link to="/">Início</Link> <span>/</span> <Link to="/condominios">Condomínios</Link> <span>/</span> <b>{c.nome}</b>
          </nav>
          <div style={{ maxWidth: 760, margin: '8px 0 4px' }}>
            <span className="eyebrow"><IconPin width={14} height={14} /> {c.regiao}</span>
            <h1 className="section-title" style={{ marginTop: 8 }}>{c.nome}</h1>
            <p className="section-sub" style={{ marginTop: 12 }}>{c.descricao}</p>
          </div>
          <h2 className="det-rel-titulo" style={{ marginTop: 30 }}>As fases do {c.nome}</h2>
          <div className="construtora-projs condo-grid">
            {fases.map((f) => (
              <Link className="condo-card" to={`/condominios/${f.slug}`} key={f.slug}>
                <span className="condo-capa">
                  <img src={f.capa || CAPA_COND_PADRAO} alt={`${f.nome} — Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onCondImgError} />
                  <span className="condo-tipo">{f.tipo}</span>
                </span>
                <span className="condo-body">
                  <b className="condo-nome">{f.nome}</b>
                  <span className="condo-regiao"><IconPin width={14} height={14} /> {f.regiao}</span>
                  {(f.destaques || []).length > 0 && <span className="condo-destaque">{f.destaques[0]}</span>}
                  <span className="condo-ver">Ver fase <IconArrow width={14} height={14} /></span>
                </span>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><CondominioLead condominio={c.nome} /></div>
          <div style={{ marginTop: 36 }}><Link className="btn btn-ghost" to="/condominios"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Ver todos os condomínios</Link></div>
        </div>
      </main>
    )
  }

  const fotosReais = [c.capa, ...(c.galeria || [])].filter(Boolean)
  const fotos = fotosReais.length ? fotosReais : [CAPA_COND_PADRAO]
  const mapsQuery = encodeURIComponent(`${c.nome}, ${c.regiao}, Uberlândia, MG`)
  const zonaDe = (r = '') => /sul/i.test(r) ? 'sul' : (/leste|marileusa/i.test(r) ? 'leste' : (/represa|miranda/i.test(r) ? 'represa' : (/oeste/i.test(r) ? 'oeste' : 'outras')))
  const zc = zonaDe(c.regiao)
  // "Veja também" relevante: prioriza mesma zona e mesmo padrão, com capa primeiro
  const outros = CONDOMINIOS
    .filter((x) => x.slug !== c.slug && !x.fases && !x.grupo)
    .map((x) => ({ x, score: (zonaDe(x.regiao) === zc ? 2 : 0) + (x.segmento === c.segmento ? 1 : 0) + (x.capa ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((o) => o.x)

  return (
    <main className="pagina section--light det condos-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/condominios">Condomínios</Link> <span>/</span> <b>{c.nome}</b>
        </nav>

        <div className="det-grid">
          <div className="det-galeria">
            {c.status && <span className="det-tag">{c.status}</span>}
            {fotos.length ? <Galeria fotos={fotos} alt={`${c.nome} — condomínio fechado em Uberlândia`} /> : (
              <div className="empre-semfoto"><IconBuilding width={40} height={40} /><span>Fotos sob consulta</span></div>
            )}
          </div>

          <aside className="det-info">
            <p className="det-local"><IconPin width={15} height={15} /> {c.regiao}</p>
            <h1 className="det-titulo">{c.nome}</h1>
            <p className="det-subtitulo">{c.tipo} · {c.regiao}, Uberlândia</p>

            {(c.destaques || []).length > 0 && (
              <ul className="condo-destaques">
                {c.destaques.map((d, i) => <li key={i}><span className="det-carac-check">✓</span> {d}</li>)}
              </ul>
            )}

            <a className="btn btn-gold det-whats" href="#interesse">
              Quero morar aqui — fazer curadoria <IconArrow />
            </a>
          </aside>
        </div>

        {c.descricao && (
          <div className="det-sobre">
            <h2 className="det-rel-titulo">Sobre o condomínio</h2>
            <div className="det-sobre-texto"><p>{c.descricao}</p></div>
          </div>
        )}

        {(c.amenidades || []).length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Lazer, estrutura e segurança</h2>
            <ul className="empre-amen">
              {c.amenidades.map((a, i) => <li key={i}><span className="det-carac-check">✓</span> {a}</li>)}
            </ul>
          </div>
        )}

        <div className="det-mapa">
          <h2 className="det-rel-titulo">Localização</h2>
          <p className="det-mapa-bairro"><IconPin width={18} height={18} /> {c.regiao}, Uberlândia — MG</p>
          <div className="det-mapa-frame det-mapa-frame--wide">
            <iframe title={`Mapa ${c.nome}`} src={`https://maps.google.com/maps?q=${mapsQuery}&z=14&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>

        <div id="interesse" style={{ scrollMarginTop: 90 }}>
          <CondominioLead condominio={c.nome} />
        </div>

        {outros.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Outros condomínios em Uberlândia</h2>
            <div className="construtora-projs">
              {outros.map((x) => (
                <Link key={x.slug} className="empre-mini" to={`/condominios/${x.slug}`}>
                  <div className="empre-mini-capa"><img src={x.capa || CAPA_COND_PADRAO} alt={x.nome} loading="lazy" referrerPolicy="no-referrer" onError={onCondImgError} /></div>
                  <div className="empre-mini-txt"><b>{x.nome}</b><span>{x.regiao}</span></div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <Link className="btn btn-ghost" to="/condominios"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Ver todos os condomínios</Link>
        </div>
      </div>
    </main>
  )
}
