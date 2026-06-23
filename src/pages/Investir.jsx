import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'
import { linkWhatsApp } from '../data'

// "Onde investir em Uberlândia" — ranking de rentabilidade (yield) do aluguel por bairro,
// com dado real (residencial, saneado) de public/rentabilidade-bairros.json.
const SITE = 'https://viniciusgraton.com.br'
const fmtK = (n) => (n >= 1000 ? `R$ ${Math.round(n / 1000)} mil` : `R$ ${Math.round(n)}`)
const br = (n) => Number(n).toLocaleString('pt-BR')
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

export default function Investir() {
  useSEO({
    title: 'Onde investir em Uberlândia — rentabilidade do aluguel por bairro',
    description: 'Ranking de rentabilidade (yield) do aluguel por bairro de Uberlândia, com dados reais: aluguel/m², preço/m², apartamento × casa e retorno % ao ano. Veja onde o aluguel rende mais e compare com o CDI.',
    path: '/investir',
  })

  const [d, setD] = useState(null)
  const [erro, setErro] = useState(false)
  const [ordem, setOrdem] = useState('yield') // yield | ticket | nome
  const [busca, setBusca] = useState('')

  useEffect(() => {
    fetch('/rentabilidade-bairros.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.bairros ? setD(j) : setErro(true)))
      .catch(() => setErro(true))
  }, [])

  useEffect(() => {
    if (!d) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'investir-jsonld'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'ItemList', name: 'Rentabilidade do aluguel por bairro em Uberlândia', itemListOrder: 'https://schema.org/ItemListOrderDescending', numberOfItems: d.bairros.length, itemListElement: d.bairros.slice(0, 25).map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: `${b.bairro}: ${b.yieldAa}% a.a.` })) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'Onde investir', item: `${SITE}/investir/` }] },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('investir-jsonld')?.remove() }
  }, [d])

  const cdi = d?.cdiAa || 10.5
  const poup = d?.poupancaAa || 6.17
  const todos = d?.bairros || []
  const corYield = (y) => (y >= cdi ? '#1F7A4D' : y >= poup ? '#2E7D5B' : y >= poup * 0.78 ? '#B8860B' : '#9aa0aa')

  const stats = useMemo(() => {
    if (!todos.length) return null
    return {
      melhor: todos[0],
      mediana: Math.round(median(todos.map((b) => b.yieldAa)) * 100) / 100,
      acimaPoup: todos.filter((b) => b.yieldAa >= poup).length,
      total: todos.length,
    }
  }, [todos, poup])

  const lista = useMemo(() => {
    let l = [...todos]
    const q = busca.trim().toLowerCase()
    if (q) l = l.filter((b) => b.bairro.toLowerCase().includes(q))
    if (ordem === 'ticket') l.sort((a, z) => (a.vendaMin || 0) - (z.vendaMin || 0))
    else if (ordem === 'nome') l.sort((a, z) => a.bairro.localeCompare(z.bairro, 'pt-BR'))
    else l.sort((a, z) => z.yieldAa - a.yieldAa)
    return l
  }, [todos, busca, ordem])

  const maxY = todos[0]?.yieldAa || 1

  return (
    <main className="pagina section--light investir-pg">
      <div className="container">
        <header className="cat-head" style={{ maxWidth: 820 }}>
          <span className="eyebrow">Para investidor · dados reais</span>
          <h1 className="section-title">Onde o aluguel <em>rende mais</em> em Uberlândia</h1>
          <p className="section-sub" style={{ marginTop: 14 }}>
            Rentabilidade (yield) do aluguel por bairro, cruzando os imóveis residenciais à venda e para alugar da carteira da Rotina.
            Quanto maior o %, mais o aluguel rende sobre o preço do imóvel.
          </p>
        </header>

        {erro && <p className="section-sub">Não consegui carregar os dados de rentabilidade agora. Tente recarregar a página.</p>}
        {!d && !erro && <p className="section-sub">Carregando rentabilidade por bairro…</p>}

        {stats && (
          <>
            <div className="investir-stats">
              <div className="investir-stat investir-stat--hero">
                <span>Bairro mais rentável</span>
                <b>{stats.melhor.bairro}</b>
                <i style={{ color: corYield(stats.melhor.yieldAa) }}>{br(stats.melhor.yieldAa)}% a.a.</i>
              </div>
              <div className="investir-stat"><span>Mediana da cidade</span><b>{br(stats.mediana)}%</b><i>yield bruto a.a.</i></div>
              <div className="investir-stat"><span>Rendem + que a poupança</span><b>{stats.acimaPoup}<small>/{stats.total}</small></b><i>acima de {br(poup)}% a.a.</i></div>
              <div className="investir-stat"><span>Referência hoje</span><b>CDI {br(cdi)}%</b><i>poupança {br(poup)}% a.a.</i></div>
            </div>

            <div className="investir-controles">
              <div className="investir-ord" role="tablist" aria-label="Ordenar">
                {[['yield', 'Mais rentável'], ['ticket', 'Entrada mais barata'], ['nome', 'A–Z']].map(([k, lab]) => (
                  <button key={k} className={`investir-ord-btn${ordem === k ? ' on' : ''}`} onClick={() => setOrdem(k)}>{lab}</button>
                ))}
              </div>
              <input className="investir-busca" type="search" placeholder="Buscar bairro…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar bairro" />
            </div>

            <div className="investir-legenda">
              <span><i style={{ background: '#2E7D5B' }} /> rende acima da poupança</span>
              <span><i style={{ background: '#B8860B' }} /> intermediário</span>
              <span><i style={{ background: '#9aa0aa' }} /> mais baixo (bairro nobre / valorização)</span>
            </div>

            <div className="investir-lista">
              {lista.map((b, i) => (
                <Link key={b.slug} className="investir-row" to={`/imoveis/uberlandia/${b.slug}`}>
                  <span className="investir-pos">{ordem === 'yield' && !busca ? i + 1 : '·'}</span>
                  <div className="investir-info">
                    <span className="investir-bairro">{b.bairro}</span>
                    <span className="investir-sub">
                      a partir de {fmtK(b.vendaMin)} · aluguel R$ {br(b.aluguelM2)}/m² · venda {fmtK(b.vendaM2)}/m² · paga em ~{br(b.paybackAnos)} anos
                      {(b.aptoYield || b.casaYield) ? ' · ' : ''}
                      {b.aptoYield ? <em className="investir-tag">apto {br(b.aptoYield)}%</em> : null}
                      {b.casaYield ? <em className="investir-tag">casa {br(b.casaYield)}%</em> : null}
                    </span>
                  </div>
                  <div className="investir-bwrap"><div className="investir-bar" style={{ width: `${(b.yieldAa / maxY) * 100}%`, background: corYield(b.yieldAa) }} /></div>
                  <span className="investir-yield" style={{ color: corYield(b.yieldAa) }}>{br(b.yieldAa)}%<i>a.a.</i></span>
                </Link>
              ))}
              {lista.length === 0 && <p className="section-sub" style={{ textAlign: 'center' }}>Nenhum bairro encontrado para “{busca}”.</p>}
            </div>

            <p className="investir-nota">
              <b>Como leio isto:</b> é o yield <b>bruto</b> (aluguel anual ÷ preço de compra), com dado real de {stats.total} bairros — mediana, só residencial (apartamento e casa), saneado contra distorções.
              O retorno <b>líquido</b> desconta IPTU, condomínio, vacância e imposto de renda. E o aluguel é <b>só parte</b> do ganho: o imóvel ainda valoriza — por isso bairros nobres rendem menos aluguel, mas costumam valorizar mais.
              Faça a conta do seu caso na <Link to="/ferramentas">calculadora de rentabilidade</Link> e veja o financiamento no <Link to="/simulador-financiamento">simulador</Link>.
            </p>

            <div className="investir-ctas">
              <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Quero investir em imóvel em Uberlândia. Quais bairros rendem mais hoje?')} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Quero as melhores oportunidades
              </a>
              <Link className="btn btn-ghost" to="/mercado">Preço do m² por bairro <IconArrow /></Link>
            </div>

            <p className="calc-nota" style={{ marginTop: 18, fontSize: '.75rem' }}>
              Fonte: carteira da Rotina Imobiliária · atualizado automaticamente. Estimativa de mercado a partir dos anúncios; não é recomendação de investimento.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
