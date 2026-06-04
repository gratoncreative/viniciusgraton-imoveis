import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { getImovel, fotosDe, formatPreco, formatArea, linkWhatsApp, waImovel, CONFIG } from '../data'
import { IconWhats, IconArrow, ICONS } from './../components/icons'

const plural = (n, s, p) => (n > 1 ? p : s)

function Spec({ icon, valor, label }) {
  const Icon = ICONS[icon]
  return (
    <div className="det-spec">
      {Icon && <span className="det-spec-ico"><Icon width={22} height={22} /></span>}
      <div>
        <b>{valor}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const im = getImovel(codigo)
  const fotos = fotosDe(im)
  const [ativa, setAtiva] = useState(0)

  useEffect(() => {
    if (im) document.title = `${im.tipo} no ${im.bairro} — ${formatPreco(im.preco)} | ${CONFIG.nome}`
    return () => { document.title = `${CONFIG.marca}` }
  }, [im])

  if (!im) {
    return (
      <main className="section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Imóvel não encontrado</h1>
          <p className="section-sub" style={{ margin: '12px 0 28px' }}>
            Esse imóvel pode ter sido vendido ou saído do catálogo.
          </p>
          <Link className="btn btn-gold" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: 'área interna' },
  ].filter(Boolean)

  return (
    <main className="section--light det">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <div className="det-foto">
              <img src={fotos[ativa]} alt={`${im.tipo} no ${im.bairro}`} />
              <span className="det-tag">{im.tipo}</span>
            </div>
            {fotos.length > 1 && (
              <div className="det-thumbs">
                {fotos.map((src, i) => (
                  <button
                    key={i}
                    className={`det-thumb ${i === ativa ? 'on' : ''}`}
                    onClick={() => setAtiva(i)}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Painel de info */}
          <aside className="det-info">
            <Reveal>
              <p className="det-local">{im.cidade} — {im.uf} · Cód. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-preco">{formatPreco(im.preco)}</p>

              <div className="det-specs">
                {specs.map((s, i) => <Spec key={i} {...s} />)}
              </div>

              <p className="det-desc">
                {im.tipo} à venda no bairro {im.bairro}, em {im.cidade}.{' '}
                {[
                  im.quartos > 0 && `${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}`,
                  im.suites > 0 && `${im.suites} ${plural(im.suites, 'suíte', 'suítes')}`,
                  im.vagas > 0 && `${im.vagas} ${plural(im.vagas, 'vaga de garagem', 'vagas de garagem')}`,
                  im.area > 0 && `${formatArea(im.area)} de área`,
                ].filter(Boolean).join(', ')}
                . Quer agendar uma visita ou tirar dúvidas? Fale comigo agora mesmo.
              </p>

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse neste imóvel
              </a>
              <a
                className="btn btn-ghost det-visita"
                href={linkWhatsApp(`Olá Vinícius! Quero agendar uma visita ao imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}).`)}
                target="_blank"
                rel="noopener"
              >
                Agendar uma visita
              </a>

              <p className="det-aviso">
                Valores e disponibilidade sujeitos a confirmação. Atendimento direto comigo, do
                primeiro contato à entrega das chaves.
              </p>
            </Reveal>
          </aside>
        </div>

        <div style={{ marginTop: 48 }}>
          <Link className="btn btn-ghost" to="/imoveis"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para o catálogo</Link>
        </div>
      </div>
    </main>
  )
}
