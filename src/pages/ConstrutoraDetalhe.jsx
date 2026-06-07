import { useParams, Link } from 'react-router-dom'
import { getConstrutora, CONSTRUTORAS, linkWhatsApp, waConstrutora } from '../data'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import { IconWhats, IconArrow, IconPin, IconBuilding } from '../components/icons'

export default function ConstrutoraDetalhe() {
  const { slug } = useParams()
  const c = getConstrutora(slug)

  useSEO({
    title: c ? `${c.nome} — empreendimentos em Uberlândia` : 'Construtora não encontrada',
    description: c
      ? `${c.descricao} Veja fotos, plantas e detalhes dos lançamentos da ${c.nome} em Uberlândia e fale com o Vinícius para visitar.`
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
          </div>
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          <h2 className="det-rel-titulo">Empreendimentos em Uberlândia</h2>
          {c.projetos && c.projetos.length ? (
            <div className="construtora-projs">
              {c.projetos.map((p) => (
                <Link className="proj-card" key={p.slug} to={`/construtoras/${c.slug}/${p.slug}`}>
                  <span className="proj-capa">
                    {p.capa ? (
                      <img src={p.capa} alt={`${p.nome} — ${c.nome}, Uberlândia`} loading="lazy" onError={onImgError} />
                    ) : (
                      <span className="proj-capa-vazia"><IconBuilding width={34} height={34} /></span>
                    )}
                    {p.status && <span className="proj-status proj-status--over">{p.status}</span>}
                    {(p.galeria || []).length > 0 && <span className="proj-capa-fotos">{(p.galeria || []).length + 1} fotos</span>}
                  </span>
                  <span className="proj-body">
                    <b className="proj-nome">{p.nome}</b>
                    {p.bairro && <span className="proj-bairro"><IconPin width={15} height={15} /> {p.bairro}, Uberlândia</span>}
                    {p.descricao && <span className="proj-desc">{p.descricao.length > 110 ? p.descricao.slice(0, 109) + '…' : p.descricao}</span>}
                    <span className="proj-ver">Ver empreendimento <IconArrow width={14} height={14} /></span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="section-sub">Em breve, lançamentos da {c.nome} por aqui. Me chame no WhatsApp que eu te mostro as opções.</p>
          )}
          <p className="construtora-aviso">
            Marcas, imagens e materiais são das respectivas construtoras e usados para divulgação dos empreendimentos.
            Valores e disponibilidade são confirmados no atendimento — eu te acompanho na visita e em toda a negociação.
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
