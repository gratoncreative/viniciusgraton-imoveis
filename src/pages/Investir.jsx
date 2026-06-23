import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'
import { linkWhatsApp } from '../data'

// "Onde investir em Uberlândia" — ranking de rentabilidade (yield) do aluguel por bairro,
// com dado real (residencial, saneado) de public/rentabilidade-bairros.json.
// Alterna entre yield BRUTO (dado puro) e LÍQUIDO (descontando vacância, custos e IPTU ajustáveis).
const SITE = 'https://viniciusgraton.com.br'
const fmtK = (n) => (n >= 1000 ? `R$ ${Math.round(n / 1000)} mil` : `R$ ${Math.round(n)}`)
const br = (n) => Number(n).toLocaleString('pt-BR')
const r1 = (n) => Math.round(n * 100) / 100
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

function Premissa({ label, val, set, min, max, step, suf }) {
  return (
    <label className="investir-premissa">
      <span>{label} <b>{br(val)}{suf}</b></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(+e.target.value)} />
    </label>
  )
}

export default function Investir() {
  useSEO({
    title: 'Onde investir em Uberlândia — rentabilidade do aluguel por bairro',
    description: 'Ranking de rentabilidade (yield) do aluguel por bairro de Uberlândia, com dados reais: aluguel/m², preço/m², apartamento × casa, retorno bruto e líquido por ano. Veja onde o aluguel rende mais e compare com o CDI.',
    path: '/investir',
  })

  const [d, setD] = useState(null)
  const [erro, setErro] = useState(false)
  const [ordem, setOrdem] = useState('yield') // yield | ticket | nome
  const [busca, setBusca] = useState('')
  const [modo, setModo] = useState('bruto')   // bruto | liquido
  const [vac, setVac] = useState(8)           // vacância (% do ano)
  const [custos, setCustos] = useState(12)    // administração + manutenção (% do aluguel)
  const [iptu, setIptu] = useState(0.8)       // IPTU (% do valor ao ano)

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
  const liq = modo === 'liquido'
  const fator = 1 - (vac / 100) - (custos / 100)
  // converte um yield bruto em líquido conforme as premissas (ou devolve o bruto)
  const conv = (y) => (y == null ? null : liq ? Math.max(0, r1(y * fator - iptu)) : y)
  const corYield = (y) => (y >= cdi ? '#1F7A4D' : y >= poup ? '#2E7D5B' : y >= poup * 0.78 ? '#B8860B' : '#9aa0aa')

  const stats = useMemo(() => {
    if (!todos.length) return null
    const ys = todos.map((b) => conv(b.yieldAa))
    return {
      melhor: todos.reduce((a, b) => (conv(b.yieldAa) > conv(a.yieldAa) ? b : a)),
      mediana: r1(median(ys)),
      acimaPoup: ys.filter((y) => y >= poup).length,
      total: todos.length,
    }
  }, [todos, liq, fator, iptu, poup])

  const lista = useMemo(() => {
    let l = [...todos]
    const q = busca.trim().toLowerCase()
    if (q) l = l.filter((b) => b.bairro.toLowerCase().includes(q))
    if (ordem === 'ticket') l.sort((a, z) => (a.vendaMin || 0) - (z.vendaMin || 0))
    else if (ordem === 'nome') l.sort((a, z) => a.bairro.localeCompare(z.bairro, 'pt-BR'))
    else l.sort((a, z) => conv(z.yieldAa) - conv(a.yieldAa))
    return l
  }, [todos, busca, ordem, liq, fator, iptu])

  const maxY = todos.length ? Math.max(...todos.map((b) => conv(b.yieldAa))) : 1

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
          <div className="investir-wrap">
            <div className="investir-modo">
              <div className="investir-modo-tabs" role="tablist" aria-label="Tipo de rentabilidade">
                {[['bruto', 'Yield bruto'], ['liquido', 'Yield líquido']].map(([k, lab]) => (
                  <button key={k} role="tab" aria-selected={modo === k} className={`investir-modo-btn${modo === k ? ' on' : ''}`} onClick={() => setModo(k)}>{lab}</button>
                ))}
              </div>
              {liq && (
                <div className="investir-premissas">
                  <Premissa label="Vacância" val={vac} set={setVac} min={0} max={25} step={1} suf="% do ano" />
                  <Premissa label="Custos / administração" val={custos} set={setCustos} min={0} max={30} step={1} suf="% do aluguel" />
                  <Premissa label="IPTU" val={iptu} set={setIptu} min={0} max={2} step={0.1} suf="% a.a." />
                </div>
              )}
            </div>

            <div className="investir-stats">
              <div className="investir-stat investir-stat--hero">
                <span>Bairro mais rentável</span>
                <b>{stats.melhor.bairro}</b>
                <i style={{ color: corYield(conv(stats.melhor.yieldAa)) }}>{br(conv(stats.melhor.yieldAa))}% a.a.</i>
              </div>
              <div className="investir-stat"><span>Mediana da cidade</span><b>{br(stats.mediana)}%</b><i>yield {liq ? 'líquido' : 'bruto'} a.a.</i></div>
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
              <span className="investir-legenda-modo">mostrando: <b>{liq ? 'líquido' : 'bruto'}</b></span>
            </div>

            <div className="investir-lista">
              {lista.map((b, i) => {
                const y = conv(b.yieldAa)
                return (
                  <Link key={b.slug} className="investir-row" to={`/imoveis/uberlandia/${b.slug}`}>
                    <span className="investir-pos">{ordem === 'yield' && !busca ? i + 1 : '·'}</span>
                    <div className="investir-info">
                      <span className="investir-bairro">{b.bairro}</span>
                      <span className="investir-sub">
                        a partir de {fmtK(b.vendaMin)} · aluguel R$ {br(b.aluguelM2)}/m² · venda {fmtK(b.vendaM2)}/m² · paga em ~{br(r1(100 / y || 0))} anos
                        {(b.aptoYield || b.casaYield) ? ' · ' : ''}
                        {b.aptoYield ? <em className="investir-tag">apto {br(conv(b.aptoYield))}%</em> : null}
                        {b.casaYield ? <em className="investir-tag">casa {br(conv(b.casaYield))}%</em> : null}
                        {b.valorizacaoM2 != null ? <em className={`investir-tag investir-tag--val${b.valorizacaoM2 < 0 ? ' neg' : ''}`}>{b.valorizacaoM2 >= 0 ? '↑' : '↓'} {br(Math.abs(b.valorizacaoM2))}% valoriz. {b.valorizacaoMeses}m</em> : null}
                      </span>
                    </div>
                    <div className="investir-bwrap"><div className="investir-bar" style={{ width: `${Math.min(100, (y / maxY) * 100)}%`, background: corYield(y) }} /></div>
                    <span className="investir-yield" style={{ color: corYield(y) }}>{br(y)}%<i>a.a.</i></span>
                  </Link>
                )
              })}
              {lista.length === 0 && <p className="section-sub" style={{ textAlign: 'center' }}>Nenhum bairro encontrado para “{busca}”.</p>}
            </div>

            <details className="investir-metodo">
              <summary>Como calculamos a rentabilidade</summary>
              <div className="investir-metodo-corpo">
                <p>Cruzamos os imóveis <b>residenciais</b> (apartamento e casa) à venda e para alugar da carteira da Rotina Imobiliária, por bairro. Usamos a <b>mediana</b> do aluguel por m² e do preço de venda por m² (mais robusta que a média) e só publicamos bairros com amostra suficiente dos dois lados, descartando valores distorcidos (comercial, terreno, fora da faixa).</p>
                <p><b>Yield bruto</b> = aluguel anual ÷ preço de compra. <b>Yield líquido</b> = aplica as premissas que você ajusta acima — vacância, custos/administração (sobre o aluguel) e IPTU (sobre o valor). Não inclui imposto de renda nem a <b>valorização</b> do imóvel, que é um ganho à parte (por isso bairros nobres rendem menos de aluguel, mas costumam valorizar mais). A <b>valorização do m²</b> por bairro passa a aparecer no ranking conforme acumulamos histórico de preços (a partir de ~5 meses de dados).</p>
                <p>É uma estimativa de mercado a partir dos anúncios, atualizada automaticamente — não é recomendação de investimento. Para o número exato do seu caso, use a <Link to="/ferramentas">calculadora de rentabilidade</Link>.</p>
              </div>
            </details>

            <div className="investir-ctas">
              <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Quero investir em imóvel em Uberlândia. Quais bairros rendem mais hoje?')} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Quero as melhores oportunidades
              </a>
              <Link className="btn btn-ghost" to="/mercado">Preço do m² por bairro <IconArrow /></Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
