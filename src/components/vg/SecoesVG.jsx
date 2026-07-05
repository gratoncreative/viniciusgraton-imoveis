import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BAIRROS_IMOVEL, DEPOIMENTOS, linkWhatsApp } from '../../data'
import { PASSOS_VG, DEPOIMENTOS_VG } from './vgData'

const TIPOS_BUSCA = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura']

// ============================ HERO ============================
export function HeroVG() {
  const nav = useNavigate()
  const [bairro, setBairro] = useState('')
  const [tipo, setTipo] = useState('')
  const [max, setMax] = useState('')

  const buscar = () => {
    const p = new URLSearchParams()
    if (bairro) p.set('bairro', bairro)
    if (tipo) p.set('tipo', tipo)
    if (max === 'acima') p.set('precoMin', '2000000')
    else if (max) p.set('precoMax', max)
    const q = p.toString()
    nav('/imoveis' + (q ? '?' + q : ''))
  }

  return (
    <section className="vgx-hero vgx-reveal">
      <div className="vgx-hero-media">
        <div className="vgx-hero-photo" />
        <div className="vgx-hero-sheen" />
      </div>
      <div className="vgx-hero-scrim" />
      <div className="vgx-hero-grid" />
      <div className="vgx-hero-inner">
        <span className="vgx-seal" style={{ width: 62, height: 62, borderRadius: 16, marginBottom: 4 }}>
          <b style={{ fontSize: 27 }}>VG</b><i />
        </span>
        <span className="vgx-hero-eyebrow">Consultoria de imóveis em Uberlândia</span>
        <h1>Compre seu imóvel sem medo de errar</h1>
        <p className="vgx-hero-sub">Curadoria pessoal do primeiro contato à entrega das chaves. Especialista em alto padrão, do imóvel de entrada à casa definitiva, com a segurança de quem conhece cada bairro de Uberlândia.</p>
        <div className="vgx-busca">
          <select value={bairro} onChange={(e) => setBairro(e.target.value)} aria-label="Bairro">
            <option value="">Todos os bairros</option>
            {BAIRROS_IMOVEL.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de imóvel">
            <option value="">Todos os tipos</option>
            {TIPOS_BUSCA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={max} onChange={(e) => setMax(e.target.value)} aria-label="Valor máximo">
            <option value="">Qualquer valor</option>
            <option value="500000">Até R$ 500 mil</option>
            <option value="1000000">Até R$ 1 milhão</option>
            <option value="2000000">Até R$ 2 milhões</option>
            <option value="acima">Acima de R$ 2 milhões</option>
          </select>
          <button onClick={buscar}>Buscar imóveis</button>
        </div>
        <span className="vgx-hero-coords">18°55'S · 48°17'W · UBERLÂNDIA MG · EM PARCERIA COM A ROTINA IMOBILIÁRIA</span>
      </div>
    </section>
  )
}

// ============================ CARD DE IMÓVEL ============================
export function CardVG({ vm }) {
  return (
    <Link to={vm.href} className="vgx-card">
      <div className="vgx-card-media">
        <img src={vm.img} alt={`${vm.titulo} no ${vm.bairro}, Uberlândia`} loading="lazy" decoding="async" />
        <span className="vgx-card-tag">{vm.tag}</span>
        <span className="vgx-card-ref">{vm.ref}</span>
      </div>
      <div className="vgx-card-body">
        <span className="vgx-card-bairro">{vm.bairroCaps}</span>
        <h3 className="vgx-card-tit">{vm.titulo}</h3>
        <span className="vgx-card-specs">{vm.specs}</span>
        <div className="vgx-card-foot">
          <span className="vgx-card-preco">{vm.precoFmt}</span>
          <span className="vgx-card-cta">Ver imóvel →</span>
        </div>
      </div>
    </Link>
  )
}

// ============================ COLEÇÃO ALTO PADRÃO ============================
export function ColecaoVG({ feature, mini }) {
  if (!feature) return null
  return (
    <section className="vgx-section-navy vgx-reveal">
      <div className="vgx-goldgrid" />
      <div className="vgx-colecao">
        <div className="vgx-colecao-head">
          <div className="vgx-headcol">
            <span className="vgx-kicker vgx-kicker--gold">01 · Coleção alto padrão</span>
            <h2>As casas e coberturas mais desejadas de Uberlândia</h2>
            <p>Unidades selecionadas a dedo, muitas fora dos portais. Visitas reservadas, negociação discreta e análise técnica completa antes de qualquer proposta.</p>
          </div>
          <Link to="/imoveis?precoMin=1000000" className="vgx-btn-outline">Ver a coleção completa</Link>
        </div>
        <div className="vgx-colecao-grid">
          <Link to={feature.href} className="vgx-ctile vgx-ctile--feature">
            <img src={feature.img} alt={feature.titulo} loading="lazy" />
            <div className="vgx-ctile-grad" />
            <div className="vgx-ctile-body">
              <span className="vgx-ctile-meta">{feature.ref} · {feature.bairro} · {feature.specs}</span>
              <span className="vgx-ctile-tit">{feature.titulo}</span>
              <span className="vgx-ctile-preco">{feature.precoFmt}</span>
            </div>
          </Link>
          <div className="vgx-colecao-mini">
            {mini.map((im) => (
              <Link key={im.im.codigo} to={im.href} className="vgx-ctile vgx-ctile--mini">
                <img src={im.img} alt={im.titulo} loading="lazy" />
                <div className="vgx-ctile-grad" />
                <div className="vgx-ctile-body">
                  <span className="vgx-ctile-meta">{im.bairro} · {im.ref}</span>
                  <span className="vgx-ctile-tit">{im.titulo}</span>
                  <span className="vgx-ctile-preco">{im.precoFmt}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================ DESTAQUES ============================
export function DestaquesVG({ destaques }) {
  if (!destaques || !destaques.length) return null
  return (
    <section className="vgx-secao vgx-reveal">
      <div className="vgx-secao-head">
        <div className="vgx-headcol">
          <span className="vgx-kicker vgx-kicker--golddark">02 · Curadoria da semana</span>
          <h2 className="vgx-h2">Imóveis em destaque</h2>
        </div>
        <Link to="/imoveis" className="vgx-link-gold">Ver todos os imóveis</Link>
      </div>
      <div className="vgx-cards">
        {destaques.map((vm) => <CardVG key={vm.im.codigo} vm={vm} />)}
      </div>
    </section>
  )
}

// ============================ COMO FUNCIONA ============================
export function ComoFuncionaVG() {
  return (
    <section className="vgx-secao vgx-reveal">
      <div className="vgx-secao-center">
        <span className="vgx-kicker vgx-kicker--golddark">03 · Como funciona</span>
        <h2 className="vgx-h2">Um caminho seguro até as chaves</h2>
        <p>Você não precisa entender de mercado imobiliário. Precisa de alguém que entenda por você.</p>
      </div>
      <div className="vgx-passos">
        {PASSOS_VG.map((p) => (
          <div key={p.num} className="vgx-passo">
            <span className="vgx-passo-num">{p.num}</span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================ QUEM TE ATENDE ============================
export function QuemAtendeVG() {
  const wa = linkWhatsApp('Olá Vinícius! Quero agendar uma conversa sobre imóveis em Uberlândia.')
  return (
    <section className="vgx-atende vgx-reveal">
      <div className="vgx-atende-inner">
        <div className="vgx-atende-foto">
          <span className="vgx-frame" />
          <img src="/vinicius-graton.jpg" alt="Vinícius Graton, consultor de imóveis em Uberlândia" loading="lazy" />
        </div>
        <div className="vgx-atende-col">
          <span className="vgx-kicker vgx-kicker--gold">04 · Quem te atende</span>
          <h2>Vinícius Graton, seu consultor em Uberlândia</h2>
          <p>Comprar um imóvel é uma das maiores decisões da vida, e você não deveria tomá-la sozinho. O Vinícius atende cada cliente pessoalmente: entende o momento da sua família, seleciona só o que faz sentido e acompanha visita, proposta, financiamento e escritura até a entrega das chaves.</p>
          <p>O trabalho é feito em parceria com a Rotina Imobiliária, o que garante acesso à carteira completa de imóveis da cidade e segurança jurídica em cada etapa.</p>
          <div className="vgx-stats">
            <div className="vgx-stat"><b>Atendimento pessoal</b><span>você fala direto com o Vinícius</span></div>
            <div className="vgx-stat"><b>Carteira completa</b><span>todos os imóveis da Rotina Imobiliária</span></div>
            <div className="vgx-stat"><b>Do início ao fim</b><span>da primeira visita às chaves na mão</span></div>
          </div>
          <div className="vgx-atende-cta">
            <Link to="/sobre" className="vgx-btn-outline">Conhecer o Vinícius</Link>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">Agendar uma conversa</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================ DEPOIMENTOS (só reais) ============================
export function DepoimentosVG() {
  const reais = (DEPOIMENTOS || []).filter((d) => d && d.texto && d.nome)
  const lista = reais.length ? reais : DEPOIMENTOS_VG
  if (!lista.length) return null
  return (
    <section className="vgx-secao vgx-reveal">
      <div className="vgx-secao-center">
        <span className="vgx-kicker vgx-kicker--golddark">05 · Quem já comprou</span>
        <h2 className="vgx-h2">Histórias de quem chegou às chaves</h2>
      </div>
      <div className="vgx-depos">
        {lista.map((d, i) => (
          <figure key={i} className="vgx-depo">
            <span className="vgx-depo-quote">“</span>
            <blockquote>{d.texto}</blockquote>
            <figcaption>
              <b>{d.nome}</b>
              {d.contexto && <span>{d.contexto}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

// ============================ QUER VENDER ============================
export function QuerVenderVG() {
  return (
    <section className="vgx-vender vgx-reveal">
      <div className="vgx-vender-band">
        <div className="vgx-vender-col">
          <span className="vgx-kicker vgx-kicker--gold">07 · Para proprietários</span>
          <h2>Quer vender seu imóvel pelo preço certo?</h2>
          <p>Avaliação criteriosa, fotos profissionais e anúncio para os compradores certos, com a estrutura da Rotina Imobiliária por trás.</p>
        </div>
        <Link to="/anunciar" className="vgx-btn-red">Anunciar meu imóvel</Link>
      </div>
    </section>
  )
}

// ============================ BLOG ============================
export function BlogVG() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    fetch('/blog-preview.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPosts(Array.isArray(d) ? d : []))
      .catch(() => setPosts([]))
  }, [])

  if (!posts || !posts.length) return null
  const latest = [...posts]
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
    .slice(0, 3)

  const fmtData = (s) => {
    if (!s) return ''
    const d = new Date(s)
    if (isNaN(d)) return ''
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  return (
    <section className="vgx-blog vgx-reveal">
      <div className="vgx-secao-head">
        <div className="vgx-headcol">
          <span className="vgx-kicker vgx-kicker--golddark">08 · Blog</span>
          <h2 className="vgx-h2">Para decidir com segurança</h2>
        </div>
        <Link to="/blog" className="vgx-link-gold">Ver todos os artigos</Link>
      </div>
      <div className="vgx-posts">
        {latest.map((p) => {
          const data = fmtData(p.data)
          return (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="vgx-post">
              {p.capa
                ? <img className="vgx-post-img" src={p.capa} alt={p.titulo} loading="lazy" />
                : <div className="vgx-post-img" />}
              <div className="vgx-post-body">
                <span className="vgx-post-meta">{p.categoria}{data ? ' · ' + data : ''}</span>
                <h3>{p.titulo}</h3>
                {p.resumo && <p>{p.resumo}</p>}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
