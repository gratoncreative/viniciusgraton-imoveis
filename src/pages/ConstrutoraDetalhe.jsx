import { useParams, Link } from 'react-router-dom'
import { getConstrutora, CONSTRUTORAS, linkWhatsApp, waConstrutora } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin } from '../components/icons'

export default function ConstrutoraDetalhe() {
  const { slug } = useParams()
  const c = getConstrutora(slug)

  useSEO({
    title: c ? `${c.nome} — empreendimentos em Uberlândia` : 'Construtora não encontrada',
    description: c
      ? `${c.descricao} Veja os lançamentos da ${c.nome} em Uberlândia e fale com o Vinícius para visitar.`
      : 'Construtora não encontrada.',
    path: `/construtoras/${slug || ''}`,
  })

  if (!c) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Construtora não encontrada</h1>
          <p className="section-sub" style={{ margin: '14px auto 28px', maxWidth: 460 }}>
            Veja todas as construtoras com quem eu trabalho em Uberlândia.
          </p>
          <Link className="btn btn-gold" to="/construtoras">Ver construtoras <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const outras = CONSTRUTORAS.filter((x) => x.slug !== c.slug)

  return (
    <main className="pagina construtora-pg">
      <header className="construtora-hero">
        <div className="container">
          <nav className="det-bread">
            <Link to="/">Início</Link> <span>/</span> <Link to="/construtoras">Construtoras</Link> <span>/</span> <b>{c.nome}</b>
          </nav>
          <span className="eyebrow">Construtora · Uberlândia</span>
          <h1 className="section-title">{c.nome}</h1>
          {c.segmento && <p className="construtora-seg">{c.segmento}</p>}
          <p className="construtora-desc">{c.descricao}</p>
          <div className="construtora-hero-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(waConstrutora(c))} target="_blank" rel="noopener">
              <IconWhats /> Falar com o Vinícius
            </a>
            <a className="btn btn-ghost" href={c.site} target="_blank" rel="noopener">
              Site oficial <IconArrow />
            </a>
          </div>
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          <h2 className="det-rel-titulo">Empreendimentos em Uberlândia</h2>
          {c.projetos && c.projetos.length ? (
            <div className="construtora-projs">
              {c.projetos.map((p, i) => (
                <article className="proj-card" key={i}>
                  <div className="proj-card-head">
                    {p.status && <span className="proj-status">{p.status}</span>}
                    <h3>{p.nome}</h3>
                    {p.bairro && (
                      <p className="proj-bairro"><IconPin width={15} height={15} /> {p.bairro}, Uberlândia</p>
                    )}
                  </div>
                  {p.descricao && <p className="proj-desc">{p.descricao}</p>}
                  <div className="proj-acoes">
                    <a className="btn btn-gold proj-cta" href={linkWhatsApp(waConstrutora(c, p))} target="_blank" rel="noopener">
                      <IconWhats /> Quero visitar
                    </a>
                    {p.url && (
                      <a className="proj-site" href={p.url} target="_blank" rel="noopener">
                        Ver no site oficial <IconArrow width={14} height={14} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-sub">Confira os empreendimentos atuais no site oficial da {c.nome} — ou me chame que eu te mostro as melhores opções.</p>
          )}
          <p className="construtora-aviso">
            Marcas, empreendimentos e informações são de responsabilidade da {c.nome}. Valores e disponibilidade
            são confirmados no atendimento. Eu te acompanho na visita e em toda a negociação.
          </p>
        </div>
      </section>

      <section className="construtora-outras">
        <div className="container">
          <h2 className="det-rel-titulo">Outras construtoras</h2>
          <div className="construtoras-grid">
            {outras.map((x) => (
              <Link key={x.slug} className="construtora-marca" to={`/construtoras/${x.slug}`}>
                <span className="construtora-marca-nome">{x.nome}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
