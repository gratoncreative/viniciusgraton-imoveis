import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AviseMe from '../components/AviseMe'
import { getEmpreendimento, linkWhatsApp } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin, IconShield, IconBuilding } from '../components/icons'

const ytId = (u = '') => {
  const m = String(u).match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : ''
}

export default function EmpreendimentoDetalhe() {
  const { slug, projeto } = useParams()
  const e = getEmpreendimento(slug, projeto)

  useSEO({
    title: e ? `${e.projeto.nome} — ${e.construtora.nome}, ${e.projeto.bairro || 'Uberlândia'}` : 'Empreendimento não encontrado',
    description: e
      ? `${(e.projeto.descricao || '').slice(0, 150)} Fale com o Vinícius Graton e agende uma visita ao ${e.projeto.nome}, da ${e.construtora.nome}, em Uberlândia.`
      : 'Empreendimento não encontrado.',
    path: `/construtoras/${slug}/${projeto}`,
  })

  if (!e) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Empreendimento não encontrado</h1>
          <Link className="btn btn-gold" to="/construtoras" style={{ marginTop: 20 }}>Ver construtoras <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const { construtora: c, projeto: p } = e
  const fotos = [p.capa, ...(p.galeria || [])].filter(Boolean)
  const wa = `Olá Vinícius! Tenho interesse no empreendimento ${p.nome} (${c.nome}), em ${p.bairro || 'Uberlândia'}. Quero mais informações e agendar uma visita.`
  const vid = ytId(p.video)
  const mapsQuery = encodeURIComponent(`${p.endereco || p.bairro + ', Uberlândia, MG'}`)
  const outros = (c.projetos || []).filter((x) => x.slug !== p.slug)

  return (
    <main className="pagina section--light det empre-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/construtoras">Construtoras</Link> <span>/</span>
          <Link to={`/construtoras/${c.slug}`}> {c.nome}</Link> <span>/</span> <b>{p.nome}</b>
        </nav>

        <div className="det-grid">
          <div className="det-galeria">
            {p.status && <span className="det-tag">{p.status}</span>}
            {fotos.length ? <Galeria fotos={fotos} alt={`${p.nome} — ${c.nome}, Uberlândia`} /> : (
              <div className="empre-semfoto"><IconBuilding width={40} height={40} /><span>Fotos sob consulta</span></div>
            )}
          </div>

          <aside className="det-info">
            <Reveal>
              <p className="det-local"><IconPin width={15} height={15} /> {p.bairro ? `${p.bairro}, ` : ''}Uberlândia{p.entrega ? ` · Entrega ${p.entrega}` : ''}</p>
              <h1 className="det-titulo">{p.nome}</h1>
              <p className="det-subtitulo">Empreendimento {c.nome} — {p.status || 'em Uberlândia'}. {p.endereco}</p>
              {p.preco && <p className="det-preco">{p.preco}</p>}

              <a className="btn btn-gold det-whats" href={linkWhatsApp(wa)} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse — quero visitar
              </a>
              <a className="btn btn-ghost det-visita" href={linkWhatsApp(`Olá Vinícius! Quero detalhes (plantas, valores e condições) do ${p.nome}, da ${c.nome}.`)} target="_blank" rel="noopener">
                Pedir plantas e valores
              </a>

              <div className="det-trust">
                <IconShield width={20} height={20} />
                <p><b>Eu cuido de tudo pra você</b> neste lançamento: informações, visita, plantas, condições e a negociação — do primeiro contato à entrega das chaves. Consultor credenciado da Rotina Imobiliária.</p>
              </div>
            </Reveal>
          </aside>
        </div>

        {p.descricao && (
          <div className="det-sobre">
            <h2 className="det-rel-titulo">Sobre o empreendimento</h2>
            <div className="det-sobre-texto"><p>{p.descricao}</p></div>
          </div>
        )}

        {p.tipologias && p.tipologias.length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Plantas e tipologias</h2>
            <div className="empre-tipos">
              {p.tipologias.map((t, i) => (
                <div className="empre-tipo" key={i}><IconBuilding width={18} height={18} /> <span>{t}</span></div>
              ))}
            </div>
          </div>
        )}

        {p.amenidades && p.amenidades.length > 0 && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Lazer e estrutura</h2>
            <ul className="empre-amen">
              {p.amenidades.map((a, i) => <li key={i}><span className="det-carac-check">✓</span> {a}</li>)}
            </ul>
          </div>
        )}

        {vid && (
          <div className="empre-bloco">
            <h2 className="det-rel-titulo">Vídeo do empreendimento</h2>
            <div className="empre-video"><iframe src={`https://www.youtube.com/embed/${vid}`} title={`Vídeo ${p.nome}`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
          </div>
        )}

        <div className="det-mapa">
          <h2 className="det-rel-titulo">Localização</h2>
          <p className="det-mapa-bairro"><IconPin width={18} height={18} /> {p.endereco || `${p.bairro}, Uberlândia — MG`}</p>
          <div className="det-mapa-frame det-mapa-frame--wide">
            <iframe title={`Mapa ${p.nome}`} src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>

        <AviseMe contexto={`${p.bairro || 'Uberlândia'} (perfil ${c.nome})`} />

        {outros.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Outros lançamentos da {c.nome}</h2>
            <div className="construtora-projs">
              {outros.map((x) => (
                <Link key={x.slug} className="empre-mini" to={`/construtoras/${c.slug}/${x.slug}`}>
                  <div className="empre-mini-capa">{x.capa ? <img src={x.capa} alt={x.nome} loading="lazy" /> : <span className="proj-capa-vazia"><IconBuilding width={26} height={26} /></span>}</div>
                  <div className="empre-mini-txt"><b>{x.nome}</b><span>{x.bairro ? `${x.bairro} · ` : ''}{x.status}</span></div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <Link className="btn btn-ghost" to={`/construtoras/${c.slug}`}><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para {c.nome}</Link>
        </div>
      </div>
    </main>
  )
}
