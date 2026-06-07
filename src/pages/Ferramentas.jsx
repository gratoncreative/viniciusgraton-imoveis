import { useState, useMemo } from 'react'
import Reveal from '../components/Reveal'
import CampoMoeda from '../components/CampoMoeda'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { IconWhats, IconArrow } from '../components/icons'

const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FERRAMENTAS = [
  { id: 'financiamento', nome: 'Simulador de financiamento', desc: 'Veja a parcela e o total a pagar (SAC e Price).', icon: '🏦' },
  { id: 'capacidade', nome: 'Quanto consigo financiar?', desc: 'Pela sua renda, estime o valor do imóvel que cabe no bolso.', icon: '📊' },
  { id: 'custos', nome: 'Custos de compra (ITBI + cartório)', desc: 'Quanto reservar além do preço do imóvel, em Uberlândia.', icon: '🧾' },
  { id: 'aluguel', nome: 'Alugar ou financiar?', desc: 'Compare o que você paga de aluguel com a parcela do financiamento.', icon: '⚖️' },
  { id: 'rentabilidade', nome: 'Rentabilidade do aluguel', desc: 'Descubra quanto um imóvel rende de aluguel por ano.', icon: '📈' },
]

function Campo({ label, valor, onChange, sufixo, step = '1', min = '0' }) {
  return (
    <label className="calc-campo">
      <span>{label}</span>
      <div className="calc-input">
        <input type="number" inputMode="decimal" value={valor} step={step} min={min} onChange={(e) => onChange(e.target.value)} />
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
  const [valor, setValor] = useState(500000)
  const [entrada, setEntrada] = useState(100000)
  const [anos, setAnos] = useState('30')
  const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => {
    const P = Math.max(0, valor - entrada)
    const n = Math.max(1, Math.round((+anos || 0) * 12))
    const i = (+juros || 0) / 100 / 12
    const price = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n
    const amort = P / n
    return { P, price, totalPrice: price * n, sacPrimeira: amort + P * i, sacUltima: amort + amort * i, totalSac: P + i * P * (n + 1) / 2 }
  }, [valor, entrada, anos, juros])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} />
        <CampoMoeda label="Entrada (com FGTS, se usar)" valor={entrada} onChange={setEntrada} />
        <Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" />
        <Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" />
      </div>
      <div>
        <Resultado destaque={{ rotulo: 'Valor financiado', valor: brl(r.P) }} itens={[
          { rotulo: 'Tabela PRICE — parcela fixa', valor: brl2(r.price) },
          { rotulo: 'PRICE — total pago', valor: brl(r.totalPrice) },
          { rotulo: 'Tabela SAC — 1ª parcela', valor: brl2(r.sacPrimeira) },
          { rotulo: 'SAC — última parcela', valor: brl2(r.sacUltima) },
          { rotulo: 'SAC — total pago', valor: brl(r.totalSac) },
        ]} />
        <p className="calc-nota">Estimativa para comparação. A taxa real depende do banco, do seu perfil e inclui correção (TR) e seguros. No SAC a parcela cai mês a mês; no Price ela é fixa. Eu simulo com os números reais com você.</p>
      </div>
    </div>
  )
}

function CalcCapacidade() {
  const [renda, setRenda] = useState(10000)
  const [entrada, setEntrada] = useState(80000)
  const [anos, setAnos] = useState('30')
  const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => {
    const parcelaMax = renda * 0.3
    const n = Math.max(1, Math.round((+anos || 0) * 12))
    const i = (+juros || 0) / 100 / 12
    const financiavel = i > 0 ? (parcelaMax * (1 - Math.pow(1 + i, -n))) / i : parcelaMax * n
    return { parcelaMax, financiavel, imovel: financiavel + entrada }
  }, [renda, entrada, anos, juros])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <CampoMoeda label="Renda familiar mensal" valor={renda} onChange={setRenda} />
        <CampoMoeda label="Entrada disponível (+ FGTS)" valor={entrada} onChange={setEntrada} />
        <Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" />
        <Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" />
      </div>
      <div>
        <Resultado destaque={{ rotulo: 'Imóvel que cabe no seu bolso (estimado)', valor: brl(r.imovel) }} itens={[
          { rotulo: 'Parcela máxima sugerida (30% da renda)', valor: brl2(r.parcelaMax) },
          { rotulo: 'Valor financiável estimado', valor: brl(r.financiavel) },
          { rotulo: 'Entrada considerada', valor: brl(entrada) },
        ]} />
        <p className="calc-nota">Os bancos costumam aprovar parcela de até ~30% da renda. É uma estimativa de partida — a aprovação real considera score, tipo de renda e o banco. Posso levantar as melhores condições pra você.</p>
      </div>
    </div>
  )
}

function CalcCustos() {
  const [valor, setValor] = useState(500000)
  const r = useMemo(() => ({ itbi: valor * 0.02, cartorio: valor * 0.012, total: valor * 0.032 }), [valor])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} />
      </div>
      <div>
        <Resultado destaque={{ rotulo: 'Reserve, além do preço (estimado)', valor: brl(r.total) }} itens={[
          { rotulo: 'ITBI — 2% (Uberlândia)', valor: brl(r.itbi) },
          { rotulo: 'Escritura + registro (estimativa)', valor: brl(r.cartorio) },
        ]} />
        <p className="calc-nota">O ITBI de Uberlândia é 2% para compra e venda comum (no financiamento SFH há alíquota reduzida sobre a parte financiada). Os valores de cartório seguem tabela e são uma estimativa — confirmo os custos exatos do seu caso no atendimento.</p>
      </div>
    </div>
  )
}

function CalcAluguel() {
  const [valor, setValor] = useState(500000)
  const [aluguel, setAluguel] = useState(2500)
  const [entrada, setEntrada] = useState(100000)
  const [anos, setAnos] = useState('30')
  const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => {
    const P = Math.max(0, valor - entrada)
    const n = Math.max(1, Math.round((+anos || 0) * 12))
    const i = (+juros || 0) / 100 / 12
    const parcela = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n
    return { parcela, dif: parcela - aluguel }
  }, [valor, aluguel, entrada, anos, juros])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <CampoMoeda label="Valor do imóvel para comprar" valor={valor} onChange={setValor} />
        <CampoMoeda label="Aluguel que você paga hoje" valor={aluguel} onChange={setAluguel} />
        <CampoMoeda label="Entrada disponível (+ FGTS)" valor={entrada} onChange={setEntrada} />
        <Campo label="Prazo do financiamento" sufixo="anos" valor={anos} onChange={setAnos} min="1" />
        <Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" />
      </div>
      <div>
        <Resultado destaque={{ rotulo: 'Parcela do financiamento (Price)', valor: brl2(r.parcela) }} itens={[
          { rotulo: 'Aluguel atual', valor: brl2(aluguel) },
          { rotulo: r.dif >= 0 ? 'A parcela fica acima do aluguel em' : 'A parcela fica abaixo do aluguel em', valor: brl2(Math.abs(r.dif)) },
        ]} />
        <p className="calc-nota">{r.dif <= 0
          ? 'Sua parcela ficaria igual ou menor que o aluguel — comprando, você para de pagar aluguel e constrói patrimônio. Vale muito conversarmos.'
          : 'A parcela ficaria acima do aluguel, mas você passa a construir patrimônio e o imóvel tende a valorizar. Eu te ajudo a achar a melhor relação entre entrada, prazo e parcela.'}</p>
      </div>
    </div>
  )
}

function CalcRentabilidade() {
  const [valor, setValor] = useState(500000)
  const [aluguel, setAluguel] = useState(2500)
  const r = useMemo(() => {
    const mensal = valor > 0 ? (aluguel / valor) * 100 : 0
    return { mensal, anual: mensal * 12, anoReais: aluguel * 12 }
  }, [valor, aluguel])
  return (
    <div className="calc-grid">
      <div className="calc-form">
        <CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} />
        <CampoMoeda label="Aluguel mensal (esperado)" valor={aluguel} onChange={setAluguel} />
      </div>
      <div>
        <Resultado destaque={{ rotulo: 'Rentabilidade bruta ao ano', valor: `${r.anual.toFixed(2).replace('.', ',')}%` }} itens={[
          { rotulo: 'Rentabilidade bruta ao mês', valor: `${r.mensal.toFixed(2).replace('.', ',')}%` },
          { rotulo: 'Aluguel recebido em 12 meses', valor: brl(r.anoReais) },
        ]} />
        <p className="calc-nota">Rentabilidade bruta (antes de IPTU, condomínio, manutenção e impostos). Em Uberlândia, imóveis bem localizados costumam render bem para locação. Posso te indicar os que mais valem a pena para investir.</p>
      </div>
    </div>
  )
}

export default function Ferramentas() {
  const [ativa, setAtiva] = useState('financiamento')
  useSEO({
    title: 'Ferramentas e calculadoras de imóveis — Uberlândia',
    description: 'Simule financiamento (SAC e Price), descubra quanto consegue financiar, compare aluguel x compra, calcule ITBI, custos e rentabilidade de aluguel em Uberlândia. Ferramentas gratuitas com o consultor Vinícius Graton.',
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
          {ativa === 'aluguel' && <CalcAluguel />}
          {ativa === 'rentabilidade' && <CalcRentabilidade />}

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
