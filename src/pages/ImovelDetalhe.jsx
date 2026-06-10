import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Galeria from '../components/Galeria'
import AgendarVisita from '../components/AgendarVisita'
import CardImovel from '../components/CardImovel'
import Engajamento from '../components/Engajamento'
import PrecoGate from '../components/PrecoGate'
import PerguntasImovel from '../components/PerguntasImovel'
import {
  getImovel, fotosDe, formatPreco, formatArea, resumoImovel, subtituloImovel,
  destaquesImovel, ehCondominio, IMOVEIS, linkWhatsApp, waImovel, CONFIG, BAIRROS, oportunidade,
} from '../data'
import { IconWhats, IconArrow, IconPin, IconShield, ICONS } from './../components/icons'

const plural = (n, s, p) => (n > 1 ? p : s)

// URL de vídeo "assistível" (extrai o ID do YouTube e monta /watch)
const ytWatch = (u) => { const m = String(u || '').match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/); return m ? `https://www.youtube.com/watch?v=${m[1]}` : u }

// Apresentação PERSUASIVA e única por imóvel (gatilhos mentais), variando por código
function apresentacao(im) {
  const t = im.tipo || 'imóvel'
  const tl = t.toLowerCase()
  const b = im.bairro || 'Uberlândia'
  const seed = [...String(im.codigo)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, o = 0) => arr[(seed + o) % arr.length]
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(t)
  const op = oportunidade(im)
  const extras = []
  if (im.suites) extras.push(`${im.suites} suíte${im.suites > 1 ? 's' : ''}`)
  if (im.vagas >= 2) extras.push(`${im.vagas} vagas`)
  if (ehApto && im.elevador) extras.push('elevador')
  ;(im.amenidades || []).slice(0, 2).forEach((a) => extras.push(String(a).toLowerCase()))

  const abre = pick([
    `Se você procura um ${tl} no ${b} que une boa localização, conforto e um negócio que vale a pena, esse merece a sua atenção.`,
    `Imóvel bom no ${b} não fica muito tempo no mercado — e esse ${tl} reúne o que mais pesa na hora de comprar bem.`,
    `Esse ${tl} no ${b} foi feito pra quem quer morar bem, sem abrir mão de praticidade, espaço e segurança.`,
  ])
  const corpo = `São ${[im.area && `${im.area} m²`, im.quartos && `${im.quartos} quartos`, ...extras].filter(Boolean).join(', ')}${im.condominio ? `, com condomínio organizado` : ''} — espaço e conforto pensados pra sua rotina.`
  const valor = op.abaixoMercado
    ? `E olha que oportunidade: pelo preço do metro quadrado no ${b}, ele está abaixo da média da região — chance real de comprar bem e ainda valorizar.`
    : pick([
      `Pelo padrão e pela localização, é o tipo de imóvel que mantém valor e tem boa liquidez na hora de revender.`,
      `Comprar no ${b} é decisão segura: região consolidada, procurada e com tendência de valorização.`,
    ], 1)
  const fecha = pick([
    `Quer ver de perto? Eu te acompanho na visita, esclareço tudo e cuido da documentação e do financiamento. Me chama no WhatsApp que a gente agenda.`,
    `Posso te mostrar pessoalmente e simular o financiamento com você — atendimento direto, do primeiro contato à entrega das chaves. É só chamar.`,
  ], 2)
  // destaques REAIS do imóvel (preenchem a apresentação de forma verdadeira)
  const ehTerreo = ehApto && (Number(im.andar) === 0)
  const destaques = [
    im.area && `${im.area} m² de área`,
    im.quartos && `${im.quartos} ${im.quartos > 1 ? 'quartos' : 'quarto'}${im.suites ? ` (sendo ${im.suites} suíte${im.suites > 1 ? 's' : ''})` : ''}`,
    im.banheiros && `${im.banheiros} banheiro${im.banheiros > 1 ? 's' : ''}`,
    im.vagas && `${im.vagas} vaga${im.vagas > 1 ? 's' : ''} de garagem`,
    ehApto && (im.andar != null && im.andar !== '') && (ehTerreo ? 'Térreo' : `${im.andar}º andar`),
    ehApto && typeof im.elevador === 'boolean' && (im.elevador ? 'Prédio com elevador' : 'Prédio sem elevador'),
    im.condominio && `Condomínio de ${formatPreco(im.condominio)}`,
    ...(im.amenidades || []),
    op.abaixoMercado && 'Preço abaixo da média do m² do bairro',
    `Localização no ${b}, ${im.cidade || 'Uberlândia'} — MG`,
  ].filter(Boolean)
  return { paras: [abre, corpo, valor, fecha], destaques }
}

// converte o imóvel vindo da API da Rotina (/api/rotina-imovel) para o formato do site
function mapApi(a) {
  return {
    codigo: String(a.codigo), tipo: a.tipo || '', bairro: a.bairro || '', cidade: a.cidade || 'Uberlândia', uf: a.estado || 'MG',
    finalidade: a.operacao === 'locação' ? 'Locação' : 'Venda',
    preco: a.valorNum || 0, condominio: a.condominio || 0,
    quartos: a.quartos || 0, suites: a.suites || 0, banheiros: a.banheiros || 0, vagas: a.vagas || 0,
    area: a.areaNum || 0, andar: a.andar, elevador: a.elevador,
    descricao: a.descricao || '', endereco: a.rua || '',
    img: a.foto || (a.fotos && a.fotos[0]) || '',
    fotos: a.fotos && a.fotos.length ? a.fotos : (a.foto ? [a.foto] : []),
    video: a.video || '', tour360: a.tour360 || '',
    externo: true,
  }
}

// condomínio pode vir como número (ex.: 325) ou texto (ex.: "Cond. R$ 325,00") — trata os dois
const condominioTxt = (c) => {
  if (c == null || c === '' || c === 0) return ''
  if (typeof c === 'number') return 'Condomínio ' + formatPreco(c)
  return String(c).replace(/^Cond\.\s*/i, 'Condomínio ')
}

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

// mensagens descontraídas que giram enquanto o imóvel carrega
const MSG_LOAD = [
  'Pegando as chaves desse imóvel… 🔑',
  'Separando as melhores fotos pra você…',
  'Já tá quase abrindo a porta…',
  'Conferindo cada detalhe pra você…',
]

export default function ImovelDetalhe() {
  const { codigo } = useParams()
  const local = getImovel(codigo)
  const [imApi, setImApi] = useState(null)
  const [feed, setFeed] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  // base completa (espelho) — mostra o imóvel NA HORA, sem esperar a API/galeria
  useEffect(() => {
    let vivo = true
    fetch('/catalogo.json').then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && Array.isArray(d.imoveis)) setFeed(d.imoveis) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  const feedItem = useMemo(() => feed.find((i) => String(i.codigo) === String(codigo)) || null, [feed, codigo])

  // dados completos (galeria, 360, mapa) vêm da API — com timeout de 9s pra nunca travar
  useEffect(() => {
    if (local) { setImApi(null); return }
    let vivo = true
    setBuscando(true)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(codigo)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j && j.imovel) setImApi(mapApi(j.imovel)) })
      .catch(() => {})
      .finally(() => { clearTimeout(t); if (vivo) setBuscando(false) })
    return () => { vivo = false; clearTimeout(t); ctrl.abort() }
  }, [codigo, local, tentativa])

  // mostra o feed na hora; quando a API completa chega, troca pela versão completa
  const im = local || imApi || feedItem

  // se NADA carregou ainda, tenta de novo sozinho a cada 5s (até 3x) — nunca fica preso
  useEffect(() => {
    if (im || tentativa >= 3) return
    const t = setTimeout(() => setTentativa((n) => n + 1), 5000)
    return () => clearTimeout(t)
  }, [im, tentativa])

  // mensagem descontraída girando enquanto carrega
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    if (im) return
    const t = setInterval(() => setMsgIdx((n) => n + 1), 2600)
    return () => clearInterval(t)
  }, [im])

  const fotos = fotosDe(im)

  useEffect(() => {
    if (im) document.title = `${im.tipo} no ${im.bairro} — ${formatPreco(im.preco)} | ${CONFIG.nome}`
    return () => { document.title = `${CONFIG.marca}` }
  }, [im])

  // registra a visita no histórico do cliente (área do cliente / recomendações)
  useEffect(() => { if (im) { import('../conta').then((m) => m.registrarVisita(im.codigo)) } }, [im])

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
    if (buscando || tentativa < 3) {
      return (
        <main className="section--light det-vazio">
          <div className="container det-carregando">
            <div className="det-load-casa" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5" /></svg>
              <span className="det-load-anel" />
            </div>
            <p className="det-load-msg">{MSG_LOAD[msgIdx % MSG_LOAD.length]}</p>
            <p className="det-load-sub">Se a internet estiver lenta, a gente tenta de novo sozinho em alguns segundos. 😉</p>
          </div>
        </main>
      )
    }
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

  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(im.tipo || '')
  const temAndar = im.andar !== undefined && im.andar !== null && im.andar !== ''
  const terreo = im.andar === 0 || im.andar === '0' || /t[eé]rreo/i.test(String(im.andar))
  const specs = [
    im.quartos > 0 && { icon: 'bed', valor: im.quartos, label: plural(im.quartos, 'quarto', 'quartos') },
    im.suites > 0 && { icon: 'sparkle', valor: im.suites, label: plural(im.suites, 'suíte', 'suítes') },
    im.banheiros > 0 && { icon: 'bath', valor: im.banheiros, label: plural(im.banheiros, 'banheiro', 'banheiros') },
    im.vagas > 0 && { icon: 'car', valor: im.vagas, label: plural(im.vagas, 'vaga', 'vagas') },
    im.area > 0 && { icon: 'area', valor: formatArea(im.area), label: 'área interna' },
    im.areaLote > 0 && { icon: 'home', valor: formatArea(im.areaLote), label: 'área do lote' },
    ehApto && temAndar && { icon: 'floor', valor: terreo ? 'Térreo' : `${im.andar}º`, label: terreo ? 'andar' : 'andar' },
    ehApto && typeof im.elevador === 'boolean' && { icon: 'elevator', valor: im.elevador ? 'Com' : 'Sem', label: 'elevador' },
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
      text: condominioTxt(im.condominio),
      sub: 'Estrutura, segurança e áreas de lazer do condomínio agregam conforto, comodidade e valor de revenda ao imóvel.',
    })
  prox.push({
    icon: 'home',
    text: `Bairro ${im.bairro}, ${im.cidade} — ${im.uf}`,
    sub: bairroInfo
      ? bairroInfo.desc
      : `Região consolidada de ${im.cidade}, com boa infraestrutura, comércio por perto e liquidez para uma compra segura.`,
  })
  // Vantagens que sempre valorizam o imóvel (garantimos no mínimo 6 no total)
  prox.push(
    { icon: 'pin', text: 'Comércio e serviços por perto', sub: 'Mercados, farmácias, padarias e comércio do dia a dia no entorno — praticidade para a rotina da família.' },
    { icon: 'home', text: 'Escolas e saúde na região', sub: 'Opções de ensino e atendimento de saúde acessíveis a poucos minutos do imóvel.' },
    { icon: 'pin', text: 'Boas vias de acesso', sub: `Deslocamento facilitado ao centro e às principais avenidas de ${im.cidade}, com transporte público por perto.` },
    { icon: 'shield', text: 'Financiável e com uso do FGTS', sub: 'Imóvel residencial que facilita o financiamento bancário e o uso do FGTS — amplia o público comprador e a velocidade de venda.' },
    { icon: 'home', text: 'Liquidez e valorização', sub: 'Região de boa procura e tendência de valorização — mais segurança na compra hoje e na revenda amanhã.' },
  )

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
    <main className="section--light det imovel-pg">
      <div className="container">
        <nav className="det-bread">
          <Link to="/">Início</Link> <span>/</span> <Link to="/imoveis">Imóveis</Link> <span>/</span> <b>{im.bairro}</b>
        </nav>

        <div className="det-grid">
          {/* Galeria */}
          <div className="det-galeria">
            <span className="det-tag">{im.tipo}</span>
            <Galeria fotos={fotos} alt={`${im.tipo} no ${im.bairro}, Uberlândia`} />
            {(() => { const ap = apresentacao(im); return (
              <div className="det-apresenta">
                <h2 className="det-apresenta-tit">Por que esse imóvel vale a sua visita</h2>
                {ap.paras.map((p, i) => <p key={i}>{p}</p>)}
                <span className="det-apre-sub">Destaques deste imóvel</span>
                <ul className="det-apre-destaques">
                  {ap.destaques.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
                {temDescricao && (
                  <>
                    <span className="det-apre-sub">Descrição do imóvel</span>
                    <div className="det-apre-desc">
                      {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  </>
                )}
              </div>
            ) })()}
          </div>

          {/* Painel de info */}
          <aside className="det-info">
            <Reveal>
              <p className="det-local"><IconPin width={15} height={15} /> {im.cidade} — {im.uf} · Cód. {im.codigo}</p>
              <h1 className="det-titulo">{im.tipo} no {im.bairro}</h1>
              <p className="det-subtitulo">{subtituloImovel(im)}</p>
              {im.impulsionado && (
                <Link to="/impulsionar" className="det-pub">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7" /></svg>
                  <span><b>Publicidade</b> · anúncio impulsionado em destaque. Você também pode impulsionar o seu →</span>
                </Link>
              )}
              {(() => { const op = oportunidade(im); return (op.temDesconto || op.abaixoMercado) ? (
                <div className="det-selos">
                  {op.temDesconto && <span className="im-selo im-selo--off">Preço reduzido · -{op.pctDesconto}%</span>}
                  {op.abaixoMercado && <span className="im-selo im-selo--mercado">Abaixo do m² do bairro</span>}
                </div>
              ) : null })()}
              <PrecoGate valor={im.preco} anterior={im.precoAnterior} className="det-preco" tipo="detalhe" />

              <div className="det-specs">
                {specs.map((s, i) => <Spec key={i} {...s} />)}
              </div>

              <a className="btn btn-gold det-whats" href={linkWhatsApp(waImovel(im))} target="_blank" rel="noopener">
                <IconWhats /> Tenho interesse neste imóvel
              </a>
              <AgendarVisita im={im} />

              {(() => {
                // ignora o vídeo publicitário genérico da Rotina (não é o vídeo do imóvel)
                const videoOk = im.video && !/NnAmly9Gb9s/.test(im.video) ? im.video : ''
                return (videoOk || im.tour360) && (
                  <div className="det-tour">
                    <span className="det-tour-tit">Visita virtual</span>
                    <div className="det-tour-btns">
                      {im.tour360 && <a className="det-tour-b" href={im.tour360} target="_blank" rel="noopener"><span aria-hidden="true">🔄</span> Tour 360°</a>}
                      {videoOk && <a className="det-tour-b" href={ytWatch(videoOk)} target="_blank" rel="noopener"><span aria-hidden="true">▶</span> Ver vídeo do imóvel</a>}
                    </div>
                  </div>
                )
              })()}

              <PerguntasImovel im={im} />

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

        {grupos.length > 0 && (
          <div className="det-carac">
            <h2 className="det-rel-titulo">Características e comodidades</h2>
            {im.condominio && (
              <p className="det-carac-cond"><IconShield width={16} height={16} /> {condominioTxt(im.condominio)}</p>
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
