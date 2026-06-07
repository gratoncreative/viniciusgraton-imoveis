import { useState, useMemo } from 'react'
import Reveal from '../components/Reveal'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from '../components/icons'

const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FERRAMENTAS = [
  { id: 'financiamento', nome: 'Simulador de financiamento', desc: 'Veja a parcela e o total a pagar (SAC e Price).', icon: '🏦' },
  { id: 'capacidade', nome: 'Quanto consigo financiar?', desc: 'Pela sua renda, estime o valor do imóvel que cabe no bolso.', icon: '📊' },
  { id: 'custos', nome: 'Custos de compra (ITBI + cartório)', desc: 'Quanto reservar além do preço do imóvel, em Uberlândia.', icon: '🧾' },
]

function Campo({ label, valor, onChange, sufixo, prefixo, step = '1', min = '0' }) {
  return (
    <label className="calc-campo">
      <span>{label}</span>
      <div className="calc-input">
        {prefixo && <i>{prefixo}</i>}
        <input type="number" inputMode="decimal" value={valor} step={step} min={min}
          onChange={(e) => onChange(e.target.value)} />
        {sufixo && <i className="calc-suf">{sufixo}</i>}
      </div>
    </label>
  )
}

function Resultado({ itens, destaque }) {
  return (
    <div className="calc-result">
      {destaque && (
        <div className="calc-result-top">
          <span>{destaque.rotulo}</span>
          <b>{destaque.valor}</b>
        </div>
      )}
      <ul>
        {itens.map((it, i) => (
          <li key={i}><span>{it.rotulo}</span><b>{it.valor}</b></li>
        ))}
      </ul>
    </div>
  )
}

function CalcFinanciamento() {
  const [valor, setValor] = useState('500000')
  const [entrada, setEntrada] = useState('100000')
  const [anos, setAnos] = useState('30')
  const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => {
    const P = Math.max(0, (+valor || 0) - (+entrada || 0))
    const n = Math.max(1, Math.round((+anos || 0) * 12))
    const i = (+juros || 0) / 100 / 12
    const price = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n
    const totalPrice = price * n
    const amort = P / n
    const sacPrimeira = amort + P * i
    const sacUltima = amort + amort * i
    const totalSac = P + i * P * (n + 1) / 2
    return { P, n, price, totalPrice, sacPrimeira, sacUltima, totalSac }
  }, [valor, entrada, anos, juros])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <Campo label="Valor do imóvel" prefixo="R$" valor={valor} onChange={setValor} step="1000" />
        <Campo label="Entrada (com FGTS, se usar)" prefixo="R$" valor={entrada} onChange={setEntrada} step="1000" />
        <Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} step="1" min="1" />
        <Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" />
      </div>
      <div>
        <Resultado
          destaque={{ rotulo: 'Valor financiado', valor: brl(r.P) }}
          itens={[
            { rotulo: 'Tabela PRICE — parcela fixa', valor: brl2(r.price) },
            { rotulo: 'PRICE — total pago', valor: brl(r.totalPrice) },
            { rotulo: 'Tabela SAC — 1ª parcela', valor: brl2(r.sacPrimeira) },
            { rotulo: 'SAC — última parcela', valor: brl2(r.sacUltima) },
            { rotulo: 'SAC — total pago', valor: brl(r.totalSac) },
          ]}
        />
        <p className="calc-nota">Estimativa para comparação. A taxa real depende do banco, do seu perfil e inclui correção (TR) e seguros. No SAC a parcela cai mês a mês; no Price ela é fixa. Eu simulo com os números reais com você.</p>
      </div>
    </div>
  )
}

function CalcCapacidade() {
  const [renda, setRenda] = useState('10000')
  const [entrada, setEntrada] = useState('80000')
  const [anos, setAnos] = useState('30')
  const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => {
    const parcelaMax = (+renda || 0) * 0.3
    const n = Math.max(1, Math.round((+anos || 0) * 12))
    const i = (+juros || 0) / 100 / 12
    const financiavel = i > 0 ? (parcelaMax * (1 - Math.pow(1 + i, -n))) / i : parcelaMax * n
    const imovel = financiavel + (+entrada || 0)
    return { parcelaMax, financiavel, imovel }
  }, [renda, entrada, anos, juros])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <Campo label="Renda familiar mensal" prefixo="R$" valor={renda} onChange={setRenda} step="500" />
        <Campo label="Entrada disponível (+ FGTS)" prefixo="R$" valor={entrada} onChange={setEntrada} step="1000" />
        <Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} step="1" min="1" />
        <Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" />
      </div>
      <div>
        <Resultado
          destaque={{ rotulo: 'Imóvel que cabe no seu bolso (estimado)', valor: brl(r.imovel) }}
          itens={[
            { rotulo: 'Parcela máxima sugerida (30% da renda)', valor: brl2(r.parcelaMax) },
            { rotulo: 'Valor financiável estimado', valor: brl(r.financiavel) },
            { rotulo: 'Entrada considerada', valor: brl(+entrada || 0) },
          ]}
        />
        <p className="calc-nota">Os bancos costumam aprovar parcela de até ~30% da renda. É uma estimativa de partida — a aprovação real considera score, tipo de renda e o banco. Posso levantar as melhores condições pra você.</p>
      </div>
    </div>
  )
}

function CalcCustos() {
  const [valor, setValor] = useState('500000')
  const r = useMemo(() => {
    const v = +valor || 0
    const itbi = v * 0.02
    const cartorio = v * 0.012 // escritura + registro (estimativa)
    return { itbi, cartorio, total: itbi + cartorio }
  }, [valor])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <Campo label="Valor do imóvel" prefixo="R$" valor={valor} onChange={setValor} step="1000" />
      </div>
      <div>
        <Resultado
          destaque={{ rotulo: 'Reserve, além do preço (estimado)', valor: brl(r.total) }}
          itens={[
            { rotulo: 'ITBI — 2% (Uberlândia)', valor: brl(r.itbi) },
            { rotulo: 'Escritura + registro (estimativa)', valor: brl(r.cartorio) },
          ]}
        />
        <p className="calc-nota">O ITBI de Uberlândia é 2% para compra e venda comum (no financiamento SFH há alíquota reduzida sobre a parte financiada). Os valores de cartório seguem tabela e são uma estimativa — confirmo os custos exatos do seu caso no atendimento.</p>
      </div>
    </div>
  )
}

export default function Ferramentas() {
  const [ativa, setAtiva] = useState('financiamento')
  useSEO({
    title: 'Ferramentas e calculadoras de imóveis — Uberlândia',
    description: 'Simule financiamento (SAC e Price), descubra quanto consegue financiar e calcule ITBI e custos de cartório em Uberlândia. Ferramentas gratuitas com o consultor Vinícius Graton.',
    path: '/ferramentas',
  })
  const atual = FERRAMENTAS.find((f) => f.id === ativa)

  return (
    <main className="pagina section--light det">
      <div className="container">
        <Reveal>
          <h1 className="sr-only">Ferramentas e calculadoras de imóveis em Uberlândia</h1>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 12px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramentas grátis</span>
            <h2 className="section-title">Calcule tudo <em>antes de decidir</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Escolha o que você precisa calcular, informe os dados e veja o resultado na hora — sem cadastro.
            </p>
          </div>
        </Reveal>

        <div className="calc-tabs">
          {FERRAMENTAS.map((f) => (
            <button key={f.id} className={`calc-tab ${ativa === f.id ? 'on' : ''}`} onClick={() => setAtiva(f.id)}>
              <span className="calc-tab-ico" aria-hidden="true">{f.icon}</span>
              <span className="calc-tab-txt"><b>{f.nome}</b><i>{f.desc}</i></span>
            </button>
          ))}
        </div>

        <div className="calc-painel">
          <h3 className="calc-painel-tit">{atual.nome}</h3>
          {ativa === 'financiamento' && <CalcFinanciamento />}
          {ativa === 'capacidade' && <CalcCapacidade />}
          {ativa === 'custos' && <CalcCustos />}

          <div className="calc-cta">
            <span>Quer que eu faça essa conta com os números reais e te mostre as melhores opções?</span>
            <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as calculadoras no site e quero sua ajuda para simular meu financiamento / imóvel.')} target="_blank" rel="noopener">
              <IconWhats /> Falar com o Vinícius
            </a>
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a className="btn btn-ghost" href="/imoveis">Ver imóveis disponíveis <IconArrow /></a>
        </div>
      </div>
    </main>
  )
}
