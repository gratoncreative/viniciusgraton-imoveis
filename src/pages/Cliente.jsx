import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { getImovel, filtrarParaCliente, avaliarMatch, formatPreco, linkWhatsApp, CONFIG } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconShield, IconArrow } from '../components/icons'

const primeiroNome = (n) => (n || '').trim().split(/\s+/)[0] || ''

function resumoCriterios(c) {
  const out = []
  if (c.tipos && c.tipos.length) out.push(c.tipos.join(' ou '))
  if (c.bairros && c.bairros.length) out.push('no ' + c.bairros.slice(0, 3).join(', '))
  if (c.quartosMin) out.push(`${c.quartosMin}+ quartos`)
  if (c.suitesMin) out.push(`${c.suitesMin}+ suíte${c.suitesMin > 1 ? 's' : ''}`)
  if (c.vagasMin) out.push(`${c.vagasMin}+ vaga${c.vagasMin > 1 ? 's' : ''}`)
  if (c.precoMax) out.push(`até ${formatPreco(c.precoMax)}`)
  return out
}

export default function Cliente() {
  const { token } = useParams()
  const [estado, setEstado] = useState('carregando') // carregando | ok | erro
  const [cli, setCli] = useState(null)

  useSEO({ title: 'Sua seleção de imóveis · Vinícius Graton', description: 'Imóveis selecionados a dedo para você em Uberlândia.', path: `/cliente/${token || ''}`, noindex: true })

  useEffect(() => {
    let vivo = true
    fetch('/api/cliente?t=' + encodeURIComponent(token || ''))
      .then((r) => r.json())
      .then((j) => { if (!vivo) return; if (j && j.ok) { setCli(j.cliente); setEstado('ok') } else setEstado('erro') })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [token])

  if (estado === 'carregando') {
    return <main className="pagina section--light det-vazio"><div className="container" style={{ textAlign: 'center' }}><p className="section-sub">Carregando sua seleção…</p></div></main>
  }
  if (estado === 'erro' || !cli) {
    return (
      <main className="pagina section--light det-vazio">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Seleção não encontrada</h1>
          <p className="section-sub" style={{ margin: '14px auto 24px', maxWidth: 480 }}>Esse link pode ter expirado. Me chama no WhatsApp que eu te mando sua seleção atualizada.</p>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! O link da minha seleção de imóveis não abriu, pode me reenviar?')} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
        </div>
      </main>
    )
  }

  // monta a lista: sugeridos escolhidos pelo Vinícius; se vazio, filtra automaticamente pelos critérios
  let itens = []
  if (cli.sugeridos && cli.sugeridos.length) {
    itens = cli.sugeridos.map((cod) => getImovel(cod)).filter(Boolean).map((im) => ({ im, m: avaliarMatch(im, cli) }))
  }
  if (!itens.length) itens = filtrarParaCliente(cli).slice(0, 9)

  const nome = primeiroNome(cli.nome)
  const crit = resumoCriterios(cli)
  const waMsg = `Olá Vinícius! Vi a seleção de imóveis que você preparou pra mim${nome ? ' (' + nome + ')' : ''} e gostei. Quero agendar uma visita.`

  return (
    <main className="pagina cliente-pg">
      <header className="cliente-hero">
        <div className="container">
          <span className="eyebrow">Seleção exclusiva{nome ? ` · ${nome}` : ''}</span>
          <h1 className="section-title">{nome ? `${nome}, separei essas opções ` : 'Separei essas opções '}<em>pensando em você</em></h1>
          <p className="cliente-intro">
            Em vez de te mandar uma lista aleatória de portal, eu selecionei <b>a dedo</b> os imóveis que realmente combinam com o que você me contou que procura. Cada um aqui passou pela minha curadoria.
          </p>
          {crit.length > 0 && (
            <div className="cliente-criterios">
              <span>O que você procura:</span>
              {crit.map((c, i) => <b key={i}>{c}</b>)}
            </div>
          )}
          <div className="cliente-assina">
            <img src="/vinicius-graton.jpg" alt="Vinícius Graton" loading="lazy" />
            <div>
              <b>Selecionado pessoalmente por Vinícius Graton</b>
              <span>Consultor de imóveis em Uberlândia · Rotina Imobiliária. Te acompanho da primeira conversa à entrega das chaves.</span>
            </div>
          </div>
          <div className="det-trust" style={{ marginTop: 16, maxWidth: 640 }}>
            <IconShield width={20} height={20} />
            <p>Trabalho com a base completa da Rotina Imobiliária (mais de 30 anos em Uberlândia), com segurança e cuidado em cada etapa. Aqui não tem lista aleatória — é o que faz sentido pra você.</p>
          </div>
        </div>
      </header>

      <section className="section--light">
        <div className="container">
          {itens.length === 0 ? (
            <div className="cat-vazio">
              <p>Ainda estou garimpando as melhores opções pro seu perfil. Me chama no WhatsApp que já te trago opções selecionadas.</p>
              <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
            </div>
          ) : (
            <>
              <h2 className="det-rel-titulo">{itens.length} {itens.length === 1 ? 'opção selecionada' : 'opções selecionadas'} pra você</h2>
              <div className="cliente-grid">
                {itens.map(({ im, m }) => (
                  <div className="cliente-item" key={im.codigo}>
                    <CardImovel im={im} />
                    {m && m.motivos && m.motivos.length > 0 && (
                      <div className="cliente-motivos">
                        <b>Por que combina com você</b>
                        <ul>{m.motivos.slice(0, 5).map((mo, i) => <li key={i}><span>✓</span> {mo}</li>)}</ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="cliente-recado">
            <img src="/vinicius-graton.jpg" alt="Vinícius Graton" loading="lazy" />
            <div>
              <p>{nome ? `${nome}, ` : ''}separei cada uma dessas opções pensando no seu momento — não é uma lista qualquer, é o que eu mesmo indicaria pra alguém da minha família. Qualquer dúvida, me chama que eu te respondo pessoalmente.</p>
              <span className="cliente-recado-assina">Um abraço,<br /><b>Vinícius Graton</b></span>
            </div>
          </div>

          <div className="post-cta" style={{ marginTop: 28 }}>
            <div>
              <b>Gostou de alguma? Bora ver de perto.</b>
              <span>Me diz quais te chamaram atenção que eu organizo as visitas num dia só, no horário que for melhor pra você.</span>
            </div>
            <a className="btn btn-gold" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener">
              <IconWhats /> Agendar visita com o Vinícius
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
