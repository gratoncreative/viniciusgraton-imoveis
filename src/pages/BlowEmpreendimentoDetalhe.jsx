import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AviseMe from '../components/AviseMe'
import { getBlowEmpreendimento, linkWhatsApp } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin, IconShield, IconBuilding } from '../components/icons'

const ytId = (u = '') => {
  const m = String(u).match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : ''
}

export default function BlowEmpreendimentoDetalhe() {
  const { slug } = useParams()
  const e = getBlowEmpreendimento(slug)

  useSEO({
    title: e
      ? `${e.nome} — ${e.construtoraNome}, ${e.bairro || 'Uberlândia'}`
      : 'Empreendimento não encontrado',
    description: e
      ? `${e.descricao.slice(0, 150)} Fale com o Vinícius Graton e agende uma visita ao ${e.nome}, da ${e.construtoraNome}, em Uberlândia.`
      : 'Empreendimento não encontrado.',
    path: `/lancamentos/empreendimento/blow/${slug}`,
  })

  if (!e) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Empreendimento não encontrado</h1>
          <Link className="btn btn-gold" to="/lancamentos" style={{ marginTop: 20 }}>
            Ver lançamentos <IconArrow />
          </Link>
        </div>
      </main>
    )
  }

  const fotos = [e.capa, ...(e.fotos || [])].filter(Boolean)
  const wa = `Olá Vinícius! Tenho interesse no empreendimento ${e.nome} (${e.construtoraNome}), no ${e.bairro || 'Uberlândia'}. Quero mais informações e agendar uma visita.`
  const vid = ytId(e.youtube || '')
  const mapsQuery = encodeURIComponent(
    e.endereco ? `${e.endereco}, ${e.bairro}, Uberlândia, MG` : `${e.bairro}, Uberlândia, MG`
  )

  return (
    <main className="pagina section--light det empre-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span>
          <Link to="/lancamentos">Lançamentos</Link> <span>/</span>
          <b>{e.nome}</b>
        </nav>

        <div className="det-grid">
          <div className="det-galeria">
            {e.status && <span className="det-tag">{e.status}</span>}
            {fotos.length ? (
              <Galeria fotos={fotos} alt={`${e.nome} — ${e.construtoraNome}, Uberlândia`} />
            ) : (
              <div className="empre-semfoto">
                <IconBuilding width={40} height={40} /><span>Fotos sob consulta</span>
              </div>
            )}
          </div>

          <aside className="det-info">
            <Reveal>
              <p className="det-local">
                <IconPin width={15} height={15} /> {e.bairro ? `${e.bairro}, ` : ''}Uberlândia
                {e.areaMin ? ` · ${e.areaMin}${e.areaMax && e.areaMax !== e.areaMin ? `–${e.areaMax}` : ''} m²` : ''}
              </p>
              <h1 className="det-titulo">{e.nome}</h1>
              <p className="det-subtitulo">
                {e.construtoraNome}
                {e.status ? ` — ${e.status}` : ''}
                {e.endereco ? `. ${e.endereco}` : ''}
              </p>
              {e.unidadesDisponiveis > 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-mute)', marginBottom: 12 }}>
                  {e.unidadesDisponiveis} unidade{e.unidadesDisponiveis > 1 ? 's' : ''} disponível
                  {e.totalUnidades ? ` de ${e.totalUnidades}` : ''}
                </p>
              )}

              <a className="btn btn-gold det-whats" href={linkWhatsApp(wa)} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse — quero visitar
              </a>
              <a
                className="btn btn-ghost det-visita"
                href={linkWhatsApp(`Olá Vinícius! Quero detalhes (plantas, valores e condições) do ${e.nome}, da ${e.construtoraNome}.`)}
                target="_blank"
                rel="noopener"
              >
                Pedir plantas e valores
              </a>

              {(e.pdfApresentacao || e.pdfTabela) && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  {e.pdfApresentacao && (
                    <a href={e.pdfApresentacao} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
                      📄 Apresentação PDF
                    </a>
                  )}
                  {e.pdfTabela && (
                    <a href={e.pdfTabela} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
                      📋 Tabela de preços
                    </a>
                  )}
                </div>
              )}

              <div className="det-trust">
                <IconShield width={20} height={20} />
                <p>
                  <b>Eu cuido de tudo pra você</b> neste lançamento: informações, visita, plantas,
                  condições e a negociação — do primeiro contato à entrega das chaves. Consultor
                  credenciado da Rotina Imobiliária.
                </p>
              </div>
            </Reveal>
          </aside>
        </div>

        {e.descricao && (
          <div className="det-sobre">
            <h2 className="det-rel-titulo">Sobre o empreendimento</h2>
            <div className="det-sobre-texto"><p>{e.descricao}</p></div>
          </div>
        )}

        {e.tipologias && e.tipologias.length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Plantas e tipologias</h2>
            <div className="empre-tipos">
              {e.tipologias.map((t, i) => (
                <div className="empre-tipo" key={i}><IconBuilding width={18} height={18} /> <span>{t}</span></div>
              ))}
            </div>
          </div>
        )}

        {e.plantas && e.plantas.length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Plantas baixas</h2>
            <Galeria fotos={e.plantas} alt={`Plantas ${e.nome}`} />
          </div>
        )}

        {e.comodidades && e.comodidades.length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Lazer e estrutura</h2>
            <ul className="empre-amen">
              {e.comodidades.map((a, i) => <li key={i}><span className="det-carac-check">✓</span> {a}</li>)}
            </ul>
          </div>
        )}

        {vid && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Vídeo do empreendimento</h2>
            <div className="empre-video">
              <iframe
                src={`https://www.youtube.com/embed/${vid}`}
                title={`Vídeo ${e.nome}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        )}

        <div className="det-mapa">
          <h2 className="det-rel-titulo">Localização</h2>
          <p className="det-mapa-bairro">
            <IconPin width={18} height={18} />
            {e.endereco ? `${e.endereco}, ${e.bairro}` : `${e.bairro}, Uberlândia — MG`}
          </p>
          <div className="det-mapa-frame det-mapa-frame--wide">
            <iframe
              title={`Mapa ${e.nome}`}
              src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <AviseMe contexto={`${e.bairro || 'Uberlândia'} (${e.construtoraNome})`} />

        <div style={{ marginTop: 40 }}>
          <Link className="btn btn-ghost" to="/lancamentos">
            <IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para lançamentos
          </Link>
        </div>
      </div>
    </main>
  )
}
