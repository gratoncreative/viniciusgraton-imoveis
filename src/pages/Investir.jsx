import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'
import { linkWhatsApp } from '../data'

// "Onde investir em Uberlândia" — ranking de rentabilidade (yield) do aluguel por bairro,
// com dado real (residencial, saneado) de public/rentabilidade-bairros.json.
const SITE = 'https://viniciusgraton.com.br'
const fmtK = (n) => (n >= 1000 ? `R$ ${Math.round(n / 1000)} mil` : `R$ ${Math.round(n)}`)
const br = (n) => Number(n).toLocaleString('pt-BR')

export default function Investir() {
  useSEO({
    title: 'Onde investir em Uberlândia — rentabilidade do aluguel por bairro',
    description: 'Ranking de rentabilidade (yield) do aluguel por bairro de Uberlândia, com dados reais: aluguel/m², preço/m² e retorno % ao ano. Veja onde o aluguel rende mais e compare com o CDI.',
    path: '/investir',
  })

  const [d, setD] = useState(null)
  const [erro, setErro] = useState(false)
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

  const bairros = d?.bairros || []
  const maxY = bairros[0]?.yieldAa || 1
  const cdi = d?.cdiAa || 10.5
  const corYield = (y) => (y >= cdi ? '#2E7D5B' : y >= cdi * 0.7 ? '#B8860B' : '#9aa0aa')

  return (
    <main className="pagina section--light investir-pg">
      <div className="container">
        <header className="cat-head" style={{ maxWidth: 780 }}>
          <span className="eyebrow">Para investidor · dados reais</span>
          <h1 className="section-title">Onde o aluguel <em>rende mais</em> em Uberlândia</h1>
          <p className="section-sub" style={{ marginTop: 14 }}>
            Rentabilidade (yield) do aluguel por bairro, cruzando os imóveis residenciais à venda e para alugar da carteira da Rotina.
            Quanto maior o %, mais o aluguel rende sobre o preço do imóvel — compare com o CDI (~{br(cdi)}% a.a.) e a poupança (~{br(d?.poupancaAa || 6.17)}% a.a.).
          </p>
        </header>

        {erro && <p className="section-sub">Não consegui carregar os dados de rentabilidade agora. Tente recarregar a página.</p>}
        {!d && !erro && <p className="section-sub">Carregando rentabilidade por bairro…</p>}

        {bairros.length > 0 && (
          <>
            <div className="investir-lista">
              {bairros.map((b, i) => (
                <Link key={b.slug} className="investir-row" to={`/imoveis/uberlandia/${b.slug}`}>
                  <span className="investir-pos">{i + 1}</span>
                  <div className="investir-info">
                    <span className="investir-bairro">{b.bairro}</span>
                    <span className="investir-sub">aluguel R$ {br(b.aluguelM2)}/m² · venda {fmtK(b.vendaM2)}/m² · investimento se paga em ~{br(b.paybackAnos)} anos</span>
                  </div>
                  <div className="investir-bwrap"><div className="investir-bar" style={{ width: `${(b.yieldAa / maxY) * 100}%`, background: corYield(b.yieldAa) }} /></div>
                  <span className="investir-yield" style={{ color: corYield(b.yieldAa) }}>{br(b.yieldAa)}%<i>a.a.</i></span>
                </Link>
              ))}
            </div>

            <p className="investir-nota">
              <b>Como leio isto:</b> é o yield <b>bruto</b> (aluguel anual ÷ preço de compra), com dado real de {bairros.length} bairros — mediana, só residencial (apartamento e casa), saneado contra distorções.
              O retorno <b>líquido</b> desconta IPTU, condomínio, vacância e imposto de renda. Bairros nobres tendem a render menos (você paga pelo endereço e pela valorização); periféricos rendem mais aluguel.
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
