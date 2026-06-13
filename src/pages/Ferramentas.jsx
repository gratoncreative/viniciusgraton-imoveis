import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CampoMoeda from '../components/CampoMoeda'
import { BAIRROS_IMOVEL, linkWhatsApp } from '../data'
import BAIRROS_M2 from '../bairros-m2.json'
import { formatBRL } from '../extenso'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'

// ─── helpers numéricos ──────────────────────────────────────────────────────
const brl  = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct  = (n) => `${(isFinite(n) ? n : 0).toFixed(2).replace('.', ',')}%`
const mesesRestantes = (saldo, parcela, jurosAa) => {
  const i = jurosAa / 100 / 12
  if (parcela <= saldo * i) return Infinity
  return Math.ceil(-Math.log(1 - (i * saldo) / parcela) / Math.log(1 + i))
}

// ─── ícones SVG de linha ────────────────────────────────────────────────────
const ICN = {
  bank:    'M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6M7 10h.01M17 10h.01',
  chart:   'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4',
  wallet:  'M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h17a1 1 0 0 1 1 1v3m0 0h-4a2 2 0 0 0 0 4h4',
  calc:    'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  receipt: 'M6 2v20l2-1.5L10 22l2-1.5L14 22l2-1.5L18 22V2l-2 1.5L14 2l-2 1.5L10 2 8 3.5 6 2zM9 7h6M9 11h6M9 15h4',
  scale:   'M12 3v18M7 21h10M5 7h14l-3 7H8L5 7zM12 7l-7 0m7 0 7 0M5 7l-2 5h4l-2-5zm14 0-2 5h4l-2-5z',
  trend:   'M3 17l6-6 4 4 8-8M15 7h6v6',
  coins:   'M8 8m-5 0a5 3 0 1 0 10 0a5 3 0 1 0-10 0M3 8v5c0 1.66 2.24 3 5 3M13 12.5c0 1.66 2.24 3 5 3s5-1.34 5-3M16 13.5m-5 0a5 3 0 1 0 10 0a5 3 0 1 0-10 0M11 13.5v5c0 1.66 2.24 3 5 3s5-1.34 5-3v-5',
  home:    'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  gauge:   'M12 14l4-4M4 20a8 8 0 1 1 16 0M7.5 13.5h.01M16.5 13.5h.01M9 9.5h.01',
  doc:     'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13l2 2 4-4',
  compare: 'M5 4h5v16H5zM14 4h5v16h-5zM12 2v20',
  map:     'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  percent: 'M19 5 5 19M7.5 7.5h.01M16.5 16.5h.01M6 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M15 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  edit:    'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  bell:    'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  lock:    'M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM12 17v-2M8 11V7a4 4 0 0 1 8 0v4',
  camera:  'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  rocket:  'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zm3.95.95-1.41-1.41 4.82-4.82A6 6 0 0 0 13 7a6 6 0 0 1 4 4 6 6 0 0 0-4.55 1.86zM14 11.5l-3 3',
}
const FI = ({ name, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICN[name] || ICN.calc} />
  </svg>
)

// ─── seções e ferramentas ────────────────────────────────────────────────────
const SECOES = [
  { id: 'comprador',     titulo: 'Para compradores',       sub: 'Simule, planeje e calcule antes de fechar',         icon: 'home'   },
  { id: 'pro',           titulo: 'Área do Corretor',        sub: 'Ferramentas exclusivas para profissionais do mercado imobiliário', icon: 'star', pro: true },
  { id: 'investidor',    titulo: 'Para investidores',       sub: 'Analise rentabilidade, retorno e ganho de capital', icon: 'trend'  },
  { id: 'financiamento', titulo: 'Financiamento e FGTS',    sub: 'Simule o uso do fundo e amortize com precisão',     icon: 'bank'   },
  { id: 'fotos',         titulo: 'Fotos e imagens',         sub: 'Endireite, marque e converta fotos sem sair do navegador', icon: 'camera' },
  { id: 'explorar',      titulo: 'Explorar o mercado',      sub: 'Compare imóveis e explore o mercado visual',        icon: 'map'    },
]

const TOOLS = [
  // comprador
  { id: 'financiamento', nome: 'Simulador de financiamento', desc: 'Parcela e custo total — SAC e Price.',         icon: 'bank',    sec: 'comprador',     popular: true },
  { id: 'capacidade',    nome: 'Quanto consigo financiar?',  desc: 'O imóvel que cabe na sua renda.',              icon: 'chart',   sec: 'comprador',     popular: true },
  { id: 'renda',         nome: 'Renda necessária',           desc: 'Qual renda o banco exige para esse imóvel.',   icon: 'wallet',  sec: 'comprador'  },
  { id: 'custos',        nome: 'ITBI e cartório',            desc: 'Quanto reservar além do preço em Uberlândia.', icon: 'receipt', sec: 'comprador'  },
  { id: 'entrada',       nome: 'Plano para a entrada',       desc: 'Quanto guardar por mês para dar a entrada.',   icon: 'coins',   sec: 'comprador'  },
  { id: 'score',         nome: 'Chance de aprovação',        desc: 'Estimativa do seu perfil de crédito.',         icon: 'gauge',   sec: 'comprador'  },
  { id: 'checklist',     nome: 'Checklist de documentos',    desc: 'Tudo que você precisa reunir, por etapa.',     icon: 'doc',     sec: 'comprador'  },
  // investidor
  { id: 'valorm2',       nome: 'Valor do m² por bairro',    desc: 'Preço médio de venda por bairro de Uberlândia.', icon: 'home',  sec: 'investidor' },
  { id: 'rentabilidade', nome: 'Rentabilidade do aluguel',  desc: 'Quanto um imóvel rende ao ano.',               icon: 'trend',   sec: 'investidor', popular: true },
  { id: 'investir',      nome: 'Imóvel × CDI / Poupança',  desc: 'Vale comprar para alugar ou aplicar?',          icon: 'coins',   sec: 'investidor' },
  { id: 'aluguel',       nome: 'Alugar ou financiar?',      desc: 'Compare a parcela com o aluguel atual.',        icon: 'scale',   sec: 'investidor' },
  { id: 'ganho',         nome: 'IR na venda do imóvel',     desc: 'Ganho de capital e isenções em lei.',           icon: 'percent', sec: 'investidor' },
  // financiamento
  { id: 'fgts',          nome: 'Simulador de FGTS',         desc: 'Como o FGTS reduz a entrada e a parcela.',     icon: 'wallet',  sec: 'financiamento' },
  { id: 'amortizacao',   nome: 'Amortização com FGTS',      desc: 'Quanto o FGTS encurta o financiamento.',       icon: 'calc',    sec: 'financiamento' },
  // fotos e imagens
  { id: 'endireitar',    nome: 'Endireitar foto',           desc: 'Corrija a inclinação e a rotação de fotos.',   icon: 'camera',  sec: 'fotos' },
  { id: 'marca-agua',    nome: "Marca d'água em fotos",     desc: 'Adicione seu logo ou texto em cada foto.',     icon: 'edit',    sec: 'fotos' },
  { id: 'redimensionar', nome: 'Redimensionar foto',        desc: 'Reduza o tamanho para WhatsApp ou portal.',    icon: 'edit',    sec: 'fotos' },
  { id: 'converter',     nome: 'Conversor de fotos',        desc: 'JPG · PNG · WebP · AVIF em lote.',             icon: 'edit',    sec: 'fotos', to: '/ferramentas/converter' },
  // explorar
  { id: 'comparar',      nome: 'Comparar imóveis',          desc: 'Compare até 3 imóveis lado a lado.',           icon: 'compare', sec: 'explorar', to: '/comparar' },
  { id: 'mapa',          nome: 'Mapa de imóveis',           desc: 'Explore imóveis por região de Uberlândia.',    icon: 'map',     sec: 'explorar', to: '/mapa'     },
  // pro
  { id: 'acm',           nome: 'ACM — Avaliação de imóvel', desc: 'Faixa de preço pelo m² do bairro.',            icon: 'home',    sec: 'pro', pro: true },
  { id: 'comissao',      nome: 'Calculadora de comissão',   desc: 'Comissão e divisão corretor / imobiliária.',   icon: 'coins',   sec: 'pro', pro: true },
  { id: 'ficha',         nome: 'Ficha de avaliação',        desc: 'Resumo do imóvel pronto para compartilhar.',   icon: 'doc',     sec: 'pro', pro: true },
  { id: 'melhorar',      nome: 'Melhorar fotos com IA',     desc: 'HDR, contraste e nitidez automáticos.',        icon: 'camera',  sec: 'pro', pro: true, toPro: true },
  { id: 'remover',       nome: 'Remover marca d\'água com IA', desc: 'Remove logos e marcas de fotos em lote.',   icon: 'edit',    sec: 'pro', pro: true, toPro: true },
  { id: 'impulsionar',   nome: 'Impulsionar anúncio',       desc: 'Destaque seu imóvel por 7, 15 ou 30 dias.',    icon: 'rocket',  sec: 'pro', pro: true, to: '/impulsionar' },
]

const PILLS = [
  { id: 'todos',         label: 'Todas'          },
  { id: 'comprador',     label: 'Comprador'       },
  { id: 'investidor',    label: 'Investidor'      },
  { id: 'financiamento', label: 'Financiamento'   },
  { id: 'fotos',         label: 'Fotos'           },
  { id: 'explorar',      label: 'Explorar'        },
  { id: 'pro',           label: '✦ Corretor PRO' },
]

// ─── componentes de campo ────────────────────────────────────────────────────
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
      <div className="calc-input">
        <select value={valor} onChange={(e) => onChange(e.target.value)} style={{ border: 'none', background: 'transparent', width: '100%', font: 'inherit', color: 'inherit', padding: '14px 0' }}>
          {opcoes.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.t ?? o}</option>)}
        </select>
      </div>
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

// ─── calculadoras ────────────────────────────────────────────────────────────
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
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Entrada própria (sem FGTS)" valor={entrada} onChange={setEntrada} /><CampoMoeda label="Saldo do seu FGTS" valor={fgts} onChange={setFgts} /><Campo label="Prazo" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Entrada total com o FGTS', valor: brl(r.entradaTotal) }} itens={[{ rotulo: 'Equivale a', valor: `${pct(r.pctEntrada)} do imóvel` }, { rotulo: 'Valor financiado', valor: brl(r.fin) }, { rotulo: 'Parcela (Price)', valor: brl2(r.parcela) }, { rotulo: 'Sua parcela diminui em', valor: brl2(Math.max(0, r.economiaParcela)) }]} />{nota('O FGTS pode entrar na entrada se você atender às regras: 3+ anos de FGTS, imóvel residencial urbano e sem outro imóvel/financiamento SFH na região. Eu confirmo se você se enquadra.')}</div></div>)
}
function CalcAmortizacao() {
  const [saldo, setSaldo] = useState(300000); const [parcela, setParcela] = useState(3200); const [juros, setJuros] = useState('11.5'); const [fgts, setFgts] = useState(50000)
  const r = useMemo(() => {
    const j = +juros || 0; const i = j / 100 / 12
    const n0 = mesesRestantes(saldo, parcela, j); const n1 = mesesRestantes(Math.max(0, saldo - fgts), parcela, j)
    const econ = (isFinite(n0) && isFinite(n1)) ? n0 - n1 : 0
    const econJuros = (isFinite(n0) && isFinite(n1) && econ > 0) ? (parcela * n0) - (fgts + parcela * n1) : 0
    const jurosMes = saldo * i
    return { n0, n1, econ, econJuros, jurosMes, parcela }
  }, [saldo, parcela, juros, fgts])
  const meses = (m) => isFinite(m) ? `${m} meses (~${(m / 12).toFixed(1).replace('.', ',')} anos)` : '—'
  const semCobrir = !isFinite(r.n0)
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Saldo devedor atual" valor={saldo} onChange={setSaldo} /><CampoMoeda label="Parcela atual" valor={parcela} onChange={setParcela} /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /><CampoMoeda label="FGTS para amortizar" valor={fgts} onChange={setFgts} /></div><div>{semCobrir ? (<><Resultado destaque={{ rotulo: 'Atenção: parcela insuficiente', valor: `Juros/mês: ${brl2(r.jurosMes)}` }} itens={[{ rotulo: 'Sua parcela atual', valor: brl2(parcela) }, { rotulo: 'Juros mensais sobre o saldo', valor: brl2(r.jurosMes) }, { rotulo: 'Déficit mensal', valor: brl2(r.jurosMes - parcela) }]} />{nota('Sua parcela não cobre os juros mensais — o saldo devedor está crescendo em vez de diminuir. Isso pode ocorrer em crédito rotativo ou reajuste de renda variável. Solicite ao banco revisão da parcela.')}</>) : (<><Resultado destaque={{ rotulo: r.econ > 0 ? 'Você encurta o financiamento em' : 'Simule os valores', valor: r.econ > 0 ? `${r.econ} meses (~${(r.econ / 12).toFixed(1).replace('.', ',')} anos)` : '—' }} itens={[{ rotulo: 'Faltam hoje', valor: meses(r.n0) }, { rotulo: 'Após amortizar', valor: meses(r.n1) }, { rotulo: 'Novo saldo devedor', valor: brl(Math.max(0, saldo - fgts)) }, { rotulo: 'Economia total em juros (líq.)', valor: r.econJuros > 0 ? brl(r.econJuros) : '—' }]} />{nota('Amortizar reduzindo o PRAZO é o que mais economiza juros. Economia líquida = juros poupados – FGTS usado. O FGTS pode ser usado a cada 2 anos. Confirme as regras com o banco.')}</>)}</div></div>)
}
function CalcCustos() {
  const [valor, setValor] = useState(500000)
  const r = useMemo(() => { const itbi = valor * 0.02; const cartorio = valor * 0.012; const avaliacao = 3500; return { itbi, cartorio, avaliacao, total: itbi + cartorio + avaliacao } }, [valor])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /></div><div><Resultado destaque={{ rotulo: 'Reserve além do preço do imóvel', valor: brl(r.total) }} itens={[{ rotulo: 'ITBI — 2% (Uberlândia)', valor: brl(r.itbi) }, { rotulo: 'Escritura + registro (estimativa)', valor: brl(r.cartorio) }, { rotulo: 'Avaliação bancária (estimativa)', valor: brl(r.avaliacao) }]} />{nota('ITBI de Uberlândia: 2% na compra comum (pode ser reduzido no SFH). Avaliação bancária é cobrada pelo banco antes do financiamento — valor estimado em ~R$3.500. Confirmo os custos exatos no atendimento.')}</div></div>)
}
function CalcAluguel() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500); const [entrada, setEntrada] = useState(100000); const [anos, setAnos] = useState('30'); const [juros, setJuros] = useState('11.5'); const [iptuCond, setIptuCond] = useState(500)
  const r = useMemo(() => { const P = Math.max(0, valor - entrada); const n = Math.max(1, Math.round((+anos || 0) * 12)); const i = (+juros || 0) / 100 / 12; const parcela = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n; const custo = parcela + iptuCond; return { parcela, custo, dif: custo - aluguel } }, [valor, aluguel, entrada, anos, juros, iptuCond])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel para comprar" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel que você paga hoje" valor={aluguel} onChange={setAluguel} /><CampoMoeda label="Entrada disponível (+ FGTS)" valor={entrada} onChange={setEntrada} /><Campo label="Prazo do financiamento" sufixo="anos" valor={anos} onChange={setAnos} min="1" /><Campo label="Juros (ao ano)" sufixo="% a.a." valor={juros} onChange={setJuros} step="0.1" /><CampoMoeda label="IPTU + condomínio/mês (estimativa)" valor={iptuCond} onChange={setIptuCond} /></div><div><Resultado destaque={{ rotulo: 'Custo mensal comprando', valor: brl2(r.custo) }} itens={[{ rotulo: 'Parcela do financiamento (Price)', valor: brl2(r.parcela) }, { rotulo: 'IPTU + condomínio/mês', valor: brl2(iptuCond) }, { rotulo: 'Aluguel atual', valor: brl2(aluguel) }, { rotulo: r.dif >= 0 ? 'Comprar custa a mais por mês' : 'Comprar economiza por mês', valor: brl2(Math.abs(r.dif)) }]} />{nota(r.dif <= 0 ? 'Comprar fica igual ou mais barato que alugar — e você para de financiar o patrimônio do locador.' : 'Comprar custa um pouco mais por mês, mas você constrói patrimônio e o imóvel tende a valorizar. Eu te ajudo a simular entrada/prazo para equilibrar o custo.')}</div></div>)
}
function CalcRentabilidade() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500); const [iptuCond, setIptuCond] = useState(600)
  const r = useMemo(() => { const m = valor > 0 ? (aluguel / valor) * 100 : 0; const net = Math.max(0, aluguel - iptuCond); const mn = valor > 0 ? (net / valor) * 100 : 0; return { m, a: m * 12, mn, an: mn * 12, anoReais: aluguel * 12 } }, [valor, aluguel, iptuCond])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel mensal (esperado)" valor={aluguel} onChange={setAluguel} /><CampoMoeda label="IPTU + condomínio/mês (estimativa)" valor={iptuCond} onChange={setIptuCond} /></div><div><Resultado destaque={{ rotulo: 'Rentabilidade bruta ao ano', valor: pct(r.a) }} itens={[{ rotulo: 'Rentabilidade líquida estimada ao ano', valor: pct(r.an) }, { rotulo: 'Rentabilidade bruta ao mês', valor: pct(r.m) }, { rotulo: 'Aluguel em 12 meses', valor: brl(r.anoReais) }, { rotulo: 'IPTU + cond em 12 meses', valor: brl(iptuCond * 12) }]} />{nota('Líquida estimada (após IPTU e cond, antes de IR e manutenção). Bom investimento costuma render 0,4–0,6% líquido/mês. Posso indicar os imóveis com melhor yield em Uberlândia.')}</div></div>)
}
function CalcInvestir() {
  const [valor, setValor] = useState(500000); const [aluguel, setAluguel] = useState(2500); const [taxa, setTaxa] = useState('10.5'); const [valorizacao, setValorizacao] = useState('5')
  const r = useMemo(() => { const yAl = valor > 0 ? (aluguel * 12 / valor) * 100 : 0; const aplic = valor * ((+taxa || 0) / 100); const aluguelAno = aluguel * 12; const valoriz = valor * ((+valorizacao || 0) / 100); const totalImovel = aluguelAno + valoriz; return { yAl, aplic, aluguelAno, valoriz, totalImovel, difComValor: totalImovel - aplic } }, [valor, aluguel, taxa, valorizacao])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel mensal esperado" valor={aluguel} onChange={setAluguel} /><Campo label="Rendimento da aplicação (a.a.)" sufixo="% a.a." valor={taxa} onChange={setTaxa} step="0.1" /><Campo label="Valorização do imóvel (a.a.)" sufixo="% a.a." valor={valorizacao} onChange={setValorizacao} step="0.5" /></div><div><Resultado destaque={{ rotulo: r.difComValor >= 0 ? 'Imóvel supera a aplicação em' : 'Aplicação supera o imóvel em', valor: brl(Math.abs(r.difComValor)) }} itens={[{ rotulo: 'Aluguel em 12 meses', valor: brl(r.aluguelAno) }, { rotulo: `Valorização estimada (${pct(+valorizacao||0)} a.a.)`, valor: brl(r.valoriz) }, { rotulo: 'Retorno total do imóvel', valor: brl(r.totalImovel) }, { rotulo: `Aplicando a ${pct(+taxa||0)} a.a.`, valor: brl(r.aplic) }, { rotulo: 'Rentabilidade do aluguel', valor: `${pct(r.yAl)} a.a.` }]} />{nota('Uberlândia registrou ~5–8% a.a. de valorização em bairros consolidados. Comparação bruta — não inclui IR, inflação nem liquidez. Posso simular com o imóvel específico que você tem em vista.')}</div></div>)
}
const M2_ORDENADO = [...BAIRROS_M2].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR'))
function CalcValorM2() {
  const [bairro, setBairro] = useState(M2_ORDENADO[0]?.bairro || ''); const [area, setArea] = useState('100')
  const d = M2_ORDENADO.find((x) => x.bairro === bairro)
  const est = (d?.m2 || 0) * (+area || 0)
  return (<div className="calc-grid"><div className="calc-form"><Select label="Bairro" valor={bairro} onChange={setBairro} opcoes={M2_ORDENADO.map((x) => x.bairro)} /><Campo label="Área (m²)" sufixo="m²" valor={area} onChange={setArea} /></div><div>{d && d.m2 ? <Resultado destaque={{ rotulo: `Estimativa para ${area} m² no ${bairro}`, valor: brl(est) }} itens={[{ rotulo: 'Preço médio do m² no bairro', valor: brl(d.m2) }, { rotulo: 'Fonte', valor: `${d.fonte} · ${d.ref}` }]} /> : <p className="section-sub">Ainda não tenho um valor de referência <b>oficial confirmado</b> para <b>{bairro}</b>. Me chama que eu faço a <b>avaliação real</b> desse bairro para você — sem custo.</p>}{nota('Valor médio de REFERÊNCIA por bairro (venda), de fontes públicas (Proprietário Direto/IPD e ZAP). O preço real varia com padrão, estado, andar e localização exata.')}</div></div>)
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

// ─── ferramentas PRO ─────────────────────────────────────────────────────────
export function CalcComissao() {
  const [valor, setValor] = useState(500000); const [com, setCom] = useState('6'); const [corretor, setCorretor] = useState('50')
  const r = useMemo(() => { const total = valor * ((+com || 0) / 100); const parteCorretor = total * ((+corretor || 0) / 100); return { total, parteCorretor, parteImob: total - parteCorretor } }, [valor, com, corretor])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor da venda" valor={valor} onChange={setValor} /><Campo label="Comissão" sufixo="%" valor={com} onChange={setCom} step="0.5" /><Campo label="Parte do corretor" sufixo="%" valor={corretor} onChange={setCorretor} step="5" /></div><div><Resultado destaque={{ rotulo: 'Comissão total', valor: brl(r.total) }} itens={[{ rotulo: 'Parte do corretor', valor: brl(r.parteCorretor) }, { rotulo: 'Parte da imobiliária/captação', valor: brl(r.parteImob) }]} />{nota('Ferramenta de apoio ao corretor. Percentuais e divisões variam por contrato e imobiliária.')}</div></div>)
}
export function FichaAvaliacao() {
  const [f, setF] = useState({ tipo: 'Casa', bairro: '', area: '', quartos: '', suites: '', vagas: '', estado: 'Bem conservado', preco: 0, dif: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const texto = `${f.tipo}${f.bairro ? ` no ${f.bairro}` : ''} — Uberlândia\n${[f.area && `${f.area} m²`, f.quartos && `${f.quartos} quartos`, f.suites && `${f.suites} suíte(s)`, f.vagas && `${f.vagas} vagas`].filter(Boolean).join(' · ')}\nEstado: ${f.estado}${f.preco ? `\nValor: ${formatBRL(f.preco)}` : ''}${f.dif ? `\nDiferenciais: ${f.dif}` : ''}\n\nFale com Vinícius Graton — Consultor de Imóveis em Uberlândia.`
  const copiar = () => { try { navigator.clipboard.writeText(texto) } catch {} }
  return (<div className="calc-grid"><div className="calc-form"><Select label="Tipo" valor={f.tipo} onChange={set('tipo')} opcoes={['Casa', 'Apartamento', 'Casa em condomínio', 'Terreno', 'Comercial']} /><label className="calc-campo"><span>Bairro</span><div className="calc-input"><input value={f.bairro} onChange={set('bairro')} list="bf" /><datalist id="bf">{BAIRROS_IMOVEL.map((b) => <option key={b} value={b} />)}</datalist></div></label><div className="calc-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Campo label="Área (m²)" valor={f.area} onChange={set('area')} /><Campo label="Quartos" valor={f.quartos} onChange={set('quartos')} /><Campo label="Suítes" valor={f.suites} onChange={set('suites')} /><Campo label="Vagas" valor={f.vagas} onChange={set('vagas')} /></div><CampoMoeda label="Preço pretendido" valor={f.preco} onChange={(v) => setF((s) => ({ ...s, preco: v }))} /><label className="calc-campo"><span>Diferenciais</span><div className="calc-input"><input value={f.dif} onChange={set('dif')} placeholder="Reforma, sol da manhã, andar alto..." /></div></label></div><div><div className="ficha-preview">{texto}</div><div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}><button className="btn btn-gold" type="button" onClick={copiar}>Copiar resumo</button><a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a></div>{nota('Gera um resumo pronto para divulgar o imóvel. Ferramenta de apoio ao corretor.')}</div></div>)
}
export function CalcACM() {
  const ord = useMemo(() => [...BAIRROS_M2].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')), [])
  const [bairro, setBairro] = useState(ord[0]?.bairro || ''); const [area, setArea] = useState('120'); const [estado, setEstado] = useState('0')
  const r = useMemo(() => {
    const reg = BAIRROS_M2.find((x) => x.bairro === bairro); const m2 = reg?.m2 || 0
    const central = m2 * (+area || 0) * (1 + (+estado / 100))
    return { m2, central, min: central * 0.93, max: central * 1.07, fonte: reg?.fonte, ref: reg?.ref }
  }, [bairro, area, estado])
  return (<div className="calc-grid"><div className="calc-form"><Select label="Bairro" valor={bairro} onChange={setBairro} opcoes={ord.map((x) => x.bairro)} /><Campo label="Área privativa" sufixo="m²" valor={area} onChange={setArea} /><Select label="Estado do imóvel" valor={estado} onChange={setEstado} opcoes={[{ v: '8', t: 'Novo / lançamento' }, { v: '4', t: 'Reformado' }, { v: '0', t: 'Bem conservado' }, { v: '-10', t: 'Precisa de reforma' }]} /></div><div>{r.m2 ? <Resultado destaque={{ rotulo: 'Preço sugerido', valor: brl(r.central) }} itens={[{ rotulo: 'Faixa de mercado', valor: `${brl(r.min)} a ${brl(r.max)}` }, { rotulo: `m² médio em ${bairro}`, valor: brl(r.m2) }, { rotulo: 'Fonte do m²', valor: `${r.fonte || '—'}${r.ref ? ` (${r.ref})` : ''}` }]} /> : <p className="section-sub">Ainda não há um valor de referência <b>oficial confirmado</b> para <b>{bairro}</b>. Para esse bairro, faça uma <b>avaliação presencial</b>.</p>}{nota('Estimativa pela mediana do bairro × área, ajustada pelo estado, de fontes públicas (IPD e ZAP). É um ponto de partida — a avaliação presencial fecha o preço.')}</div></div>)
}

function CalcRenda() {
  const [valor, setValor] = useState(500000); const [entrada, setEntrada] = useState(100000); const [prazo, setPrazo] = useState('30'); const [juros, setJuros] = useState('10.5'); const [comp, setComp] = useState('30')
  const r = useMemo(() => {
    const fin = Math.max(0, valor - entrada); const i = (+juros / 100) / 12; const n = (+prazo || 0) * 12
    const parcela = i > 0 ? fin * i / (1 - Math.pow(1 + i, -n)) : (n > 0 ? fin / n : 0)
    const renda = (+comp > 0) ? parcela / (+comp / 100) : 0
    return { fin, parcela, renda }
  }, [valor, entrada, prazo, juros, comp])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Entrada" valor={entrada} onChange={setEntrada} /><Campo label="Prazo" sufixo="anos" valor={prazo} onChange={setPrazo} /><Campo label="Juros (a.a.)" sufixo="%" valor={juros} onChange={setJuros} step="0.1" /><Campo label="Comprometimento de renda" sufixo="%" valor={comp} onChange={setComp} step="5" /></div><div><Resultado destaque={{ rotulo: 'Renda necessária', valor: brl(r.renda) }} itens={[{ rotulo: 'Valor financiado', valor: brl(r.fin) }, { rotulo: '1ª parcela (Price)', valor: brl2(r.parcela) }]} />{nota('Os bancos costumam limitar a parcela a ~30% da renda familiar bruta. A taxa e o limite variam por banco e perfil.')}</div></div>)
}
function CalcEntrada() {
  const [valor, setValor] = useState(500000); const [perc, setPerc] = useState('20'); const [meses, setMeses] = useState('24'); const [rend, setRend] = useState('0.6')
  const r = useMemo(() => {
    const meta = valor * (+perc / 100); const i = (+rend / 100); const n = +meses || 0
    const pmt = i > 0 ? meta * i / (Math.pow(1 + i, n) - 1) : (n > 0 ? meta / n : 0)
    const aportado = pmt * n; const rendimento = Math.max(0, meta - aportado)
    return { meta, pmt, aportado, rendimento }
  }, [valor, perc, meses, rend])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><Campo label="Entrada desejada" sufixo="%" valor={perc} onChange={setPerc} step="5" /><Campo label="Prazo para juntar" sufixo="meses" valor={meses} onChange={setMeses} /><Campo label="Rendimento (a.m.)" sufixo="%" valor={rend} onChange={setRend} step="0.1" /></div><div><Resultado destaque={{ rotulo: 'Guardar por mês', valor: brl2(r.pmt) }} itens={[{ rotulo: 'Meta de entrada', valor: brl(r.meta) }, { rotulo: 'Total que você aporta', valor: brl(r.aportado) }, { rotulo: 'Rendimento no período', valor: brl(r.rendimento) }]} />{nota('Estimativa por juros compostos. ~0,6% a.m. é uma referência conservadora de aplicação de baixo risco.')}</div></div>)
}
function CalcGanho() {
  const [venda, setVenda] = useState(600000); const [compra, setCompra] = useState(400000); const [unico, setUnico] = useState(false); const [reinveste, setReinveste] = useState(false)
  const r = useMemo(() => {
    const lucro = Math.max(0, venda - compra); const isentoUnico = unico && venda <= 440000; const isento = isentoUnico || reinveste
    const ir = isento ? 0 : lucro * 0.15
    return { lucro, ir, liquido: venda - ir, isento, isentoUnico }
  }, [venda, compra, unico, reinveste])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor de venda" valor={venda} onChange={setVenda} /><CampoMoeda label="Valor de compra (custo)" valor={compra} onChange={setCompra} /><label className="calc-check"><input type="checkbox" checked={unico} onChange={(e) => setUnico(e.target.checked)} /><span>É meu único imóvel e a venda é de até R$ 440 mil</span></label><label className="calc-check"><input type="checkbox" checked={reinveste} onChange={(e) => setReinveste(e.target.checked)} /><span>Vou comprar outro imóvel residencial em até 180 dias</span></label></div><div><Resultado destaque={{ rotulo: r.isento ? 'Imposto (isento)' : 'Imposto estimado (IR)', valor: brl(r.ir) }} itens={[{ rotulo: 'Lucro (ganho de capital)', valor: brl(r.lucro) }, { rotulo: 'Você recebe (líquido)', valor: brl(r.liquido) }, { rotulo: 'Situação', valor: r.isento ? (r.isentoUnico ? 'Isento · único ≤ 440 mil' : 'Isento · reinvestimento') : 'Tributável · 15%' }]} />{nota('Regra geral: 15% sobre o lucro. Isenções: único imóvel vendido por até R$ 440 mil (1x a cada 5 anos) e reinvestimento em residencial em 180 dias.')}</div></div>)
}

// ─── ferramentas de foto (canvas, client-side) ──────────────────────────────
function EndireitarFoto() {
  const [src, setSrc] = useState(null)
  const [rot, setRot] = useState(0)
  const canRef = useRef(null)
  const imgObj = useRef(null)

  const desenhar = (img, graus) => {
    if (!canRef.current || !img) return
    const c = canRef.current
    const ctx = c.getContext('2d')
    const rad = (graus * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad))
    c.width  = Math.round(img.naturalWidth * cos + img.naturalHeight * sin)
    c.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.save()
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate(rad)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    ctx.restore()
  }

  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => { imgObj.current = img; desenhar(img, rot) }
    img.src = src
  }, [src])

  useEffect(() => { if (imgObj.current) desenhar(imgObj.current, rot) }, [rot])

  const load = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = (ev) => { setSrc(ev.target.result); setRot(0) }
    r.readAsDataURL(f)
  }

  const baixar = () => {
    const a = document.createElement('a')
    a.download = 'foto-endireitada.jpg'
    a.href = canRef.current.toDataURL('image/jpeg', 0.93)
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="calc-campo" style={{ cursor: 'pointer' }}>
        <span>Selecionar foto</span>
        <div className="calc-input" style={{ cursor: 'pointer' }}><input type="file" accept="image/*" onChange={load} /></div>
      </label>
      {src && (
        <>
          <label className="calc-campo">
            <span>Rotação: {rot}°</span>
            <div className="calc-input" style={{ padding: '8px 16px' }}>
              <input type="range" min="-180" max="180" step="0.5" value={rot}
                onChange={e => setRot(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--gold-2)' }} />
            </div>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={() => setRot(r => +(r - 90).toFixed(1))}>↺ −90°</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={() => setRot(0)}>Zerar</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} type="button" onClick={() => setRot(r => +(r + 90).toFixed(1))}>↻ +90°</button>
          </div>
          <canvas ref={canRef} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          <button className="btn btn-gold" type="button" onClick={baixar}>⬇ Baixar foto corrigida</button>
        </>
      )}
      {nota('Processamento 100% no seu navegador — a foto não é enviada a nenhum servidor.')}
    </div>
  )
}

function MarcaDAguaFoto() {
  const [src, setSrc] = useState(null)
  const [texto, setTexto] = useState('@viniciusgraton.imoveis')
  const [pos, setPos] = useState('br')
  const [opac, setOpac] = useState(75)
  const [tam, setTam] = useState(28)
  const canRef = useRef(null)
  const imgObj = useRef(null)

  const desenhar = (img) => {
    if (!canRef.current || !img) return
    const c = canRef.current
    c.width  = img.naturalWidth  || img.width
    c.height = img.naturalHeight || img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    if (!texto.trim()) return
    ctx.save()
    ctx.globalAlpha = opac / 100
    const fontSize = Math.max(18, Math.round((c.width / 900) * tam))
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.lineWidth = Math.max(2, fontSize * 0.06)
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'
    ctx.fillStyle = '#ffffff'
    const margin = fontSize * 0.9
    let x, y
    if (pos === 'tl')      { x = margin;           y = fontSize + margin; ctx.textAlign = 'left';   ctx.textBaseline = 'bottom' }
    else if (pos === 'tr') { x = c.width - margin;  y = fontSize + margin; ctx.textAlign = 'right';  ctx.textBaseline = 'bottom' }
    else if (pos === 'bl') { x = margin;            y = c.height - margin; ctx.textAlign = 'left';   ctx.textBaseline = 'bottom' }
    else if (pos === 'br') { x = c.width - margin;  y = c.height - margin; ctx.textAlign = 'right';  ctx.textBaseline = 'bottom' }
    else                   { x = c.width / 2;       y = c.height / 2;      ctx.textAlign = 'center'; ctx.textBaseline = 'middle' }
    ctx.strokeText(texto, x, y)
    ctx.fillText(texto, x, y)
    ctx.restore()
  }

  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => { imgObj.current = img; desenhar(img) }
    img.src = src
  }, [src])

  useEffect(() => { if (imgObj.current) desenhar(imgObj.current) }, [texto, pos, opac, tam])

  const load = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = (ev) => setSrc(ev.target.result)
    r.readAsDataURL(f)
  }

  const baixar = () => {
    const a = document.createElement('a')
    a.download = 'foto-com-marca.jpg'
    a.href = canRef.current.toDataURL('image/jpeg', 0.93)
    a.click()
  }

  const POS = [
    { v: 'tl', t: 'Canto superior esquerdo' }, { v: 'tr', t: 'Canto superior direito' },
    { v: 'bl', t: 'Canto inferior esquerdo' }, { v: 'br', t: 'Canto inferior direito' },
    { v: 'center', t: 'Centro' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="calc-campo" style={{ cursor: 'pointer' }}>
        <span>Selecionar foto</span>
        <div className="calc-input" style={{ cursor: 'pointer' }}><input type="file" accept="image/*" onChange={load} /></div>
      </label>
      <label className="calc-campo">
        <span>Texto da marca d'água</span>
        <div className="calc-input"><input value={texto} onChange={e => setTexto(e.target.value)} placeholder="@viniciusgraton.imoveis" /></div>
      </label>
      <Select label="Posição" valor={pos} onChange={setPos} opcoes={POS} />
      <label className="calc-campo">
        <span>Opacidade: {opac}%</span>
        <div className="calc-input" style={{ padding: '8px 16px' }}>
          <input type="range" min="20" max="100" value={opac}
            onChange={e => setOpac(+e.target.value)}
            style={{ width: '100%', accentColor: 'var(--gold-2)' }} />
        </div>
      </label>
      <label className="calc-campo">
        <span>Tamanho: {tam}px</span>
        <div className="calc-input" style={{ padding: '8px 16px' }}>
          <input type="range" min="12" max="60" value={tam}
            onChange={e => setTam(+e.target.value)}
            style={{ width: '100%', accentColor: 'var(--gold-2)' }} />
        </div>
      </label>
      {src && (
        <>
          <canvas ref={canRef} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          <button className="btn btn-gold" type="button" onClick={baixar}>⬇ Baixar com marca d'água</button>
        </>
      )}
      {nota('Tudo no seu navegador — a foto não é enviada a nenhum servidor.')}
    </div>
  )
}

function RedimensionarFoto() {
  const [src, setSrc] = useState(null)
  const [origW, setOrigW] = useState(0)
  const [origH, setOrigH] = useState(0)
  const [novaW, setNovaW] = useState('')
  const [proporcional, setProporcional] = useState(true)
  const canRef = useRef(null)
  const imgObj = useRef(null)

  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => { imgObj.current = img; setOrigW(img.naturalWidth); setOrigH(img.naturalHeight); setNovaW(String(img.naturalWidth)) }
    img.src = src
  }, [src])

  const novaH = proporcional && origW && novaW ? Math.round((+novaW / origW) * origH) : origH

  const load = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = (ev) => setSrc(ev.target.result)
    r.readAsDataURL(f)
  }

  const baixar = () => {
    if (!imgObj.current || !canRef.current) return
    const c = canRef.current
    c.width = +novaW || origW
    c.height = novaH
    c.getContext('2d').drawImage(imgObj.current, 0, 0, c.width, c.height)
    const a = document.createElement('a')
    a.download = `foto-${c.width}x${c.height}.jpg`
    a.href = c.toDataURL('image/jpeg', 0.93)
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="calc-campo" style={{ cursor: 'pointer' }}>
        <span>Selecionar foto</span>
        <div className="calc-input" style={{ cursor: 'pointer' }}><input type="file" accept="image/*" onChange={load} /></div>
      </label>
      {src && origW > 0 && (
        <>
          <p className="calc-nota" style={{ margin: 0 }}>Original: {origW} × {origH} px</p>
          <Campo label="Nova largura (px)" valor={novaW} onChange={setNovaW} />
          <label className="calc-check">
            <input type="checkbox" checked={proporcional} onChange={e => setProporcional(e.target.checked)} />
            <span>Manter proporção — altura resultante: {novaH} px</span>
          </label>
          <canvas ref={canRef} style={{ display: 'none' }} />
          <button className="btn btn-gold" type="button" onClick={baixar}>⬇ Redimensionar e baixar</button>
        </>
      )}
      {nota('Ideal para reduzir fotos antes de enviar pelo WhatsApp ou publicar no portal.')}
    </div>
  )
}

// ─── mapa de renders ─────────────────────────────────────────────────────────
const RENDER = {
  financiamento: CalcFinanciamento, capacidade: CalcCapacidade, renda: CalcRenda,
  fgts: CalcFGTS, amortizacao: CalcAmortizacao, custos: CalcCustos,
  aluguel: CalcAluguel, rentabilidade: CalcRentabilidade, investir: CalcInvestir,
  entrada: CalcEntrada, ganho: CalcGanho, valorm2: CalcValorM2, score: CalcScore,
  checklist: Checklist, acm: CalcACM, comissao: CalcComissao, ficha: FichaAvaliacao,
  endireitar: EndireitarFoto, 'marca-agua': MarcaDAguaFoto, redimensionar: RedimensionarFoto,
}

// ─── componente principal ────────────────────────────────────────────────────
export default function Ferramentas() {
  const [filtro, setFiltro]   = useState('todos')
  const [ativa, setAtiva]     = useState(null)
  const [isCorretor, setIsCorretor] = useState(false)
  const [lockMsg, setLockMsg] = useState(null)
  const [modalAtiva, setModalAtiva] = useState(null)
  const painelRef = useRef(null)

  useSEO({
    title: 'Ferramentas e calculadoras de imóveis — Uberlândia',
    description: 'Portal completo: simulador de financiamento, FGTS, rentabilidade, ITBI, comparador de imóveis e ferramentas exclusivas para corretores. Grátis, sem cadastro.',
    path: '/ferramentas',
  })

  useEffect(() => {
    try { setIsCorretor(!!localStorage.getItem('vg_corretor')) } catch {}
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModalAtiva(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const atual = ativa ? TOOLS.find((t) => t.id === ativa) : null
  const Ativa  = ativa ? RENDER[ativa] : null
  const modalAtual = modalAtiva ? TOOLS.find((t) => t.id === modalAtiva) : null
  const ModalAtiva = modalAtiva ? RENDER[modalAtiva] : null

  const escolher = (tool) => {
    if (tool.to) return
    if (tool.toPro) {
      if (isCorretor) {
        window.location.href = '/corretor'
        return
      }
      setLockMsg(tool.id)
      setTimeout(() => {
        document.getElementById('ferr-pro-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return
    }
    if (tool.pro && !isCorretor) {
      setLockMsg(tool.id)
      setTimeout(() => {
        document.getElementById('ferr-pro-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return
    }
    setLockMsg(null)
    setModalAtiva(tool.id)
    setAtiva(null)
  }

  const secoesFiltradas = filtro === 'todos' ? SECOES : SECOES.filter((s) => s.id === filtro)

  return (
    <main className="pagina ferramentas-pg">

      {/* ── HERO ── */}
      <div className="ferr-hero">
        <div className="container">
          <div className="ferr-hero-txt">
            <span className="ferr-hero-eyebrow">
              <FI name="star" size={13} />
              Portal de ferramentas
            </span>
            <h1 className="ferr-hero-titulo">Calcule, compare e <em>decida com segurança</em></h1>
            <p className="ferr-hero-sub">{TOOLS.filter(t => !t.pro).length} ferramentas gratuitas · {TOOLS.filter(t => t.pro).length} exclusivas para corretores</p>
          </div>
          <nav className="ferr-pills" aria-label="Filtrar ferramentas por categoria">
            {PILLS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ferr-pill${filtro === p.id ? ' on' : ''}${p.id === 'pro' ? ' ferr-pill--pro' : ''}`}
                onClick={() => { setFiltro(p.id); setLockMsg(null); setAtiva(null) }}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── SEÇÕES ── */}
      <div className="ferr-body container">
        {secoesFiltradas.map((sec) => {
          const tools = TOOLS.filter((t) => t.sec === sec.id)
          return (
            <section key={sec.id} id={sec.id === 'pro' ? 'ferr-pro-section' : undefined} className={`ferr-section${sec.pro ? ' ferr-section--pro' : ''}`}>

              {/* cabeçalho da seção */}
              <div className={`ferr-sec-hd${sec.pro ? ' ferr-sec-hd--pro' : ''}`}>
                <span className="ferr-sec-ico"><FI name={sec.icon} size={20} /></span>
                <div className="ferr-sec-info">
                  <h2 className="ferr-sec-titulo">
                    {sec.pro && <span className="ferr-badge-pro">PRO</span>}
                    {sec.titulo}
                  </h2>
                  <p className="ferr-sec-sub">{sec.sub}</p>
                </div>
                <span className="ferr-sec-count">{tools.length} ferramenta{tools.length !== 1 ? 's' : ''}</span>
              </div>

              {/* banner de assinatura (PRO não assinante) */}
              {sec.pro && !isCorretor && (
                <div className="ferr-pro-banner">
                  <div className="ferr-pro-banner-txt">
                    <b>Ferramentas exclusivas para corretores</b>
                    <span>Assine a Área do Corretor e desbloqueie ACM, comissão, ficha, IA de fotos e muito mais.</span>
                  </div>
                  <div className="ferr-pro-banner-planos">
                    <Link to="/corretor" className="ferr-pro-plano">
                      <span className="ferr-pro-plano-nome">Semanal</span>
                      <b className="ferr-pro-plano-preco">R$ 49,90</b>
                      <span className="ferr-pro-plano-per">/ 7 dias</span>
                      <span className="ferr-pro-plano-cta">Assinar agora</span>
                    </Link>
                    <Link to="/corretor" className="ferr-pro-plano ferr-pro-plano--dest">
                      <span className="ferr-pro-plano-badge">Mais popular</span>
                      <span className="ferr-pro-plano-nome">Mensal</span>
                      <b className="ferr-pro-plano-preco">R$ 150</b>
                      <span className="ferr-pro-plano-per">/ 30 dias</span>
                      <span className="ferr-pro-plano-cta">Assinar agora</span>
                    </Link>
                  </div>
                  <Link className="btn btn-gold ferr-pro-btn" to="/corretor">Assinar e desbloquear <IconArrow /></Link>
                </div>
              )}

              {/* banner para assinante */}
              {sec.pro && isCorretor && (
                <div className="ferr-pro-ativo">
                  <FI name="star" size={16} />
                  <span>Você tem acesso à Área do Corretor.</span>
                  <Link to="/corretor" className="ferr-pro-ativo-link">Ir para o painel completo →</Link>
                </div>
              )}

              {/* grade de cards */}
              <div className="ferr-grid-3">
                {tools.map((tool) => {
                  const locked  = tool.pro && !isCorretor
                  const isOn    = ativa === tool.id
                  const isLockMsgOn = lockMsg === tool.id

                  if (tool.to && !locked) {
                    return (
                      <Link key={tool.id} className="ferr-card3" to={tool.to}>
                        <span className="ferr-card3-ico"><FI name={tool.icon} /></span>
                        <span className="ferr-card3-body">
                          <span className="ferr-card3-tit">
                            <b>{tool.nome}</b>
                            {tool.popular && <span className="ferr-badge-popular">Popular</span>}
                          </span>
                          <i>{tool.desc}</i>
                        </span>
                        <span className="ferr-card3-arrow"><IconArrow /></span>
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={tool.id}
                      type="button"
                      className={`ferr-card3${isOn ? ' on' : ''}${isLockMsgOn ? ' lock-pulse' : ''}`}
                      onClick={() => escolher(tool)}
                      aria-label={tool.nome}
                    >
                      <span className="ferr-card3-ico">
                        <FI name={tool.icon} />
                      </span>
                      <span className="ferr-card3-body">
                        <span className="ferr-card3-tit">
                          <b>{tool.nome}</b>
                          {tool.popular && <span className="ferr-badge-popular">Popular</span>}
                          {tool.pro && <span className="ferr-badge-pro-sm">PRO</span>}
                        </span>
                        <i>{tool.desc}</i>
                        {isLockMsgOn && (
                          <span className="ferr-lock-msg">Assine a Área do Corretor para desbloquear.</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* ── PAINEL DA CALCULADORA ATIVA ── */}
        {ativa && Ativa && atual && (
          <div className="calc-painel ferr-painel-ativo" ref={painelRef}>
            <div className="ferr-painel-hd">
              <span className="ferr-painel-ico"><FI name={atual.icon} size={20} /></span>
              <h3 className="calc-painel-tit">{atual.nome}</h3>
              <button className="ferr-painel-fechar" type="button" onClick={() => setAtiva(null)} aria-label="Fechar calculadora">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <Ativa />
            <div className="calc-cta">
              <span>Quer que eu faça essa conta com os números reais e te mostre as melhores opções?</span>
              <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as ferramentas no site e quero sua ajuda.')} target="_blank" rel="noopener">
                <IconWhats /> Falar com o Vinícius
              </a>
            </div>
          </div>
        )}

        {/* ── MODAL DE CALCULADORA (investidor) ── */}
        {modalAtiva && ModalAtiva && modalAtual && (
          <div className="ferr-modal-backdrop" onClick={() => setModalAtiva(null)}>
            <div className="ferr-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ferr-modal-hd">
                <span className="ferr-modal-ico"><FI name={modalAtual.icon} size={20} /></span>
                <h3 className="ferr-modal-tit">{modalAtual.nome}</h3>
                <button className="ferr-modal-fechar" type="button" onClick={() => setModalAtiva(null)} aria-label="Fechar calculadora">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="ferr-modal-body">
                <ModalAtiva />
              </div>
              <div className="calc-cta ferr-modal-cta">
                <span>Quer que eu faça essa conta com os números reais e te mostre as melhores opções?</span>
                <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as ferramentas no site e quero sua ajuda.')} target="_blank" rel="noopener">
                  <IconWhats /> Falar com o Vinícius
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── RODAPÉ DA PÁGINA ── */}
        <div className="ferr-footer-links">
          <Link className="btn btn-ghost" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
          <Link className="btn btn-ghost" to="/avaliacao">Avaliação gratuita do meu imóvel <IconArrow /></Link>
        </div>
      </div>
    </main>
  )
}
