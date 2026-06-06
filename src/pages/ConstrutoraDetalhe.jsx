import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import { getConstrutora, CONSTRUTORAS, linkWhatsApp, waConstrutora } from '../data'
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import { IconWhats, IconArrow, IconPin, IconClose, IconBuilding } from '../components/icons'

export default function ConstrutoraDetalhe() {
  const { slug } = useParams()
  const c = getConstrutora(slug)

  // lightbox compartilhado da página: { imgs:[], i }
  const [lb, setLb] = useState(null)
  const fechar = useCallback(() => setLb(null), [])
  const mover = useCallback((d) => setLb((s) => (s ? { ...s, i: (s.i + d + s.imgs.length) % s.imgs.length } : s)), [])
  useEffect(() => {
    if (!lb) return
    const onKey = (e) => {
      if (e.key === 'Escape') fechar()
      else if (e.key === 'ArrowRight') mover(1)
      else if (e.key === 'ArrowLeft') mover(-1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lb, fechar, mover])

  useSEO({
    title: c ? `${c.nome} — empreendimentos em Uberlândia` : 'Construtora não encontrada',
    description: c
      ? `${c.descricao} Veja fotos, vídeos e os lançamentos da ${c.nome} em Uberlândia e fale com o Vinícius para visitar.`
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
              {c.projetos.map((p, i) => {
                const imgs = [p.capa, ...(p.galeria || [])].filter(Boolean)
                return (
                  <article className="proj-card" key={i}>
                    <button
                      type="button"
                      className="proj-capa"
                      onClick={() => imgs.length && setLb({ imgs, i: 0 })}
                      aria-label={imgs.length ? `Ver fotos de ${p.nome}` : p.nome}
                      disabled={!imgs.length}
                    >
                      {p.capa ? (
                        <img src={p.capa} alt={`${p.nome} — ${c.nome}, Uberlândia`} loading="lazy" onError={onImgError} />
                      ) : (
                        <span className="proj-capa-vazia"><IconBuilding width={34} height={34} /></span>
                      )}
                      {p.status && <span className="proj-status proj-status--over">{p.status}</span>}
                      {imgs.length > 1 && <span className="proj-capa-fotos">{imgs.length} fotos</span>}
                    </button>

                    <div className="proj-body">
                      <h3>{p.nome}</h3>
                      {p.bairro && <p className="proj-bairro"><IconPin width={15} height={15} /> {p.bairro}, Uberlândia</p>}
                      {p.descricao && <p className="proj-desc">{p.descricao}</p>}
                      <div className="proj-acoes">
                        <a className="btn btn-gold proj-cta" href={linkWhatsApp(waConstrutora(c, p))} target="_blank" rel="noopener">
                          <IconWhats /> Quero visitar
                        </a>
                        <div className="proj-links">
                          {p.video && (
                            <a className="proj-link" href={p.video} target="_blank" rel="noopener">▶ Vídeo</a>
                          )}
                          {p.url && (
                            <a className="proj-link" href={p.url} target="_blank" rel="noopener">Fotos e materiais oficiais <IconArrow width={13} height={13} /></a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="section-sub">Confira os empreendimentos atuais no site oficial da {c.nome}.</p>
          )}
          <p className="construtora-aviso">
            Marcas, imagens e materiais são de responsabilidade da {c.nome} e usados para divulgação dos
            empreendimentos. Valores e disponibilidade são confirmados no atendimento — eu te acompanho na
            visita e em toda a negociação.
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

      {lb && createPortal(
        <div className="lb" onClick={fechar}>
          <button className="lb-close" aria-label="Fechar"><IconClose width={28} height={28} /></button>
          {lb.imgs.length > 1 && <span className="lb-count">{lb.i + 1} / {lb.imgs.length}</span>}
          <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
            {lb.imgs.length > 1 && (
              <button className="lb-nav lb-prev" onClick={() => mover(-1)} aria-label="Anterior">
                <IconArrow style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            <img src={lb.imgs[lb.i]} alt="" onError={onImgError} />
            {lb.imgs.length > 1 && (
              <button className="lb-nav lb-next" onClick={() => mover(1)} aria-label="Próxima">
                <IconArrow />
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}
