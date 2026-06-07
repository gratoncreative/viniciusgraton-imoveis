import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import AviseMe from '../components/AviseMe'
import { getBairroSeo, imoveisDoBairro, BAIRROS_SEO, linkWhatsApp } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconPin } from '../components/icons'

export default function Bairro() {
  const { bairro: slug } = useParams()
  const b = getBairroSeo(slug)

  useSEO({
    title: b ? `Imóveis à venda em ${b.nome}, Uberlândia` : 'Bairro não encontrado',
    description: b
      ? `${b.desc} Casas e apartamentos à venda em ${b.nome}, Uberlândia, com Vinícius Graton — consultor credenciado da Rotina Imobiliária.`
      : 'Bairro não encontrado.',
    path: `/imoveis/uberlandia/${slug || ''}`,
  })

  if (!b) {
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

  const lista = imoveisDoBairro(b.nome)
  const outros = BAIRROS_SEO.filter((x) => x.slug !== b.slug)

  return (
    <main className="pagina bairro-pg">
      <header className="construtora-hero">
        <div className="container">
          <nav className="det-bread">
            <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{b.nome}</b>
          </nav>
          <span className="eyebrow"><IconPin width={14} height={14} /> Uberlândia</span>
          <h1 className="section-title">Imóveis à venda em <em>{b.nome}</em></h1>
          <p className="construtora-desc">{b.desc}</p>
          <div className="construtora-hero-acoes">
            <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Quero ver imóveis à venda em ${b.nome}, Uberlândia.`)} target="_blank" rel="noopener">
              <IconWhats /> Quero opções em {b.nome}
            </a>
            <Link className="btn btn-ghost" to={`/imoveis?bairro=${encodeURIComponent(b.nome)}`}>Ver no catálogo <IconArrow /></Link>
          </div>
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          {lista.length ? (
            <>
              <h2 className="det-rel-titulo">{lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'} em {b.nome}</h2>
              <div className="im-grid" style={{ perspective: '1400px' }}>
                {lista.map((im, i) => (
                  <Reveal key={im.codigo} delay={(i % 3) * 0.06}><CardImovel im={im} /></Reveal>
                ))}
              </div>
            </>
          ) : (
            <div className="cat-vazio">
              <p>Ainda não tenho um imóvel publicado em {b.nome} — mas tenho acesso a muito mais opções na região. Me conta o que você procura.</p>
              <a className="btn btn-gold" href={linkWhatsApp(`Olá Vinícius! Procuro imóvel em ${b.nome}, Uberlândia. Pode me ajudar?`)} target="_blank" rel="noopener">
                <IconWhats /> Me conta o que você procura
              </a>
            </div>
          )}
          <AviseMe contexto={b.nome} />
        </div>
      </section>

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
