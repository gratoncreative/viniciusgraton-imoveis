import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import {
  IMOVEIS, getImovel, fotosDe, formatArea, resumoImovel, vantagensImovel,
  linkWhatsApp, aplicarOverrideEmUm,
} from '../data'
import { precoCompacto, tituloCard, cardVM, m2DoBairro, SPEC_ICONS, tagDe } from '../components/vg/vgData'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { CardVG } from '../components/vg/SecoesVG'
import { onImgError } from '../img'

const plural = (n, s, p) => (n > 1 ? p : s)
const ehTerreno = (im) => /terreno|lote|chácar|chacar/i.test(im?.tipo || '')

// Ícone de linha dourado (traçado do design)
function SpecIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#b08e45"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function ImovelVG() {
  const { codigo } = useParams()
  const local = getImovel(codigo)

  // Resolve o imóvel: pacote local → catalogo.json (carteira completa) → override do painel.
  const [imFeed, setImFeed] = useState(null)
  const [ov, setOv] = useState(null)
  const [buscando, setBuscando] = useState(!local)

  useEffect(() => {
    if (local) return
    let vivo = true
    setBuscando(true)
    fetch('/catalogo.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return
        const lista = Array.isArray(d) ? d : d?.imoveis || []
        setImFeed(lista.find((x) => String(x.codigo) === String(codigo)) || null)
      })
      .catch(() => {})
      .finally(() => vivo && setBuscando(false))
    return () => { vivo = false }
  }, [codigo, local])

  useEffect(() => {
    let vivo = true
    fetch('/api/imoveis-pub')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return
        const mapa = d && d.ov ? d.ov : d
        setOv(mapa && mapa[String(codigo)] ? mapa[String(codigo)] : null)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [codigo])

  const imBase = local || imFeed
  const im = useMemo(() => (imBase && ov ? aplicarOverrideEmUm(imBase, ov) : imBase), [imBase, ov])

  const [fotoIdx, setFotoIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const [visNome, setVisNome] = useState('')
  const [visQuando, setVisQuando] = useState('Esta semana')
  const [visPeriodo, setVisPeriodo] = useState('À tarde')

  const galeria = useMemo(() => fotosDe(im), [im])
  const idx = Math.min(fotoIdx, Math.max(0, galeria.length - 1))

  const titulo = im ? tituloCard(im) : ''
  useSEO({
    title: im ? `${titulo} no ${im.bairro}` : 'Imóvel',
    description: im ? resumoImovel(im).slice(0, 155) : '',
    path: `/imovel/${codigo}`,
    image: im?.img,
  })

  // teclado no lightbox
  useEffect(() => {
    if (!lb) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLb(false)
      if (e.key === 'ArrowLeft') setFotoIdx((i) => (i - 1 + galeria.length) % galeria.length)
      if (e.key === 'ArrowRight') setFotoIdx((i) => (i + 1) % galeria.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lb, galeria.length])

  if (!im) {
    return (
      <div className="vgx">
        <NavbarVG ativo="imoveis" />
        <div className="vgx-pagina">
          <h1 className="vgx-h2" style={{ marginBottom: 12 }}>
            {buscando ? 'Carregando imóvel...' : 'Imóvel não encontrado'}
          </h1>
          {!buscando && (
            <>
              <p className="vgx-bloco-p" style={{ marginBottom: 20 }}>
                Este imóvel pode ter sido vendido ou saído do catálogo. Veja as opções disponíveis.
              </p>
              <Link to="/imoveis" className="vgx-btn-red">Ver imóveis à venda</Link>
            </>
          )}
        </div>
        <FooterVG />
        <WhatsFloatVG />
      </div>
    )
  }

  const terreno = ehTerreno(im)
  const area = Number(im.area) || 0
  const precoM2 = area > 0 && im.preco > 0 ? im.preco / area : 0
  const refM2 = m2DoBairro(im.bairro)
  const temAnalise = precoM2 > 0 && refM2 > 0
  const diff = temAnalise ? Math.round((precoM2 / refM2 - 1) * 100) : 0
  const maxM2 = Math.max(precoM2, refM2) || 1

  const posicao = diff > 3 ? `↑ ${diff}% acima da referência`
    : diff < -3 ? `↓ ${Math.abs(diff)}% abaixo da referência`
      : 'Alinhado à referência do bairro'
  const badgeBg = diff < -3 ? '#e4f0e8' : diff > 3 ? '#f1e9d8' : '#eef1f5'
  const badgeCor = diff < -3 ? '#1f7a4d' : diff > 3 ? '#7a6230' : '#4a5568'

  const tipoIcone = terreno ? SPEC_ICONS.terreno
    : /apart|cobertura|flat|studio|kit/i.test(im.tipo || '') ? SPEC_ICONS.predio : SPEC_ICONS.casa

  const specs = terreno
    ? [
      area > 0 && { d: SPEC_ICONS.area, valor: formatArea(area), label: 'área total' },
      { d: tipoIcone, valor: im.tipo, label: 'tipo do imóvel' },
      precoM2 > 0 && { d: SPEC_ICONS.m2, valor: precoCompacto(precoM2), label: 'por m²' },
    ].filter(Boolean)
    : [
      area > 0 && { d: SPEC_ICONS.area, valor: formatArea(area), label: 'área privativa' },
      im.quartos > 0 && { d: SPEC_ICONS.quartos, valor: String(im.quartos), label: im.suites > 0 ? `quartos · ${im.suites} ${plural(im.suites, 'suíte', 'suítes')}` : 'quartos' },
      im.banheiros > 0 && { d: SPEC_ICONS.banheiros, valor: String(im.banheiros), label: plural(im.banheiros, 'banheiro', 'banheiros') },
      im.vagas > 0 && { d: SPEC_ICONS.vagas, valor: String(im.vagas), label: plural(im.vagas, 'vaga', 'vagas') },
      { d: tipoIcone, valor: im.tipo, label: 'tipo do imóvel' },
    ].filter(Boolean)

  const chips = vantagensImovel(im)

  const faq = [
    { q: 'Qual o valor deste imóvel?', a: `O imóvel de código ${im.codigo} está à venda por ${precoCompacto(im.preco)}. Fale com o Vinícius para condições, financiamento e margem de negociação.` },
    area > 0 && { q: 'Qual a área?', a: terreno ? `O terreno tem ${formatArea(area)} de área total.` : `São ${formatArea(area)} de área privativa.` },
    !terreno && im.quartos > 0 && { q: 'Quantos quartos e vagas tem?', a: `O imóvel oferece ${im.quartos} ${plural(im.quartos, 'quarto', 'quartos')}${im.suites > 0 ? ` (${im.suites} ${plural(im.suites, 'suíte', 'suítes')})` : ''}${im.banheiros > 0 ? `, ${im.banheiros} ${plural(im.banheiros, 'banheiro', 'banheiros')}` : ''}${im.vagas > 0 ? ` e ${im.vagas} ${plural(im.vagas, 'vaga', 'vagas')} de garagem` : ''}.` },
    { q: 'Onde fica?', a: `Fica no bairro ${im.bairro}, em ${im.cidade || 'Uberlândia'} · MG. A localização exata é informada no atendimento, antes da visita.` },
    { q: 'Como agendar uma visita?', a: 'É só falar com o Vinícius pelo WhatsApp (34) 99157-0494 ou usar o formulário desta página. Ele acompanha do primeiro contato à entrega das chaves.' },
  ].filter(Boolean)

  const semelhantes = IMOVEIS
    .filter((x) => String(x.codigo) !== String(im.codigo) && x.img && Number(x.preco) > 0)
    .sort((a, b) => Math.abs(a.preco - im.preco) - Math.abs(b.preco - im.preco))
    .slice(0, 3)
    .map(cardVM)

  const agendar = () => {
    const nome = visNome.trim()
    const msg = `Olá Vinícius!${nome ? ` Meu nome é ${nome}.` : ''} Quero agendar uma visita ao imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}), de preferência ${visQuando.toLowerCase()}, ${visPeriodo.toLowerCase()}.`
    window.open(linkWhatsApp(msg), '_blank', 'noopener')
  }

  const waInvestir = linkWhatsApp(`Olá Vinícius! Quero uma análise de investimento do imóvel cód. ${im.codigo} (${im.tipo} no ${im.bairro}).`)

  return (
    <div className="vgx">
      <NavbarVG ativo="imoveis" />

      <div className="vgx-pagina">
        <Link to="/imoveis" className="vgx-voltar">← Voltar para o catálogo</Link>

        {/* GALERIA */}
        {galeria.length > 0 && (
          <section className="vgx-galeria vgx-reveal">
            <img
              className="vgx-galeria-main"
              src={galeria[idx]}
              alt={`${titulo} no ${im.bairro}, Uberlândia`}
              onClick={() => setLb(true)}
              onError={onImgError}
            />
            {galeria.length > 1 && (
              <div className="vgx-galeria-thumbs">
                {galeria.slice(1, 5).map((src, i) => (
                  <img
                    key={src + i}
                    className={`vgx-thumb ${idx === i + 1 ? 'is-ativa' : ''}`}
                    src={src}
                    alt={`Foto ${i + 2} do imóvel`}
                    loading="lazy"
                    onClick={() => setFotoIdx(i + 1)}
                    onError={onImgError}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="vgx-ficha">
          <div className="vgx-ficha-main">
            {/* CABEÇALHO */}
            <section className="vgx-ficha-head vgx-reveal">
              <span className="vgx-ficha-kicker">Cód. {im.codigo} · {im.bairro} · {im.cidade || 'Uberlândia'} · {tagDe(im)}</span>
              <h1>{titulo}</h1>
              <span className="vgx-ficha-preco">{precoCompacto(im.preco)}</span>
            </section>

            {/* SPECS */}
            {specs.length > 0 && (
              <section className="vgx-specs vgx-reveal">
                {specs.map((s, i) => (
                  <div className="vgx-spec" key={i}>
                    <SpecIcon d={s.d} />
                    <span className="vgx-spec-txt">
                      <span className="vgx-spec-v">{s.valor}</span>
                      <span className="vgx-spec-l">{s.label}</span>
                    </span>
                  </div>
                ))}
              </section>
            )}

            {/* DESCRIÇÃO */}
            <section className="vgx-bloco vgx-reveal">
              <h2>Sobre este imóvel</h2>
              <p className="vgx-bloco-p">{resumoImovel(im)}</p>
              <p className="vgx-bloco-p">
                Este imóvel passa pela curadoria pessoal do Vinícius: documentação verificada, histórico do
                condomínio analisado e preço avaliado em relação à região. Na visita, você recebe um parecer
                honesto sobre pontos fortes e o que considerar antes da proposta.
              </p>
              {chips.length > 0 && (
                <div className="vgx-chips">
                  {chips.map((c, i) => <span className="vgx-chip" key={i}>{c}</span>)}
                </div>
              )}
            </section>

            {/* ANÁLISE DO M² */}
            {temAnalise && (
              <section className="vgx-bloco vgx-reveal">
                <h2>Análise do m²</h2>
                <div className="vgx-analise">
                  <div className="vgx-analise-topo">
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span className="vgx-analise-valor">{precoCompacto(precoM2)}/m²</span>
                      <span className="vgx-analise-sub">neste imóvel</span>
                    </span>
                    <span className="vgx-badge" style={{ background: badgeBg, color: badgeCor }}>{posicao}</span>
                  </div>
                  <div className="vgx-barras">
                    <div className="vgx-barra-linha">
                      <span className="vgx-barra-top"><span>Este imóvel</span><strong>{precoCompacto(precoM2)}/m²</strong></span>
                      <span className="vgx-barra"><i style={{ width: `${Math.round((precoM2 / maxM2) * 100)}%`, background: 'var(--navy-900)' }} /></span>
                    </div>
                    <div className="vgx-barra-linha">
                      <span className="vgx-barra-top"><span>Referência em {im.bairro}</span><strong>{precoCompacto(refM2)}/m²</strong></span>
                      <span className="vgx-barra"><i style={{ width: `${Math.round((refM2 / maxM2) * 100)}%`, background: 'var(--gold)' }} /></span>
                    </div>
                  </div>
                  <p className="vgx-analise-nota">
                    Referência de mercado do bairro, calculada sobre anúncios ativos. O valor final depende do
                    padrão de acabamento, da posição e do estado de conservação, o Vinícius avalia isso com você.
                  </p>
                </div>
                <div className="vgx-links-ferr">
                  <Link to="/mercado" className="vgx-btn-ouro">Preço do m² por bairro</Link>
                  <Link to="/simulador-financiamento" className="vgx-btn-ouro">Simular financiamento</Link>
                  <a href={waInvestir} target="_blank" rel="noopener noreferrer" className="vgx-btn-ouro">Vale como investimento?</a>
                </div>
              </section>
            )}

            {/* LOCALIZAÇÃO */}
            <section className="vgx-bloco vgx-reveal">
              <h2>Localização</h2>
              <p className="vgx-mapa-sub">{im.bairro}, {im.cidade || 'Uberlândia'} · MG. O endereço exato é informado no agendamento da visita.</p>
              <iframe
                className="vgx-mapa"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-48.32%2C-18.95%2C-48.22%2C-18.88&layer=mapnik"
                title={`Mapa de ${im.bairro}, Uberlândia`}
                loading="lazy"
              />
            </section>

            {/* FAQ */}
            <section className="vgx-bloco vgx-reveal">
              <h2>Perguntas frequentes sobre este imóvel</h2>
              <div className="vgx-faq">
                {faq.map((f, i) => (
                  <details key={i}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* CARD DE CONTATO */}
          <aside className="vgx-aside">
            <div className="vgx-aside-quem">
              <img src="/vinicius-graton.jpg" alt="Vinícius Graton" loading="lazy" onError={onImgError} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="vgx-aside-nome">Vinícius Graton</span>
                <span className="vgx-aside-papel">Consultor de imóveis · Rotina Imobiliária</span>
              </span>
            </div>
            <p>
              Agende uma visita acompanhada ou tire suas dúvidas sobre este imóvel. Resposta em horário
              comercial, normalmente em minutos.
            </p>
            <div className="vgx-aside-form">
              <input
                value={visNome}
                onChange={(e) => setVisNome(e.target.value)}
                placeholder="Seu nome"
                aria-label="Seu nome"
              />
              <div className="vgx-aside-linha">
                <select value={visQuando} onChange={(e) => setVisQuando(e.target.value)} aria-label="Quando">
                  <option>Esta semana</option>
                  <option>Próxima semana</option>
                  <option>No fim de semana</option>
                </select>
                <select value={visPeriodo} onChange={(e) => setVisPeriodo(e.target.value)} aria-label="Período">
                  <option>De manhã</option>
                  <option>À tarde</option>
                  <option>No fim do dia</option>
                </select>
              </div>
              <button onClick={agendar}>Agendar visita pelo WhatsApp</button>
            </div>
            <Link to="/simulador-financiamento" className="vgx-btn-outline" style={{ textAlign: 'center' }}>
              Simular financiamento
            </Link>
            <span className="vgx-aside-rodape">Em parceria com a Rotina Imobiliária</span>
          </aside>
        </div>

        {/* SEMELHANTES */}
        {semelhantes.length > 0 && (
          <section className="vgx-semelhantes vgx-reveal">
            <h2>Você também pode gostar</h2>
            <div className="vgx-cards">
              {semelhantes.map((vm) => <CardVG key={vm.im.codigo} vm={vm} />)}
            </div>
          </section>
        )}
      </div>

      {/* LIGHTBOX */}
      {lb && (
        <div className="vgx-lb" onClick={() => setLb(false)} role="dialog" aria-label="Foto ampliada">
          <img src={galeria[idx]} alt={titulo} onError={onImgError} />
          <button className="vgx-lb-x" aria-label="Fechar" onClick={(e) => { e.stopPropagation(); setLb(false) }}>✕</button>
          {galeria.length > 1 && (
            <>
              <button className="vgx-lb-ant" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); setFotoIdx((i) => (i - 1 + galeria.length) % galeria.length) }}>‹</button>
              <button className="vgx-lb-prox" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); setFotoIdx((i) => (i + 1) % galeria.length) }}>›</button>
              <span className="vgx-lb-cont">{idx + 1} / {galeria.length}</span>
            </>
          )}
        </div>
      )}

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
