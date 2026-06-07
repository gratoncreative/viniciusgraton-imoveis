import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AgendarVisita from '../components/AgendarVisita'
import CardImovel from '../components/CardImovel'
import Engajamento from '../components/Engajamento'
import {
  getImovel, fotosDe, formatPreco, formatArea, resumoImovel, subtituloImovel,
  destaquesImovel, ehCondominio, IMOVEIS, linkWhatsApp, waImovel, CONFIG, BAIRROS,
} from '../data'
import { IconWhats, IconArrow, IconPin, IconShield, ICONS } from './../components/icons'

const plural = (n, s, p) => (n > 1 ? p : s)

// quebra a descrição em parágrafos legíveis (~3 frases cada)
function agruparFrases(texto) {
  const limpo = texto.trim()
  if (/\n/.test(limpo)) return limpo.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const frases = limpo.match(/[^.!?]+[.!?]+/g) || [limpo]
  const paras = []
  for (let i = 0; i < frases.length; i += 3) paras.push(frases.slice(i, i + 3).join(' ').trim())
  return paras
}

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

function Destaque({ icon, titulo, sub }) {
  const Icon = ICONS[icon]
  return (
    <div className="det-dest">
      <span className="det-dest-ico">{Icon && <Icon width={24} height={24} />}</span>
      <div>
        <b>{titulo}</b>
        <span>{sub}</span>
      </div>
    </div>
  )
}

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const im = getImovel(codigo)
  const fotos = fotosDe(im)

  useEffect(() => {
    if (im) document.title = `${im.tipo} no ${im.bairro} — ${formatPreco(im.preco)} | ${CONFIG.nome}`
    return () => { document.title = `${CONFIG.marca}` }
  }, [im])

  // Dados estruturados (SEO / rich results no Google)
  useEffect(() => {
    if (!im) return
    const origin = window.location.origin
    const abs = (u) => (u && u.startsWith('http') ? u : origin + u)
    const props = [
      im.quartos > 0 && { '@type': 'PropertyValue', name: 'Quartos', value: im.quartos },
      im.suites > 0 && { '@type': 'PropertyValue', name: 'Suítes', value: im.suites },
      im.banheiros > 0 && { '@type': 'PropertyValue', name: 'Banheiros', value: im.banheiros },
      im.vagas > 0 && { '@type': 'PropertyValue', name: 'Vagas', value: im.vagas },
      im.area > 0 && { '@type': 'PropertyValue', name: 'Área', value: im.area, unitText: 'm²' },
    ].filter(Boolean)
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${im.tipo} no ${im.bairro}, Uberlândia`,
      description: resumoImovel(im),
      image: fotos.map((u) => abs(u.split('?')[0])),
      category: 'Imóvel à venda',
      additionalProperty: props,
      offers: {
        '@type': 'Offer',
        price: im.preco,
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: window.location.href,
        seller: { '@type': 'RealEstateAgent', name: CONFIG.marca, areaServed: 'Uberlândia - MG' },
      },
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-imovel'
    el.text = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { document.getElementById('ld-imovel')?.remove() }
  }, [im, fotos])

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
    im.areaLote > 0 && { icon: 'home', valor: formatArea(im.areaLote), label: 'área do lote' },
  ].filter(Boolean)

  const destaques = destaquesImovel(im)
  const temDescricao = im.descricao && im.descricao.trim().length > 0
  const paragrafos = temDescricao ? agruparFrases(im.descricao.trim()) : []
  const car = im.caracteristicas || {}
  const grupos = [
    { titulo: 'Por dentro do imóvel', itens: car.internas || [] },
    { titulo: 'Estrutura e segurança', itens: car.externas || [] },
    { titulo: 'Lazer e diferenciais', itens: car.extras || [] },
  ].filter((g) => g.itens.length > 0)

  const mapsQuery = encodeURIComponent(`${im.bairro}, ${im.cidade}, MG, Brasil`)
  const bairroInfo = BAIRROS.find((b) => b.nome.toLowerCase() === (im.bairro || '').toLowerCase())
  const prox = []
  if (im.pontoReferencia)
    prox.push({
      icon: 'pin',
      text: im.pontoReferencia,
      sub: 'Ponto de referência próximo que facilita o acesso, encurta deslocamentos do dia a dia e valoriza o endereço.',
    })
  if (im.condominio)
    prox.push({
      icon: 'shield',
      text: im.condominio.replace(/^Cond\.\s*/i, 'Condomínio '),
      sub: 'Estrutura, segurança e áreas de lazer do condomínio agregam conforto, comodidade e valor de revenda ao imóvel.',
    })
  prox.push({
    icon: 'home',
    text: `Bairro ${im.bairro}, ${im.cidade} — ${im.uf}`,
    sub: bairroInfo
      ? bairroInfo.desc
      : `Região consolidada de ${im.cidade}, com boa infraestrutura, comércio por perto e liquidez para uma compra segura.`,
  })

  // "Veja também" por SIMILARIDADE de filtros (mesmo tipo, bairro, faixa de preço,
  // quartos/suítes) — entregamos o mesmo perfil que o lead está olhando.
  const precoRef = im.preco || 0
  const similaridade = (i) => {
    let s = 0
    if (i.tipo === im.tipo) s += 3
    if ((i.bairro || '').toLowerCase() === (im.bairro || '').toLowerCase()) s += 3
    if (precoRef && i.preco && Math.abs(i.preco - precoRef) <= precoRef * 0.3) s += 2
    if ((i.quartos || 0) === (im.quartos || 0)) s += 1
    if ((i.suites || 0) === (im.suites || 0)) s += 1
    return s
  }
  const relacionados = IMOVEIS
    .filter((i) => i.codigo !== im.codigo)
    .map((i) => ({ i, s: similaridade(i) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.i)

  return (
    <main className="section--light det">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <span className="det-tag">{im.tipo}</span>
            <Galeria fotos={fotos} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} />
          </div>

          {/* Painel de info */}
          <aside className="det-info">
            <Reveal>
              <p className="det-local"><IconPin width={15} height={15} /> {im.cidade} — {im.uf} · Cód. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-subtitulo">{subtituloImovel(im)}</p>
              <p className="det-preco">{formatPreco(im.preco)}</p>

              <div className="det-specs">
                {specs.map((s, i) => <Spec key={i} {...s} />)}
              </div>

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse neste imóvel
              </a>
              <AgendarVisita im={im} />
              <div className="det-engaj">
                <Engajamento im={im} variante="detalhe" />
                <span className="det-engaj-dica">Curta e compartilhe com quem vai amar este imóvel</span>
              </div>

              <div className="det-trust">
                <IconShield width={20} height={20} />
                <p><b>Atendimento direto comigo</b>, do primeiro contato à entrega das chaves. Te ajudo na visita, na negociação e em toda a documentação — compra segura e sem dor de cabeça.</p>
              </div>
            </Reveal>
          </aside>
        </div>

        {/* Destaques (benefícios) */}
        {destaques.length > 0 && (
          <div className="det-destaques">
            <h2 className="det-rel-titulo">Por que você vai gostar</h2>
            <div className="det-dest-grid">
              {destaques.map((d, i) => <Destaque key={i} {...d} />)}
            </div>
          </div>
        )}

        {/* Sobre o imóvel (descrição real da fonte) */}
        {temDescricao && (
          <div className="det-sobre">
            <h2 className="det-rel-titulo">Sobre o imóvel</h2>
            <div className="det-sobre-texto">
              {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <a className="btn btn-gold det-sobre-cta" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
              <IconWhats /> Quero saber mais sobre este imóvel
            </a>
          </div>
        )}

        {grupos.length > 0 && (
          <div className="det-carac">
            <h2 className="det-rel-titulo">Características e comodidades</h2>
            {im.condominio && (
              <p className="det-carac-cond"><IconShield width={16} height={16} /> {im.condominio.replace(/^Cond\.\s*/i, 'Condomínio ')}</p>
            )}
            <div className="det-carac-grupos">
              {grupos.map((g, gi) => (
                <div className="det-carac-grupo" key={gi}>
                  <h3>{g.titulo}</h3>
                  <ul className="det-carac-lista">
                    {g.itens.map((it, ii) => <li key={ii}><span className="det-carac-check">✓</span> {it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="det-mapa">
          <h2 className="det-rel-titulo">Localização e proximidades</h2>
          <p className="det-mapa-bairro"><IconPin width={18} height={18} /> {im.bairro}, {im.cidade} — {im.uf}</p>
          <div className="det-mapa-grid">
            <figure className="det-mapa-col">
              <div className="det-mapa-frame">
                <iframe
                  title={`Mapa do bairro ${im.bairro}`}
                  src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a className="det-mapa-ampliar" href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener">
                ⛶ Ampliar e explorar a região no Google Maps
              </a>
            </figure>
            <div className="det-mapa-prox">
              <h3>O que valoriza este endereço</h3>
              <ul className="det-prox-lista">
                {prox.map((p, i) => {
                  const I = ICONS[p.icon]
                  return (
                    <li key={i}>
                      {I && <span className="det-prox-ico"><I width={18} height={18} /></span>}
                      <div className="det-prox-txt">
                        <b>{p.text}</b>
                        {p.sub && <span>{p.sub}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="det-mapa-aviso">Localização aproximada do bairro — o mapa mostra escolas, comércio e serviços ao redor. O endereço exato é informado no atendimento.</p>
            </div>
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="det-rel">
            <h2 className="det-rel-titulo">Veja também</h2>
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {relacionados.map((r) => <CardImovel key={r.codigo} im={r} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <Link className="btn btn-ghost" to="/imoveis"><IconArrow style={{ transform: 'rotate(180deg)' }} /> Voltar para o catálogo</Link>
        </div>
      </div>
    </main>
  )
}
