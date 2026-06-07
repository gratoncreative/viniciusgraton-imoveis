import { useParams, Link } from 'react-router-dom'
import Galeria from '../components/Galeria'
import CondominioLead from '../components/CondominioLead'
import { getCondominio, CONDOMINIOS } from '../data'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
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

  const fotos = [c.capa, ...(c.galeria || [])].filter(Boolean)
  const mapsQuery = encodeURIComponent(`${c.nome}, ${c.regiao}, Uberlândia, MG`)
  const outros = CONDOMINIOS.filter((x) => x.slug !== c.slug).slice(0, 6)

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
                  <div className="empre-mini-capa">{x.capa ? <img src={x.capa} alt={x.nome} loading="lazy" referrerPolicy="no-referrer" /> : <span className="proj-capa-vazia"><IconBuilding width={26} height={26} /></span>}</div>
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
