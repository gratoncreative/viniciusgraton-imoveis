import { useParams, Link } from 'react-router-dom'
import { getConstrutora, CONSTRUTORAS, linkWhatsApp, waConstrutora } from '../data'
import { useSEO } from '../useSEO'
import ComparadorEmpreendimentos from '../components/ComparadorEmpreendimentos'
import { IconWhats, IconArrow, IconShield } from '../components/icons'

export default function ConstrutoraDetalhe() {
  const { slug } = useParams()
  const c = getConstrutora(slug)

  useSEO({
    title: c ? `${c.nome} — empreendimentos em Uberlândia` : 'Construtora não encontrada',
    description: c
      ? `${c.descricao} Veja fotos, plantas, vídeos e detalhes dos lançamentos da ${c.nome} em Uberlândia e fale com o Vinícius para visitar.`
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
  const stats = [
    c.fundacao && { rotulo: 'No mercado desde', valor: c.fundacao },
    c.atuacao && { rotulo: 'Atuação', valor: c.atuacao },
    c.entregas && { rotulo: 'Histórico', valor: c.entregas },
  ].filter(Boolean)

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
            {c.instagram && (
              <a className="btn btn-ghost" href={c.instagram} target="_blank" rel="noopener noreferrer">
                Instagram oficial
              </a>
            )}
          </div>
        </div>
      </header>

      {(stats.length > 0 || c.descricaoLonga || (c.diferenciais || []).length > 0 || (c.certificacoes || []).length > 0) && (
        <section className="section--light construtora-sobre">
          <div className="container">
            {stats.length > 0 && (
              <div className="construtora-stats">
                {stats.map((s, i) => (
                  <div className="construtora-stat" key={i}>
                    <span className="construtora-stat-rot">{s.rotulo}</span>
                    <b className="construtora-stat-val">{s.valor}</b>
                  </div>
                ))}
              </div>
            )}

            {c.descricaoLonga && (
              <div className="construtora-bio">
                <h2 className="det-rel-titulo">Sobre a {c.nome}</h2>
                <p>{c.descricaoLonga}</p>
              </div>
            )}

            <div className="construtora-cols">
              {(c.diferenciais || []).length > 0 && (
                <div className="construtora-col">
                  <h3 className="construtora-col-tit">Diferenciais</h3>
                  <ul className="empre-amen">
                    {c.diferenciais.map((d, i) => <li key={i}><span className="det-carac-check">✓</span> {d}</li>)}
                  </ul>
                </div>
              )}
              {(c.certificacoes || []).length > 0 && (
                <div className="construtora-col">
                  <h3 className="construtora-col-tit">Certificações</h3>
                  <div className="construtora-selos">
                    {c.certificacoes.map((s, i) => <span className="construtora-selo" key={i}>{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section--light" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="det-rel-titulo">Empreendimentos em Uberlândia</h2>
          <ComparadorEmpreendimentos c={c} />

          <div className="det-trust" style={{ marginTop: 28 }}>
            <IconShield width={20} height={20} />
            <p><b>Faço a curadoria de cada empreendimento</b> antes de indicar — confiro construtora, documentação, localização e padrão de entrega, pra te apresentar só o que tem qualidade e excelência. Marcas, imagens e materiais são das respectivas construtoras. Valores e disponibilidade são confirmados no atendimento, e eu te acompanho na visita e em toda a negociação.</p>
          </div>
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
