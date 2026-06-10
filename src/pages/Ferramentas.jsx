import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CampoMoeda from '../components/CampoMoeda'
import { estaLogado } from '../conta'
import { IMOVEIS, BAIRROS_IMOVEL, linkWhatsApp } from '../data'
import BAIRROS_M2 from '../bairros-m2.json'
import { formatBRL } from '../extenso'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'
import FerramentaRotina from '../components/FerramentaRotina'

const brl = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n) => `${(isFinite(n) ? n : 0).toFixed(2).replace('.', ',')}%`

// ícones de linha monocromáticos (sóbrios, institucionais) — sem emojis
const ICN = {
  bank: 'M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6M7 10h.01M17 10h.01',
  chart: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4',
  wallet: 'M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h17a1 1 0 0 1 1 1v3m0 0h-4a2 2 0 0 0 0 4h4',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  receipt: 'M6 2v20l2-1.5L10 22l2-1.5L14 22l2-1.5L18 22V2l-2 1.5L14 2l-2 1.5L10 2 8 3.5 6 2zM9 7h6M9 11h6M9 15h4',
  scale: 'M12 3v18M7 21h10M5 7h14l-3 7H8L5 7zM12 7l-7 0m7 0 7 0M5 7l-2 5h4l-2-5zm14 0-2 5h4l-2-5z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  coins: 'M8 8m-5 0a5 3 0 1 0 10 0a5 3 0 1 0-10 0M3 8v5c0 1.66 2.24 3 5 3M13 12.5c0 1.66 2.24 3 5 3s5-1.34 5-3M16 13.5m-5 0a5 3 0 1 0 10 0a5 3 0 1 0-10 0M11 13.5v5c0 1.66 2.24 3 5 3s5-1.34 5-3v-5',
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  gauge: 'M12 14l4-4M4 20a8 8 0 1 1 16 0M7.5 13.5h.01M16.5 13.5h.01M9 9.5h.01',
  doc: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13l2 2 4-4',
  compare: 'M5 4h5v16H5zM14 4h5v16h-5zM12 2v20',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  percent: 'M19 5 5 19M7.5 7.5h.01M16.5 16.5h.01M6 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M15 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  chat: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
}
const FerrIcon = ({ name, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICN[name] || ICN.calc} /></svg>
)

const TOOLS = [
  // ordem: das MAIS usadas para as menos usadas (padrão; o cliente logado pode reordenar arrastando)
  { id: 'financiamento', nome: 'Simulador de financiamento', desc: 'Parcela e total a pagar (SAC e Price).', icon: 'bank', cat: 'voce' },
  { id: 'capacidade', nome: 'Quanto consigo financiar?', desc: 'O valor do imóvel que cabe na sua renda.', icon: 'chart', cat: 'voce' },
  { id: 'valorm2', nome: 'Quanto vale o m² do bairro', desc: 'Preço médio por m² por bairro de Uberlândia.', icon: 'home', cat: 'voce' },
  { id: 'custos', nome: 'Custos de compra (ITBI + cartório)', desc: 'Quanto reservar além do preço, em Uberlândia.', icon: 'receipt', cat: 'voce' },
  { id: 'renda', nome: 'Renda necessária pra financiar', desc: 'Qual renda o banco exige pro imóvel que você quer.', icon: 'wallet', cat: 'voce' },
  { id: 'fgts', nome: 'Simulador de FGTS', desc: 'Quanto o seu saldo abate na entrada e na parcela.', icon: 'wallet', cat: 'voce' },
  { id: 'score', nome: 'Chance de aprovação', desc: 'Estimativa da sua chance no banco.', icon: 'gauge', cat: 'voce' },
  { id: 'entrada', nome: 'Quanto juntar pra entrada', desc: 'Quanto guardar por mês pra dar a entrada.', icon: 'coins', cat: 'voce' },
  { id: 'amortizacao', nome: 'Amortização com FGTS', desc: 'Quanto o FGTS encurta o seu financiamento.', icon: 'calc', cat: 'voce' },
  { id: 'aluguel', nome: 'Alugar ou financiar?', desc: 'Compare o aluguel com a parcela.', icon: 'scale', cat: 'voce' },
  { id: 'rentabilidade', nome: 'Rentabilidade do aluguel', desc: 'Quanto um imóvel rende de aluguel por ano.', icon: 'trend', cat: 'voce' },
  { id: 'ganho', nome: 'IR na venda do imóvel', desc: 'Imposto sobre o lucro (ganho de capital) e isenções.', icon: 'receipt', cat: 'voce' },
  { id: 'investir', nome: 'Imóvel x CDI/poupança', desc: 'Vale mais comprar pra alugar ou aplicar?', icon: 'coins', cat: 'voce' },
  { id: 'checklist', nome: 'Checklist de documentos', desc: 'Tudo que você precisa, por etapa.', icon: 'doc', cat: 'voce' },
  { id: 'comparar', nome: 'Comparar imóveis', desc: 'Veja imóveis lado a lado.', icon: 'compare', cat: 'voce', to: '/comparar' },
  { id: 'mapa', nome: 'Buscar no mapa', desc: 'Explore os imóveis por região.', icon: 'map', cat: 'voce', to: '/mapa' },
  { id: 'rotina', nome: 'Rotina — abordagem por código', desc: 'Cole o código do imóvel da Rotina e gere a mensagem de 1º contato com gatilhos + benefícios da região (raio de 1km).', icon: 'chat', cat: 'corretor' },
  { id: 'comissao', nome: 'Calculadora de comissão', desc: 'Comissão e repasse de uma venda.', icon: 'percent', cat: 'corretor' },
  { id: 'acm', nome: 'Análise de mercado (ACM)', desc: 'Sugere o preço do imóvel pelo m² do bairro.', icon: 'chart', cat: 'corretor' },
  { id: 'ficha', nome: 'Ficha de avaliação rápida', desc: 'Gera um resumo do imóvel pra enviar.', icon: 'edit', cat: 'corretor' },
  { id: 'converter', nome: 'Conversor de fotos', desc: 'Converte fotos entre JPG, PNG, WebP e AVIF em lote — suba quantas quiser e baixe tudo de uma vez.', icon: 'edit', cat: 'corretor', to: '/ferramentas/converter', destaque: true },
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
function Select({ label, valor, onChange, opcoes }) {
  return (
    <label className="calc-campo">
      <span>{label}</span>
      <div className="calc-input"><select value={valor} onChange={(e) => onChange(e.target.value)} style={{ border: 'none', background: 'transparent', width: '100%', font: 'inherit', color: 'inherit', padding: '14px 0' }}>{opcoes.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.t ?? o}</option>)}</select></div>
    </label>
  )
}
function Resultado({ itens, destaque }) {
  return (
    <div className="calc-result">
      {destaque && <div className="calc-result-top"><span>{destaque.rotulo}</span><b>{destaque.valor}</b></div>}
      <ul>{itens.map((it, i) => <li key={i}><span>{it.rotulo}</span><b>{it.valor}</b></li>)}</ul>
    </div>
  )
}
const nota = (t) => <p className="calc-nota">{t}</p>

// nº de meses restantes de um financiamento (Price) dado saldo, parcela e juros a.a.
const mesesRestantes = (saldo, parcela, jurosAa) => {
  const i = jurosAa / 100 / 12
  if (parcela <= saldo * i) return Infinity
  return Math.ceil(-Math.log(1 - (i * saldo) / parcela) / Math.log(1 + i))
}

function CalcFinanciamento() {
  const [valor, setValor] = useState(500000); const [entrada, setEntrada] = useState(100000); const [anos, setAnos] = useState('30'); const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => { const P = Math.max(0, valor - entrada); const n = Math.max(1, Math.round((+anos || 0) * 12)); const i = (+juros || 0) / 100 / 12; const price = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n; const amort = P / n; return { P, price, totalPrice: price * n, sacPrimeira: amort + P * i, sacUltima: amort + amort * i, totalSac: P + i * P * (n + 1) / 2 } }, [valor, entrada, anos, juros])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Entrada (com FGTS, se usar)" valor={entrada} onChange={setEntrada} /><Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Valor financiado', valor: brl(r.P) }} itens={[{ rotulo: 'PRICE — parcela fixa', valor: brl2(r.price) }, { rotulo: 'PRICE — total pago', valor: brl(r.totalPrice) }, { rotulo: 'SAC — 1ª parcela', valor: brl2(r.sacPrimeira) }, { rotulo: 'SAC — última parcela', valor: brl2(r.sacUltima) }, { rotulo: 'SAC — total pago', valor: brl(r.totalSac) }]} />{nota('Estimativa para comparação. A taxa real depende do banco e inclui correção (TR) e seguros. Eu simulo com os números reais com você.')}</div></div>)
}
function CalcCapacidade() {
  const [renda, setRenda] = useState(10000); const [entrada, setEntrada] = useState(80000); const [anos, setAnos] = useState('30'); const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => { const pm = renda * 0.3; const n = Math.max(1, Math.round((+anos || 0) * 12)); const i = (+juros || 0) / 100 / 12; const fin = i > 0 ? (pm * (1 - Math.pow(1 + i, -n))) / i : pm * n; return { pm, fin, imovel: fin + entrada } }, [renda, entrada, anos, juros])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Renda familiar mensal" valor={renda} onChange={setRenda} /><CampoMoeda label="Entrada disponível (+ FGTS)" valor={entrada} onChange={setEntrada} /><Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Imóvel que cabe no seu bolso', valor: brl(r.imovel) }} itens={[{ rotulo: 'Parcela máxima (30% da renda)', valor: brl2(r.pm) }, { rotulo: 'Valor financiável estimado', valor: brl(r.fin) }, { rotulo: 'Entrada considerada', valor: brl(entrada) }]} />{nota('Os bancos costumam aprovar parcela de até ~30% da renda. Estimativa de partida; a aprovação real considera score e tipo de renda.')}</div></div>)
}
function CalcFGTS() {
  const [valor, setValor] = useState(400000); const [entrada, setEntrada] = useState(40000); const [fgts, setFgts] = useState(60000); const [anos, setAnos] = useState('30'); const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => { const entradaTotal = entrada + fgts; const fin = Math.max(0, valor - entradaTotal); const n = Math.max(1, Math.round((+anos || 0) * 12)); const i = (+juros || 0) / 100 / 12; const parcela = i > 0 ? (fin * i) / (1 - Math.pow(1 + i, -n)) : fin / n; const finSemFgts = Math.max(0, valor - entrada); const parcelaSem = i > 0 ? (finSemFgts * i) / (1 - Math.pow(1 + i, -n)) : finSemFgts / n; return { entradaTotal, fin, parcela, parcelaSem, pctEntrada: valor > 0 ? (entradaTotal / valor) * 100 : 0, economiaParcela: parcelaSem - parcela } }, [valor, entrada, fgts, anos, juros])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Entrada própria (sem FGTS)" valor={entrada} onChange={setEntrada} /><CampoMoeda label="Saldo do seu FGTS" valor={fgts} onChange={setFgts} /><Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Entrada total com o FGTS', valor: brl(r.entradaTotal) }} itens={[{ rotulo: 'Equivale a', valor: `${pct(r.pctEntrada)} do imóvel` }, { rotulo: 'Valor financiado', valor: brl(r.fin) }, { rotulo: 'Parcela (Price)', valor: brl2(r.parcela) }, { rotulo: 'Sua parcela diminui em', valor: brl2(Math.max(0, r.economiaParcela)) }]} />{nota('O FGTS pode entrar na entrada (reduzindo o financiamento e a parcela) se você atender às regras: 3+ anos de FGTS, imóvel residencial urbano e sem outro imóvel/financiamento SFH na região. Eu confirmo se você se enquadra.')}</div></div>)
}
function CalcAmortizacao() {
  const [saldo, setSaldo] = useState(300000); const [parcela, setParcela] = useState(3200); const [juros, setJuros] = useState('11.5'); const [fgts, setFgts] = useState(50000)
  const r = useMemo(() => { const j = +juros || 0; const n0 = mesesRestantes(saldo, parcela, j); const n1 = mesesRestantes(Math.max(0, saldo - fgts), parcela, j); const econ = (isFinite(n0) && isFinite(n1)) ? n0 - n1 : 0; return { n0, n1, econ } }, [saldo, parcela, juros, fgts])
  const meses = (m) => isFinite(m) ? `${m} meses (~${(m / 12).toFixed(1).replace('.', ',')} anos)` : 'parcela não cobre os juros'
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Saldo devedor atual" valor={saldo} onChange={setSaldo} /><CampoMoeda label="Parcela atual" valor={parcela} onChange={setParcela} /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /><CampoMoeda label="FGTS para amortizar" valor={fgts} onChange={setFgts} /></div><div><Resultado destaque={{ rotulo: r.econ > 0 ? 'Você encurta o financiamento em' : 'Simule os valores' , valor: r.econ > 0 ? `${r.econ} meses (~${(r.econ / 12).toFixed(1).replace('.', ',')} anos)` : '—' }} itens={[{ rotulo: 'Faltam hoje', valor: meses(r.n0) }, { rotulo: 'Após amortizar com o FGTS', valor: meses(r.n1) }, { rotulo: 'Novo saldo devedor', valor: brl(Math.max(0, saldo - fgts)) }]} />{nota('Amortizar reduzindo o PRAZO (mantendo a parcela) é o que mais economiza juros. O FGTS pode ser usado p/ amortizar em geral a cada 2 anos. Estimativa — confirme as regras com o banco.')}</div></div>)
}
function CalcCustos() {
  const [valor, setValor] = useState(500000)
  const r = useMemo(() => ({ itbi: valor * 0.02, cartorio: valor * 0.012, total: valor * 0.032 }), [valor])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /></div><div><Resultado destaque={{ rotulo: 'Reserve, além do preço', valor: brl(r.total) }} itens={[{ rotulo: 'ITBI — 2% (Uberlândia)', valor: brl(r.itbi) }, { rotulo: 'Escritura + registro (estimativa)', valor: brl(r.cartorio) }]} />{nota('ITBI de Uberlândia: 2% na compra comum (reduzido no SFH para menor renda). Cartório segue tabela — confirmo os custos exatos no atendimento.')}</div></div>)
}
function CalcAluguel() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500); const [entrada, setEntrada] = useState(100000); const [anos, setAnos] = useState('30'); const [juros, setJuros] = useState('11.5')
  const r = useMemo(() => { const P = Math.max(0, valor - entrada); const n = Math.max(1, Math.round((+anos || 0) * 12)); const i = (+juros || 0) / 100 / 12; const parcela = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n; return { parcela, dif: parcela - aluguel } }, [valor, aluguel, entrada, anos, juros])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel para comprar" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel que você paga hoje" valor={aluguel} onChange={setAluguel} /><CampoMoeda label="Entrada disponível (+ FGTS)" valor={entrada} onChange={setEntrada} /><Campo label="Prazo do financiamento" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Parcela do financiamento (Price)', valor: brl2(r.parcela) }} itens={[{ rotulo: 'Aluguel atual', valor: brl2(aluguel) }, { rotulo: r.dif >= 0 ? 'Parcela acima do aluguel em' : 'Parcela abaixo do aluguel em', valor: brl2(Math.abs(r.dif)) }]} />{nota(r.dif <= 0 ? 'Sua parcela ficaria igual ou menor que o aluguel — comprando, você para de pagar aluguel e constrói patrimônio.' : 'A parcela ficaria acima do aluguel, mas você passa a construir patrimônio e o imóvel tende a valorizar. Eu te ajudo a achar a melhor relação entrada/prazo/parcela.')}</div></div>)
}
function CalcRentabilidade() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500)
  const r = useMemo(() => { const m = valor > 0 ? (aluguel / valor) * 100 : 0; return { m, a: m * 12, anoReais: aluguel * 12 } }, [valor, aluguel])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel mensal (esperado)" valor={aluguel} onChange={setAluguel} /></div><div><Resultado destaque={{ rotulo: 'Rentabilidade bruta ao ano', valor: pct(r.a) }} itens={[{ rotulo: 'Rentabilidade bruta ao mês', valor: pct(r.m) }, { rotulo: 'Aluguel em 12 meses', valor: brl(r.anoReais) }]} />{nota('Rentabilidade bruta (antes de IPTU, condomínio, manutenção e impostos). Posso indicar os imóveis que mais valem a pena para investir.')}</div></div>)
}
function CalcInvestir() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500); const [taxa, setTaxa] = useState('10.5')
  const r = useMemo(() => { const yAl = valor > 0 ? (aluguel * 12 / valor) * 100 : 0; const aplic = valor * ((+taxa || 0) / 100); const aluguelAno = aluguel * 12; return { yAl, aplic, aluguelAno, dif: aluguelAno - aplic } }, [valor, aluguel, taxa])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel mensal que renderia" valor={aluguel} onChange={setAluguel} /><Campo label="Rendimento da aplicação (a.a.)" sufixo="% a.a." valor={taxa} onChange={setTaxa} step="0.1" /></div><div><Resultado destaque={{ rotulo: r.dif >= 0 ? 'O aluguel rende mais por ano' : 'A aplicação rende mais por ano', valor: brl(Math.abs(r.dif)) }} itens={[{ rotulo: 'Aluguel em 12 meses', valor: brl(r.aluguelAno) }, { rotulo: `Aplicando ${formatBRL(valor)} a ${pct(+taxa || 0)} a.a.`, valor: brl(r.aplic) }, { rotulo: 'Rentabilidade do aluguel', valor: `${pct(r.yAl)} a.a.` }]} />{nota('Comparação simplificada (bruta). O imóvel ainda costuma VALORIZAR ao longo do tempo, o que não entra na conta da aplicação. CDI ~10–11% a.a.; poupança ~6–7% a.a. — confirme as taxas atuais.')}</div></div>)
}
const M2_ORDENADO = [...BAIRROS_M2].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR'))
function CalcValorM2() {
  const [bairro, setBairro] = useState(M2_ORDENADO[0]?.bairro || ''); const [area, setArea] = useState('100')
  const d = M2_ORDENADO.find((x) => x.bairro === bairro)
  const est = (d?.m2 || 0) * (+area || 0)
  return (<div className="calc-grid"><div className="calc-form"><Select label="Bairro" valor={bairro} onChange={setBairro} opcoes={M2_ORDENADO.map((x) => x.bairro)} /><Campo label="Área (m²)" sufixo="m²" valor={area} onChange={setArea} /></div><div>{d && d.m2 ? <Resultado destaque={{ rotulo: `Estimativa para ${area} m² no ${bairro}`, valor: brl(est) }} itens={[{ rotulo: 'Preço médio do m² no bairro', valor: brl(d.m2) }, { rotulo: 'Fonte', valor: `${d.fonte} · ${d.ref}` }]} /> : <p className="section-sub">Ainda não tenho um valor de referência <b>oficial confirmado</b> para <b>{bairro}</b>. Me chama que eu faço a <b>avaliação real</b> desse bairro pra você — sem custo.</p>}{nota('Valor médio de REFERÊNCIA por bairro (venda), de fontes públicas (Proprietário Direto/IPD e ZAP). O preço real varia com padrão, estado, andar e localização exata. Para um número preciso do SEU imóvel, eu faço a avaliação — é grátis.')}</div></div>)
}
function CalcScore() {
  const [renda, setRenda] = useState(8000); const [parcela, setParcela] = useState(2400); const [score, setScore] = useState('bom'); const [nome, setNome] = useState('limpo'); const [tipo, setTipo] = useState('clt')
  const r = useMemo(() => { let pts = 0; const ratio = renda > 0 ? parcela / renda : 1; if (ratio <= 0.25) pts += 3; else if (ratio <= 0.3) pts += 2; else if (ratio <= 0.35) pts += 1; pts += score === 'otimo' ? 3 : score === 'bom' ? 2 : score === 'regular' ? 1 : 0; if (nome === 'limpo') pts += 2; else pts -= 2; pts += tipo === 'clt' ? 1 : 0; const nivel = pts >= 7 ? { t: 'Alta chance de aprovação', c: 'alta' } : pts >= 4 ? { t: 'Chance média — dá pra melhorar', c: 'media' } : { t: 'Chance baixa hoje — vamos preparar', c: 'baixa' }; return { ratio: ratio * 100, nivel } }, [renda, parcela, score, nome, tipo])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Renda familiar mensal" valor={renda} onChange={setRenda} /><CampoMoeda label="Parcela pretendida" valor={parcela} onChange={setParcela} /><Select label="Seu score" valor={score} onChange={setScore} opcoes={[{ v: 'otimo', t: 'Ótimo (700+)' }, { v: 'bom', t: 'Bom (500–699)' }, { v: 'regular', t: 'Regular (300–499)' }, { v: 'baixo', t: 'Baixo (<300)' }]} /><Select label="Nome" valor={nome} onChange={setNome} opcoes={[{ v: 'limpo', t: 'Limpo (sem restrição)' }, { v: 'restricao', t: 'Com restrição/negativado' }]} /><Select label="Tipo de renda" valor={tipo} onChange={setTipo} opcoes={[{ v: 'clt', t: 'CLT / servidor' }, { v: 'autonomo', t: 'Autônomo / MEI' }]} /></div><div><Resultado destaque={{ rotulo: 'Sua estimativa', valor: r.nivel.t }} itens={[{ rotulo: 'Parcela / renda', valor: `${pct(r.ratio)} (ideal ≤ 30%)` }]} />{nota('Estimativa educativa — não é uma análise de crédito oficial. O banco avalia score, renda comprovada, restrições e o imóvel. Se a chance estiver baixa, eu te ajudo a organizar tudo antes de pedir o crédito.')}</div></div>)
}
const CHECKLIST = [
  ['Você (comprador)', ['RG e CPF', 'Comprovante de estado civil (e do cônjuge)', 'Comprovante de residência atual', 'Comprovantes de renda (3 últimos meses)', 'Declaração de Imposto de Renda', 'Extrato do FGTS (se for usar)']],
  ['Financiamento (banco)', ['Carteira de trabalho ou contrato social (autônomo/MEI)', 'Simulação aprovada pelo banco', 'Ficha cadastral preenchida', 'Conta no banco do financiamento']],
  ['Imóvel e vendedor', ['Matrícula atualizada do imóvel', 'Certidão negativa de ônus do imóvel', 'Certidões do vendedor (pessoais/PJ)', 'IPTU quitado / negativa de débitos', 'Habite-se (imóvel novo)']],
]
function Checklist() {
  const [marcados, setMarcados] = useState(() => { try { return JSON.parse(localStorage.getItem('vg_checklist') || '{}') } catch { return {} } })
  const toggle = (k) => setMarcados((m) => { const n = { ...m, [k]: !m[k] }; try { localStorage.setItem('vg_checklist', JSON.stringify(n)) } catch {} return n })
  const total = CHECKLIST.reduce((a, [, its]) => a + its.length, 0)
  const feitos = Object.values(marcados).filter(Boolean).length
  return (<div><div className="check-progress"><div className="check-bar"><span style={{ width: `${(feitos / total) * 100}%` }} /></div><b>{feitos}/{total}</b></div><div className="check-cols">{CHECKLIST.map(([grupo, itens]) => (<div className="check-grupo" key={grupo}><h4>{grupo}</h4>{itens.map((it) => { const k = grupo + '|' + it; return (<label className={`check-item ${marcados[k] ? 'on' : ''}`} key={k}><input type="checkbox" checked={!!marcados[k]} onChange={() => toggle(k)} /><span>{it}</span></label>) })}</div>))}</div>{nota('Marque conforme for reunindo — fica salvo no seu navegador. Lista geral; no seu caso eu envio a relação exata que o banco/cartório vai pedir.')}</div>)
}
function CalcComissao() {
  const [valor, setValor] = useState(500000); const [com, setCom] = useState('6'); const [corretor, setCorretor] = useState('50')
  const r = useMemo(() => { const total = valor * ((+com || 0) / 100); const parteCorretor = total * ((+corretor || 0) / 100); return { total, parteCorretor, parteImob: total - parteCorretor } }, [valor, com, corretor])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor da venda" valor={valor} onChange={setValor} /><Campo label="Comissão" sufixo="%" valor={com} onChange={setCom} step="0.5" /><Campo label="Parte do corretor" sufixo="%" valor={corretor} onChange={setCorretor} step="5" /></div><div><Resultado destaque={{ rotulo: 'Comissão total', valor: brl(r.total) }} itens={[{ rotulo: 'Parte do corretor', valor: brl(r.parteCorretor) }, { rotulo: 'Parte da imobiliária/captação', valor: brl(r.parteImob) }]} />{nota('Ferramenta de apoio ao corretor. Percentuais e divisões variam por contrato e imobiliária.')}</div></div>)
}
function FichaAvaliacao() {
  const [f, setF] = useState({ tipo: 'Casa', bairro: '', area: '', quartos: '', suites: '', vagas: '', estado: 'Bem conservado', preco: 0, dif: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const texto = `${f.tipo}${f.bairro ? ` no ${f.bairro}` : ''} — Uberlândia\n${[f.area && `${f.area} m²`, f.quartos && `${f.quartos} quartos`, f.suites && `${f.suites} suíte(s)`, f.vagas && `${f.vagas} vagas`].filter(Boolean).join(' · ')}\nEstado: ${f.estado}${f.preco ? `\nValor: ${formatBRL(f.preco)}` : ''}${f.dif ? `\nDiferenciais: ${f.dif}` : ''}\n\nFale com Vinícius Graton — Consultor de Imóveis em Uberlândia.`
  const copiar = () => { try { navigator.clipboard.writeText(texto) } catch {} }
  return (<div className="calc-grid"><div className="calc-form"><Select label="Tipo" valor={f.tipo} onChange={set('tipo')} opcoes={['Casa', 'Apartamento', 'Casa em condomínio', 'Terreno', 'Comercial']} /><label className="calc-campo"><span>Bairro</span><div className="calc-input"><input value={f.bairro} onChange={set('bairro')} list="bf" /><datalist id="bf">{BAIRROS_IMOVEL.map((b) => <option key={b} value={b} />)}</datalist></div></label><div className="calc-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Campo label="Área (m²)" valor={f.area} onChange={set('area')} /><Campo label="Quartos" valor={f.quartos} onChange={set('quartos')} /><Campo label="Suítes" valor={f.suites} onChange={set('suites')} /><Campo label="Vagas" valor={f.vagas} onChange={set('vagas')} /></div><CampoMoeda label="Preço pretendido" valor={f.preco} onChange={(v) => setF((s) => ({ ...s, preco: v }))} /><label className="calc-campo"><span>Diferenciais</span><div className="calc-input"><input value={f.dif} onChange={set('dif')} placeholder="Reforma, sol da manhã, andar alto..." /></div></label></div><div><div className="ficha-preview">{texto}</div><div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}><button className="btn btn-gold" type="button" onClick={copiar}>Copiar resumo</button><a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a></div>{nota('Gera um resumo pronto pra divulgar o imóvel. Ferramenta de apoio ao corretor.')}</div></div>)
}

function CalcRenda() {
  const [valor, setValor] = useState(500000); const [entrada, setEntrada] = useState(100000); const [prazo, setPrazo] = useState('30'); const [juros, setJuros] = useState('10.5'); const [comp, setComp] = useState('30')
  const r = useMemo(() => {
    const fin = Math.max(0, valor - entrada); const i = (+juros / 100) / 12; const n = (+prazo || 0) * 12
    const parcela = i > 0 ? fin * i / (1 - Math.pow(1 + i, -n)) : (n > 0 ? fin / n : 0)
    const renda = (+comp > 0) ? parcela / (+comp / 100) : 0
    return { fin, parcela, renda }
  }, [valor, entrada, prazo, juros, comp])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Entrada" valor={entrada} onChange={setEntrada} /><Campo label="Prazo" sufixo="anos" valor={prazo} onChange={setPrazo} /><Campo label="Juros (a.a.)" sufixo="%" valor={juros} onChange={setJuros} step="0.1" /><Campo label="Comprometimento de renda" sufixo="%" valor={comp} onChange={setComp} step="5" /></div><div><Resultado destaque={{ rotulo: 'Renda necessária', valor: brl(r.renda) }} itens={[{ rotulo: 'Valor financiado', valor: brl(r.fin) }, { rotulo: '1ª parcela (Price)', valor: brl2(r.parcela) }]} />{nota('Os bancos costumam limitar a parcela a ~30% da renda familiar bruta. A taxa e o limite variam por banco e perfil — vale simular a aprovação antes de fechar.')}</div></div>)
}
function CalcEntrada() {
  const [valor, setValor] = useState(500000); const [perc, setPerc] = useState('20'); const [meses, setMeses] = useState('24'); const [rend, setRend] = useState('0.6')
  const r = useMemo(() => {
    const meta = valor * (+perc / 100); const i = (+rend / 100); const n = +meses || 0
    const pmt = i > 0 ? meta * i / (Math.pow(1 + i, n) - 1) : (n > 0 ? meta / n : 0)
    const aportado = pmt * n; const rendimento = Math.max(0, meta - aportado)
    return { meta, pmt, aportado, rendimento }
  }, [valor, perc, meses, rend])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><Campo label="Entrada desejada" sufixo="%" valor={perc} onChange={setPerc} step="5" /><Campo label="Prazo pra juntar" sufixo="meses" valor={meses} onChange={setMeses} /><Campo label="Rendimento (a.m.)" sufixo="%" valor={rend} onChange={setRend} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Guardar por mês', valor: brl2(r.pmt) }} itens={[{ rotulo: 'Meta de entrada', valor: brl(r.meta) }, { rotulo: 'Total que você aporta', valor: brl(r.aportado) }, { rotulo: 'Rendimento no período', valor: brl(r.rendimento) }]} />{nota('Estimativa por juros compostos. ~0,6% a.m. é uma referência conservadora de aplicação de baixo risco — o rendimento real varia. Não considera inflação nem mudança no preço do imóvel.')}</div></div>)
}
function CalcGanho() {
  const [venda, setVenda] = useState(600000); const [compra, setCompra] = useState(400000); const [unico, setUnico] = useState(false); const [reinveste, setReinveste] = useState(false)
  const r = useMemo(() => {
    const lucro = Math.max(0, venda - compra); const isentoUnico = unico && venda <= 440000; const isento = isentoUnico || reinveste
    const ir = isento ? 0 : lucro * 0.15
    return { lucro, ir, liquido: venda - ir, isento, isentoUnico }
  }, [venda, compra, unico, reinveste])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor de venda" valor={venda} onChange={setVenda} /><CampoMoeda label="Valor de compra (custo)" valor={compra} onChange={setCompra} /><label className="calc-check"><input type="checkbox" checked={unico} onChange={(e) => setUnico(e.target.checked)} /><span>É meu único imóvel e a venda é de até R$ 440 mil</span></label><label className="calc-check"><input type="checkbox" checked={reinveste} onChange={(e) => setReinveste(e.target.checked)} /><span>Vou comprar outro imóvel residencial em até 180 dias</span></label></div><div><Resultado destaque={{ rotulo: r.isento ? 'Imposto (isento)' : 'Imposto estimado (IR)', valor: brl(r.ir) }} itens={[{ rotulo: 'Lucro (ganho de capital)', valor: brl(r.lucro) }, { rotulo: 'Você recebe (líquido)', valor: brl(r.liquido) }, { rotulo: 'Situação', valor: r.isento ? (r.isentoUnico ? 'Isento · único ≤ 440 mil' : 'Isento · reinvestimento') : 'Tributável · 15%' }]} />{nota('Regra geral: 15% sobre o lucro na venda. Isenções em lei: único imóvel vendido por até R$ 440 mil (1x a cada 5 anos) e reinvestimento em residencial em 180 dias. Existem fatores de redução por tempo de posse — confirme com um contador antes de declarar.')}</div></div>)
}
function CalcACM() {
  const ord = useMemo(() => [...BAIRROS_M2].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')), [])
  const [bairro, setBairro] = useState(ord[0]?.bairro || ''); const [area, setArea] = useState('120'); const [estado, setEstado] = useState('0')
  const r = useMemo(() => {
    const reg = BAIRROS_M2.find((x) => x.bairro === bairro); const m2 = reg?.m2 || 0
    const central = m2 * (+area || 0) * (1 + (+estado / 100))
    return { m2, central, min: central * 0.93, max: central * 1.07, fonte: reg?.fonte, ref: reg?.ref }
  }, [bairro, area, estado])
  return (<div className="calc-grid"><div className="calc-form"><Select label="Bairro" valor={bairro} onChange={setBairro} opcoes={ord.map((x) => x.bairro)} /><Campo label="Área privativa" sufixo="m²" valor={area} onChange={setArea} /><Select label="Estado do imóvel" valor={estado} onChange={setEstado} opcoes={[{ v: '8', t: 'Novo / lançamento' }, { v: '4', t: 'Reformado' }, { v: '0', t: 'Bem conservado' }, { v: '-10', t: 'Precisa de reforma' }]} /></div><div>{r.m2 ? <Resultado destaque={{ rotulo: 'Preço sugerido', valor: brl(r.central) }} itens={[{ rotulo: 'Faixa de mercado', valor: `${brl(r.min)} a ${brl(r.max)}` }, { rotulo: `m² médio em ${bairro}`, valor: brl(r.m2) }, { rotulo: 'Fonte do m²', valor: `${r.fonte || '—'}${r.ref ? ` (${r.ref})` : ''}` }]} /> : <p className="section-sub">Ainda não há um valor de referência <b>oficial confirmado</b> para <b>{bairro}</b> nas fontes públicas. Para esse bairro, faça uma <b>avaliação presencial</b> (posição, padrão e estado definem o preço real).</p>}{nota('Estimativa pela mediana de venda do bairro × área, ajustada pelo estado, de fontes públicas (Proprietário Direto/IPD e ZAP). É um ponto de partida — posição, andar, vista e acabamento ajustam o valor final. A avaliação presencial é o que fecha o preço.')}</div></div>)
}

const RENDER = { financiamento: CalcFinanciamento, capacidade: CalcCapacidade, renda: CalcRenda, fgts: CalcFGTS, amortizacao: CalcAmortizacao, custos: CalcCustos, aluguel: CalcAluguel, rentabilidade: CalcRentabilidade, investir: CalcInvestir, entrada: CalcEntrada, ganho: CalcGanho, valorm2: CalcValorM2, score: CalcScore, checklist: Checklist, comissao: CalcComissao, acm: CalcACM, ficha: FichaAvaliacao, rotina: FerramentaRotina }

const ORDEM_KEY = 'vg_ferr_ordem'
const idsVoce = () => TOOLS.filter((t) => t.cat === 'voce').map((t) => t.id)
// ordem salva do cliente, completada com ferramentas novas que ainda não estavam na lista
function lerOrdem() {
  const base = idsVoce()
  try {
    const salvo = JSON.parse(localStorage.getItem(ORDEM_KEY) || '[]')
    const validos = salvo.filter((id) => base.includes(id))
    return [...validos, ...base.filter((id) => !validos.includes(id))]
  } catch { return base }
}

export default function Ferramentas() {
  const [ativa, setAtiva] = useState('financiamento')
  const painelRef = useRef(null)
  const [logado, setLogado] = useState(false)
  const [ordem, setOrdem] = useState(idsVoce)
  const [arrastando, setArrastando] = useState(null)
  const [salvo, setSalvo] = useState(false)
  useSEO({ title: 'Ferramentas e calculadoras de imóveis — Uberlândia', description: 'Calculadoras gratuitas: financiamento, FGTS, amortização, ITBI, aluguel x compra, rentabilidade, valor do m², chance de aprovação, checklist de documentos e mais. Por Vinícius Graton.', path: '/ferramentas' })

  useEffect(() => {
    setLogado(estaLogado())
    setOrdem(lerOrdem())
    const ler = () => setLogado(estaLogado())
    window.addEventListener('vg-conta', ler)
    return () => window.removeEventListener('vg-conta', ler)
  }, [])

  const atual = TOOLS.find((t) => t.id === ativa)
  const Ativa = RENDER[ativa]
  const escolher = (id) => { setAtiva(id); setTimeout(() => painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }
  const grupo = (cat) => TOOLS.filter((t) => t.cat === cat)
  // grupo "voce" na ordem personalizada do cliente
  const voceOrdenado = ordem.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean)

  const salvarOrdem = (nova) => {
    setOrdem(nova)
    try { localStorage.setItem(ORDEM_KEY, JSON.stringify(nova)) } catch {}
    setSalvo(true); setTimeout(() => setSalvo(false), 1600)
  }
  const aoSoltar = (alvoId) => {
    if (!arrastando || arrastando === alvoId) return
    const nova = [...ordem]
    const de = nova.indexOf(arrastando)
    const para = nova.indexOf(alvoId)
    if (de < 0 || para < 0) return
    nova.splice(de, 1)
    nova.splice(para, 0, arrastando)
    salvarOrdem(nova)
  }
  const restaurarOrdem = () => { try { localStorage.removeItem(ORDEM_KEY) } catch {}; setOrdem(idsVoce()) }

  const Card = (t) => t.to
    ? <Link key={t.id} className={`ferr-card ${t.destaque ? 'ferr-card--gold' : ''}`} to={t.to}><span className="ferr-ico"><FerrIcon name={t.icon} /></span><span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span></Link>
    : <button key={t.id} className={`ferr-card ${ativa === t.id ? 'on' : ''}`} onClick={() => escolher(t.id)}><span className="ferr-ico"><FerrIcon name={t.icon} /></span><span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span></button>

  // versão arrastável (só p/ cliente logado): mesmo card, com handle e eventos de drag
  const CardDrag = (t) => {
    const inner = (
      <>
        <span className="ferr-drag-handle" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>
        <span className="ferr-ico"><FerrIcon name={t.icon} /></span>
        <span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span>
      </>
    )
    const common = {
      key: t.id,
      className: `ferr-card ferr-card--drag ${ativa === t.id ? 'on' : ''} ${arrastando === t.id ? 'is-dragging' : ''}`,
      draggable: true,
      onDragStart: (e) => { setArrastando(t.id); e.dataTransfer.effectAllowed = 'move' },
      onDragEnd: () => setArrastando(null),
      onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
      onDrop: (e) => { e.preventDefault(); aoSoltar(t.id) },
    }
    return t.to
      ? <Link {...common} to={t.to} onClick={(e) => { if (arrastando) e.preventDefault() }}>{inner}</Link>
      : <button {...common} type="button" onClick={() => escolher(t.id)}>{inner}</button>
  }

  return (
    <main className="pagina section--light det ferramentas-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 8px' }}>
            <h1 className="sr-only">Ferramentas e calculadoras de imóveis em Uberlândia</h1>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramentas grátis</span>
            <h2 className="section-title">Tudo que você precisa <br className="quebra-tit" /><em>calcular e decidir</em></h2>
            <p className="section-sub" style={{ marginTop: 14 }}>Escolha uma ferramenta, informe os dados e veja o resultado na hora — sem cadastro.</p>
          </div>
        </Reveal>

        <div className="ferr-cat-head">
          <h3 className="ferr-cat">Para você — comprador e investidor</h3>
          {logado ? (
            <span className="ferr-ordenar-dica">{salvo ? '✓ ordem salva' : '✦ arraste os cards pra montar do seu jeito'}<button type="button" className="ferr-restaurar" onClick={restaurarOrdem}>restaurar padrão</button></span>
          ) : (
            <Link to="/conta" className="ferr-ordenar-dica ferr-ordenar-dica--link">Entre na sua conta pra personalizar e salvar esta ordem →</Link>
          )}
        </div>
        <div className="ferr-grid">{(logado ? voceOrdenado.map(CardDrag) : voceOrdenado.map(Card))}</div>

        <h3 className="ferr-cat">Para o corretor</h3>
        <div className="ferr-grid">{grupo('corretor').map(Card)}</div>

        <div className="calc-painel" ref={painelRef} style={{ marginTop: 30 }}>
          <h3 className="calc-painel-tit"><span className="calc-tit-ico"><FerrIcon name={atual.icon} size={20} /></span>{atual.nome}</h3>
          <Ativa />
          <div className="calc-cta">
            <span>Quer que eu faça essa conta com os números reais e te mostre as melhores opções?</span>
            <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as ferramentas no site e quero sua ajuda.')} target="_blank" rel="noopener"><IconWhats /> Falar com o Vinícius</a>
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}><Link className="btn btn-ghost" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link></div>
      </div>
    </main>
  )
}
