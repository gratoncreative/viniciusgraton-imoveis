import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CampoMoeda from '../components/CampoMoeda'
import { BAIRROS_IMOVEL, linkWhatsApp, estudoM2ACM } from '../data'
import { registrarLead } from '../engajamento'
import { getCorretorOuAdmin } from '../corretor'
import BAIRROS_M2 from '../bairros-m2.json'
import ACM_INDEX from '../acm-m2.json'
import { formatBRL } from '../extenso'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow } from '../components/icons'

// Ferramentas "de página" que abrem INLINE no modal (lazy — fora do bundle inicial).
const ConverterFotos = lazy(() => import('./ConverterFotos'))
const PdfParaJpgPage = lazy(() => import('./PdfParaJpgPage'))
const TranscreverPage = lazy(() => import('./TranscreverPage'))
const CompararPage = lazy(() => import('./Comparar'))
const MapaPage = lazy(() => import('./Mapa'))
const ImpulsionarPage = lazy(() => import('./Impulsionar'))
const RemoverMarcaTool = lazy(() => import('../components/RemoverMarca'))

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
  pdf:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4',
  bell:    'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  lock:    'M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM12 17v-2M8 11V7a4 4 0 0 1 8 0v4',
  camera:  'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  rocket:  'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zm3.95.95-1.41-1.41 4.82-4.82A6 6 0 0 0 13 7a6 6 0 0 1 4 4 6 6 0 0 0-4.55 1.86zM14 11.5l-3 3',
  link:    'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  mic:     'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8',
  rotate:  'M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10',
  droplet: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  scissors:'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12',
  resize:  'M4 9V4h5M20 15v5h-5M9 4 4 9m11 11 5-5M3.5 3.5 9 9m6 6 5.5 5.5',
  swap:    'M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12',
  piggy:   'M19 11c0-3-3.1-5-7-5s-7 2-7 5c0 1.4.6 2.6 1.7 3.5V18h2.5v-2h5.6v2H17v-3.5c.6-.4 1-1 1.3-1.5H20v-2zM16 9.5h.01M9 6.3 8 4h5',
  ruler:   'M16 2 22 8 8 22 2 16zM15 7l2 2M11 11l2 2M7 15l2 2',
  safe:    'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 12h.01M7 20v1M17 20v1',
  sparkles:'M9 3l1.6 4L15 8.6l-4.4 1.6L9 14l-1.6-3.8L3 8.6l4.4-1.6zM18 13l.8 2.2 2.2.8-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z',
  wand:    'M3 21l9-9M14 6l4 4M13 5l1.5-1.5 7 7L20 12M15 9 9 3M5 11l-2 2M19 17l2-2',
  eraser:  'M20 20H8.5L3 14.5a2 2 0 0 1 0-2.83l8-8a2 2 0 0 1 2.83 0l6.5 6.5a2 2 0 0 1 0 2.83L13 20M8.5 8.5 15.5 15.5',
  checklist:'M11 6h9M11 12h9M11 18h9M4 6l1.5 1.5L8 4M4 12l1.5 1.5L8 10M4 18l1.5 1.5L8 16',
  clipboard:'M9 3h6v3H9zM8 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2M9 13l1.8 1.8L14 11',
  appraise:'M4 10 11 4l5 4M6 9.5V15h3v-4h1.5M13.5 14.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M15.5 16.5 18.5 19.5',
  fileimg: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7M8.5 18l2.5-3 2 2.5L15.5 14l3 4zM9 11.5h.01',
}
const FI = ({ name, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICN[name] || ICN.calc} />
  </svg>
)

// ─── seções e ferramentas ────────────────────────────────────────────────────
// ⚠ Assinatura PAUSADA temporariamente (a pedido do Vinícius) até ajustar as
// ferramentas PRO. Trocar para true reativa planos + CTA "Assinar e desbloquear".
const ASSINATURA_ATIVA = false

const SECOES = [
  { id: 'pro',           titulo: 'Área do Corretor',        sub: 'Ferramentas exclusivas para profissionais do mercado imobiliário', icon: 'star', pro: true },
  { id: 'comprador',     titulo: 'Para compradores',       sub: 'Simule, planeje e calcule antes de fechar',         icon: 'home'   },
  { id: 'investidor',    titulo: 'Para investidores',       sub: 'Analise rentabilidade, retorno e ganho de capital', icon: 'trend'  },
  { id: 'financiamento', titulo: 'Financiamento e FGTS',    sub: 'Simule o uso do fundo e amortize com precisão',     icon: 'bank'   },
]

const TOOLS = [
  // comprador
  { id: 'financiamento', nome: 'Simulador de financiamento', desc: 'Parcela, juros, CET, renda e custos · SAC e Price.', icon: 'bank',    sec: 'comprador',     popular: true, nav: true, to: '/simulador-financiamento' },
  { id: 'capacidade',    nome: 'Quanto consigo financiar?',  desc: 'O imóvel que cabe na sua renda.',              icon: 'chart',   sec: 'comprador',     popular: true },
  { id: 'renda',         nome: 'Renda necessária',           desc: 'Qual renda o banco exige para esse imóvel.',   icon: 'wallet',  sec: 'comprador'  },
  { id: 'custos',        nome: 'ITBI e cartório',            desc: 'Quanto reservar além do preço em Uberlândia.', icon: 'receipt', sec: 'comprador'  },
  { id: 'entrada',       nome: 'Plano para a entrada',       desc: 'Quanto guardar por mês para dar a entrada.',   icon: 'piggy',   sec: 'comprador'  },
  { id: 'score',         nome: 'Chance de aprovação',        desc: 'Estimativa do seu perfil de crédito.',         icon: 'gauge',   sec: 'comprador'  },
  { id: 'checklist',     nome: 'Checklist de documentos',    desc: 'Tudo que você precisa reunir, por etapa.',     icon: 'checklist',     sec: 'comprador'  },
  // investidor
  { id: 'valorm2',       nome: 'Valor do m² por bairro',    desc: 'Preço médio de venda por bairro de Uberlândia.', icon: 'ruler',  sec: 'investidor' },
  { id: 'rentabilidade', nome: 'Rentabilidade do aluguel',  desc: 'Quanto um imóvel rende ao ano.',               icon: 'trend',   sec: 'investidor', popular: true },
  { id: 'onde-investir',  nome: 'Onde investir (por bairro)', desc: 'Ranking de rentabilidade do aluguel por bairro de Uberlândia. Grátis.', icon: 'map', sec: 'investidor', popular: true, nav: true, to: '/investir' },
  { id: 'investir',      nome: 'Imóvel × CDI / Poupança',  desc: 'Vale comprar para alugar ou aplicar?',          icon: 'swap',   sec: 'investidor' },
  { id: 'aluguel',       nome: 'Alugar ou financiar?',      desc: 'Compare a parcela com o aluguel atual.',        icon: 'scale',   sec: 'investidor' },
  { id: 'ganho',         nome: 'IR na venda do imóvel',     desc: 'Ganho de capital e isenções em lei.',           icon: 'percent', sec: 'investidor' },
  // financiamento
  { id: 'fgts',          nome: 'Simulador de FGTS',         desc: 'Como o FGTS reduz a entrada e a parcela.',     icon: 'safe',  sec: 'financiamento' },
  { id: 'amortizacao',   nome: 'Amortização com FGTS',      desc: 'Quanto o FGTS encurta o financiamento.',       icon: 'scissors',    sec: 'financiamento' },
  // ── Área do Corretor (PRO) — todas exclusivas para assinantes ──
  // carros-chefe do corretor primeiro
  { id: 'acm',           nome: 'Referência de valor pela área', desc: 'Faixa de mercado pelo m² do bairro (não avalia a edificação). Grátis.',            icon: 'appraise',    sec: 'investidor' },
  { id: 'comissao',      nome: 'Calculadora de comissão',   desc: 'Comissão (5%) e divisão corretor / imobiliária. Grátis.',   icon: 'coins',   sec: 'investidor' },
  // fotos e imagens
  { id: 'estudio',       nome: 'Estúdio de fotos · painel completo', desc: "Tudo num painel só: endireitar, luz e cor, deixar na horizontal, marca d'água (põe e tira com IA), melhorar com IA, redimensionar e converter (JPG/PNG/WebP) — em lote, no navegador.", icon: 'fileimg', sec: 'pro', popular: true, nav: true, to: '/ferramentas/estudio-de-fotos' },
  { id: 'tour3d',        nome: 'Crie seu Tour 3D',          desc: 'Suba a cena 3D do imóvel (capturada no celular) e ganhe um link para compartilhar. Grátis.', icon: 'fileimg', sec: 'pro', popular: true, nav: true, to: '/ferramentas/criar-tour' },
  { id: 'leitor-area',   nome: 'Leitor de área (IA)',       desc: 'Foto de planta ou anúncio → a IA lê e calcula a área.', icon: 'fileimg', sec: 'pro', popular: true, nav: true, to: '/ferramentas/leitor-area' },
  { id: 'levantamento',  nome: 'Levantamento de fotos (IA)', desc: 'Envie as fotos → a IA descreve os acabamentos (piso, pedra, revestimento) de cada uma.', icon: 'fileimg', sec: 'pro', popular: true, nav: true, to: '/ferramentas/levantamento-fotos' },
  { id: 'pdf-jpg',      nome: 'PDF para JPG',              desc: 'Converta cada página do PDF em JPG de alta definição.', icon: 'pdf', sec: 'pro', needsSub: true, to: '/ferramentas/pdf-para-jpg' },
]

const PILLS = [
  { id: 'todos',         label: 'Todas'          },
  { id: 'comprador',     label: 'Comprador'       },
  { id: 'investidor',    label: 'Investidor'      },
  { id: 'financiamento', label: 'Financiamento'   },
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
  // #15 — usar os dados de m² por bairro que já temos
  const [bairro, setBairro] = useState(M2_ORDENADO[0]?.bairro || ''); const [area, setArea] = useState('100')
  const dM2 = M2_ORDENADO.find((x) => x.bairro === bairro)
  const valorBairro = Math.round((dM2?.m2 || 0) * (+area || 0))
  const aluguelSugerido = Math.round(valorBairro * 0.005) // ~0,5%/mês de referência
  const aplicarBairro = () => { if (valorBairro > 0) { setValor(valorBairro); setAluguel(aluguelSugerido) } }
  const r = useMemo(() => { const m = valor > 0 ? (aluguel / valor) * 100 : 0; const net = Math.max(0, aluguel - iptuCond); const mn = valor > 0 ? (net / valor) * 100 : 0; return { m, a: m * 12, mn, an: mn * 12, anoReais: aluguel * 12 } }, [valor, aluguel, iptuCond])
  return (<div className="calc-grid"><div className="calc-form"><div className="calc-bairro-box"><Select label="Estimar pelo bairro" valor={bairro} onChange={setBairro} opcoes={M2_ORDENADO.map((x) => x.bairro)} /><Campo label="Área (m²)" sufixo="m²" valor={area} onChange={setArea} />{valorBairro > 0 && <button type="button" className="calc-bairro-aplicar" onClick={aplicarBairro}>Usar {brl(valorBairro)} no {bairro} (aluguel ≈ {brl(aluguelSugerido)})</button>}</div><CampoMoeda label="Valor do imóvel" valor={valor} onChange={setValor} /><CampoMoeda label="Aluguel mensal (esperado)" valor={aluguel} onChange={setAluguel} /><CampoMoeda label="IPTU + condomínio/mês (estimativa)" valor={iptuCond} onChange={setIptuCond} /></div><div><Resultado destaque={{ rotulo: 'Rentabilidade bruta ao ano', valor: pct(r.a) }} itens={[{ rotulo: 'Rentabilidade líquida estimada ao ano', valor: pct(r.an) }, { rotulo: 'Rentabilidade bruta ao mês', valor: pct(r.m) }, { rotulo: 'Aluguel em 12 meses', valor: brl(r.anoReais) }, { rotulo: 'IPTU + cond em 12 meses', valor: brl(iptuCond * 12) }]} />{nota('A estimativa pelo bairro usa o m² médio de venda × área e supõe aluguel de ~0,5%/mês do valor (referência). Líquida = após IPTU e cond, antes de IR e manutenção. Bom investimento costuma render 0,4–0,6% líquido/mês.')}</div></div>)
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
const COMISSAO_PCT = 5 // comissão fixa do padrão da casa
export function CalcComissao() {
  const [valor, setValor] = useState(500000); const [corretor, setCorretor] = useState('50')
  const r = useMemo(() => { const total = valor * (COMISSAO_PCT / 100); const parteCorretor = total * ((+corretor || 0) / 100); return { total, parteCorretor, parteImob: total - parteCorretor } }, [valor, corretor])
  return (<div className="calc-grid"><div className="calc-form"><CampoMoeda label="Valor da venda" valor={valor} onChange={setValor} /><label className="calc-campo"><span>Comissão (fixa)</span><div className="calc-input"><input type="text" value={`${COMISSAO_PCT}%`} readOnly tabIndex={-1} aria-label="Comissão fixa de 5%" /></div></label><Campo label="Parte do corretor" sufixo="%" valor={corretor} onChange={setCorretor} step="5" /></div><div><Resultado destaque={{ rotulo: `Comissão total (${COMISSAO_PCT}%)`, valor: brl(r.total) }} itens={[{ rotulo: 'Parte do corretor', valor: brl(r.parteCorretor) }, { rotulo: 'Parte da imobiliária/captação', valor: brl(r.parteImob) }]} />{nota('Comissão fixada em 5% sobre o valor da venda. A divisão corretor/imobiliária varia por contrato.')}</div></div>)
}
const TIPOS_ACM = ['Apartamento', 'Casa', 'Casa Condomínio Fechado', 'Cobertura', 'Terreno', 'Terreno Condomínio Fechado', 'Loja', 'Sala']
const RESID_ACM = new Set(['Apartamento', 'Casa', 'Casa Condomínio Fechado', 'Cobertura', 'Kitnet', 'Flat'])

// R$/m² a partir do índice pré-computado do CATÁLOGO completo (src/acm-m2.json,
// gerado por scripts/gen-acm-index.mjs). Busca bairro|tipo|quartos -> bairro|tipo|.
function statsACM(bairro, tipo, quartos) {
  const seg = ACM_INDEX.seg || {}
  const qb = quartos === '4' ? '4' : (quartos || '')
  const exato = qb && seg[`${bairro}|${tipo}|${qb}`]
  if (exato) return { ...exato, porQuartos: true }
  const porTipo = seg[`${bairro}|${tipo}|`]
  if (porTipo) return { ...porTipo, porQuartos: false }
  return { n: 0, porQuartos: false }
}

function BarraFaixa({ min, central, max }) {
  const pct = max > min ? Math.min(96, Math.max(4, ((central - min) / (max - min)) * 100)) : 50
  return (
    <div className="acm-barra">
      <div className="acm-barra-track"><span className="acm-barra-marca" style={{ left: `${pct}%` }} /></div>
      <div className="acm-barra-labels"><span>{brl(min)}</span><b title="ponto central da faixa">{brl(central)}</b><span>{brl(max)}</span></div>
    </div>
  )
}

// Base ENXUTA de comparáveis (só Venda) — carregada sob demanda (não vai no bundle).
let _acmBase = null, _acmBaseProm = null
function carregarAcmBase() {
  if (_acmBase) return Promise.resolve(_acmBase)
  if (!_acmBaseProm) _acmBaseProm = fetch('/acm-base.json').then((r) => r.json()).then((d) => { _acmBase = d; return d }).catch(() => { _acmBaseProm = null; return null })
  return _acmBaseProm
}
const GRAU_TXT = { III: 'referência consistente', II: 'referência moderada', I: 'referência preliminar' }
const fmtBaseData = (iso) => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}` }

// Portão de lead da ACM pública: corretor/admin logado OU quem já informou WhatsApp aqui.
const ACM_LEAD_KEY = 'vg_acm_lead'
function acmIdentificado() {
  try { if (getCorretorOuAdmin()) return true } catch {}
  try { return !!localStorage.getItem(ACM_LEAD_KEY) } catch { return false }
}

const ESCOPO_TXT = {
  'bairro+quartos': (b, q) => `${b}, ${q} quartos`,
  bairro: (b) => `${b} (todos os quartos)`,
  'cidade+quartos': (_b, q) => `Uberlândia, ${q} quartos (sem amostra no bairro)`,
  cidade: () => 'Uberlândia (sem amostra no bairro)',
  indice: (b) => `${b} — índice público`,
}

export function CalcACM() {
  const ord = useMemo(() => [...BAIRROS_M2].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')), [])
  const [bairro, setBairro] = useState(ord[0]?.bairro || '')
  const [tipo, setTipo] = useState('Apartamento')
  const [quartos, setQuartos] = useState('')
  const [area, setArea] = useState('120')
  const [base, setBase] = useState(_acmBase)
  const [lead, setLead] = useState({ nome: '', fone: '' })
  const [leadOk, setLeadOk] = useState(false)
  const [verComp, setVerComp] = useState(false)
  const [ident, setIdent] = useState(acmIdentificado) // portão de lead (público)
  const [gate, setGate] = useState({ nome: '', fone: '' })
  const ehResid = RESID_ACM.has(tipo)

  const entrarGate = (e) => {
    e.preventDefault()
    const nome = gate.nome.trim(), fone = gate.fone.replace(/\D/g, '')
    if (nome.length < 2 || fone.length < 10) return
    try { registrarLead({ cod: 'acm-publico', nome, fone, email: '', bairro: `Usou a referência de valor · ${tipo} · ${bairro}${ehResid && quartos ? ` · ${quartos === '4' ? '4+' : quartos}q` : ''} · ${area}m²` }) } catch {}
    try { localStorage.setItem(ACM_LEAD_KEY, JSON.stringify({ nome, fone, ts: Date.now() })) } catch {}
    setLead((p) => ({ nome: p.nome || nome, fone: p.fone || gate.fone }))
    setIdent(true)
  }

  useEffect(() => { let vivo = true; carregarAcmBase().then((d) => { if (vivo && d) setBase(d) }); return () => { vivo = false } }, [])

  const r = useMemo(() => {
    const A = +area || 0
    if (base && Array.isArray(base.imoveis)) {
      const e = estudoM2ACM({ tipo, bairro, area: A, quartos: ehResid ? quartos : '' }, base.imoveis)
      if (e.ok) return { ...e, motor: 'estudo', A, geradoBase: base.gerado }
    }
    // fallback instantâneo (índice pré-computado) enquanto a base de comparáveis não chega
    const seg = statsACM(bairro, tipo, ehResid ? quartos : '')
    const pub = BAIRROS_M2.find((x) => x.bairro === bairro)
    if (seg.n >= 4) return { ok: true, motor: 'indice', A, referencia: seg.mediana, campoMin: seg.p25, campoMax: seg.p75, n: seg.n, escopo: 'indice', simples: true }
    if (pub && pub.m2 > 0) return { ok: true, motor: 'indice', A, referencia: pub.m2, campoMin: Math.round(pub.m2 * 0.92), campoMax: Math.round(pub.m2 * 1.08), n: 0, escopo: 'indice', simples: true, refFonte: pub.fonte, refRef: pub.ref }
    return { ok: false }
  }, [bairro, tipo, quartos, area, ehResid, base])

  // totais (R$) a partir do R$/m²
  const A = +area || 0
  const totMin = r.ok ? Math.round(r.campoMin * A) : 0
  const totMax = r.ok ? Math.round(r.campoMax * A) : 0
  const totCentral = r.ok ? Math.round(r.referencia * A) : 0
  const qTxt = quartos === '4' ? '4+' : quartos

  const enviarPresencial = () => {
    let id = null; try { id = JSON.parse(localStorage.getItem(ACM_LEAD_KEY) || 'null') } catch {}
    let logado = null; try { logado = getCorretorOuAdmin() } catch {}
    const nome = (lead.nome || (id && id.nome) || (logado && logado.nome) || '').trim()
    const fone = (lead.fone || (id && id.fone) || '').replace(/\D/g, '')
    const ctx = `AVALIAÇÃO PRESENCIAL (via ferramenta ACM) · ${tipo} · ${bairro}${ehResid && quartos ? ` · ${qTxt}q` : ''} · ${area}m² · faixa ${brl(totMin)}–${brl(totMax)}`
    try { registrarLead({ cod: 'acm-avaliacao', nome: nome || '(sem nome)', fone, email: '', bairro: ctx }) } catch {}
    const msg = `Olá Vinícius! *[Ferramenta de referência de valor — site]*\nQuero a *avaliação presencial* do meu imóvel.\n\n${tipo} no ${bairro}${ehResid && quartos ? `, ${qTxt} quartos` : ''}, ${area} m².\nReferência pela metragem (site): ${brl(totMin)} a ${brl(totMax)}.${nome ? `\n\nMeu nome: ${nome}.` : ''}`
    setLeadOk(true)
    window.open(linkWhatsApp(msg), '_blank', 'noopener')
  }

  const baixarPdf = async () => {
    try {
      const { gerarPdfACM } = await import('../pdfACM')
      gerarPdfACM({ bairro, tipo, quartos: ehResid ? qTxt : '', area: A, r, totMin, totMax, totCentral, dataTxt: new Date().toLocaleDateString('pt-BR') })
    } catch { alert('Não consegui gerar o PDF agora. Tente novamente em instantes.') }
  }

  const comps = (r.comparaveis || []).filter((c) => !c.descartado)

  return (
    <div className="calc-grid">
      <div className="calc-form">
        <Select label="Bairro" valor={bairro} onChange={setBairro} opcoes={ord.map((x) => x.bairro)} />
        <Select label="Tipo de imóvel" valor={tipo} onChange={setTipo} opcoes={TIPOS_ACM} />
        {ehResid && <Select label="Quartos" valor={quartos} onChange={setQuartos} opcoes={[{ v: '', t: 'Qualquer' }, { v: '1', t: '1 quarto' }, { v: '2', t: '2 quartos' }, { v: '3', t: '3 quartos' }, { v: '4', t: '4+ quartos' }]} />}
        <Campo label="Área (m²)" sufixo="m²" valor={area} onChange={setArea} />
        {!base && <p className="acm-loading">Carregando base de comparáveis…</p>}
      </div>
      <div>
        {!ident ? (
          <form className="acm-gate" onSubmit={entrarGate}>
            <h3 className="acm-gate-tit">Veja sua referência de mercado — grátis</h3>
            <p className="acm-gate-sub">Escolha o imóvel ao lado e informe seu nome + WhatsApp pra liberar o resultado na hora. Sem custo.</p>
            <div className="acm-lead-row">
              <input placeholder="Seu nome" value={gate.nome} onChange={(e) => setGate((p) => ({ ...p, nome: e.target.value }))} />
              <input type="tel" inputMode="tel" placeholder="WhatsApp (com DDD)" value={gate.fone} onChange={(e) => setGate((p) => ({ ...p, fone: e.target.value }))} />
            </div>
            <button type="submit" className="acm-gate-btn">Ver a referência grátis <IconArrow width={16} height={16} /></button>
            <p className="acm-gate-nota">Liberação imediata. Seu contato fica só comigo — não compartilho com ninguém.</p>
          </form>
        ) : <>
        {r.ok ? <>
          <Resultado destaque={{ rotulo: 'Faixa de referência pela metragem', valor: `${brl(totMin)} a ${brl(totMax)}` }} itens={[
            { rotulo: 'R$/m² de referência', valor: `${brl(r.referencia)}/m²` },
            { rotulo: 'Valor central', valor: brl(totCentral) },
            ...(r.vendaEst ? [{ rotulo: 'Estimativa de fechamento (~−10%)', valor: brl(Math.round(r.vendaEst * A)) }] : []),
            ...(r.motor === 'estudo' ? [
              { rotulo: 'Fundamentação', valor: r.grauFund ? `Grau ${r.grauFund} · ${GRAU_TXT[r.grauFund]}` : 'amostra pequena' },
              { rotulo: 'Precisão (IC 80%)', valor: r.grauPrec ? `Grau ${r.grauPrec} · ±${r.ic80 ? r.ic80.amplPct : '—'}%` : (r.ic80 ? `±${r.ic80.amplPct}% (sem classificação)` : '—') },
              { rotulo: 'Comparáveis', valor: `${r.n} usados${r.nDesc ? ` · ${r.nDesc} descartado` : ''} — ${ESCOPO_TXT[r.escopo] ? ESCOPO_TXT[r.escopo](bairro, qTxt) : bairro}` },
              { rotulo: 'Dispersão (CV)', valor: `${Math.round((r.cv || 0) * 100)}%` },
            ] : [
              { rotulo: 'Base', valor: r.refFonte ? `índice público (${r.refFonte}${r.refRef ? ', ' + r.refRef : ''})` : `catálogo · ${r.n} imóveis` },
            ]),
          ]} />
          <BarraFaixa min={totMin} central={totCentral} max={totMax} />

          {r.motor === 'estudo' && comps.length > 0 && (
            <div className="acm-comps">
              <button type="button" className="acm-comps-toggle" onClick={() => setVerComp((v) => !v)}>
                {verComp ? '▲ Ocultar' : '▼ Ver'} exemplos dos imóveis comparáveis usados
              </button>
              {verComp && (
                <ul className="acm-comps-lista">
                  {comps.slice(0, 8).map((c, i) => (
                    <li key={i}>
                      <span className="acm-comp-d">{c.bairro} · {c.area} m²{c.vagas ? ` · ${c.vagas} vaga${c.vagas > 1 ? 's' : ''}` : ''}</span>
                      <span className="acm-comp-v">{brl(c.preco)} <i>· {brl(Math.round(c.m2))}/m² homog.</i></span>
                    </li>
                  ))}
                  {r.nDesc > 0 && <li className="acm-comp-desc">+ {r.nDesc} descartado no saneamento estatístico (Chauvenet)</li>}
                </ul>
              )}
            </div>
          )}

          {r.motor === 'estudo' && (
            <p className="acm-sensi">Sensibilidade: cada <b>+10 m²</b> ≈ <b>{brl(Math.round(r.referencia * 10))}</b>{!RESID_ACM.has(tipo) ? '' : ' · cada vaga de garagem ≈ R$ 32.000'}.</p>
          )}

          <div className="acm-aviso">
            <b>⚠ Referência pela metragem, com base em preços ANUNCIADOS</b> de imóveis semelhantes na região (costumam ficar acima do valor de fechamento). <b>Não avalia a edificação</b> — conservação, acabamento, reforma, andar, vista e benfeitorias mudam muito o valor real. O valor formal exige <b>avaliação presencial</b>: eu, Vinícius, vou até o imóvel.
          </div>

          {r.fatores && r.fatores.length > 0 && (
            <details className="acm-fatores">
              <summary>Como calculei (metodologia)</summary>
              <ul>{r.fatores.map((f, i) => <li key={i}>{f}</li>)}</ul>
              {r.geradoBase && <p className="acm-base-data">Base de mercado atualizada em {fmtBaseData(r.geradoBase)} · método comparativo (NBR 14653) sobre a carteira da Rotina.</p>}
            </details>
          )}

          <div className="acm-acoes">
            <button type="button" className="acm-pdf-btn" onClick={baixarPdf}>Baixar PDF da referência</button>
          </div>
          {!leadOk ? (
            <div className="acm-lead">
              <p className="acm-lead-tit">Quer a avaliação <b>presencial</b> (com a edificação)? Eu vou até o imóvel e fecho o preço justo.</p>
              <button type="button" className="acm-lead-btn" onClick={enviarPresencial}><IconWhats width={18} height={18} /> Quero a avaliação presencial</button>
            </div>
          ) : <p className="acm-lead-ok">✓ Abri o WhatsApp com seus dados pra gente combinar a visita ao imóvel.</p>}
        </> : <p className="section-sub">Ainda não há comparáveis para <b>{bairro}</b> nesse recorte. Tente "Qualquer" em quartos/outro tipo, ou fale comigo para uma <b>avaliação presencial</b>.</p>}
        {nota('Método comparativo direto de dados de mercado (NBR 14653) sobre a carteira da Rotina: comparáveis do mesmo tipo, homogeneizados (vaga + área), saneados por Tukey/Chauvenet; referência = média saneada; faixa = campo de arbítrio ±15%. Baseado em preços anunciados — é referência da ÁREA, não substitui a avaliação presencial da edificação.')}
        </>}
      </div>
    </div>
  )
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
  checklist: Checklist, acm: CalcACM, comissao: CalcComissao,
  endireitar: EndireitarFoto, 'marca-agua': MarcaDAguaFoto, redimensionar: RedimensionarFoto,
  // ferramentas que antes navegavam — agora inline no modal (lazy)
  remover: RemoverMarcaTool, converter: ConverterFotos,
  'pdf-jpg': PdfParaJpgPage, transcrever: TranscreverPage, comparar: CompararPage,
  mapa: MapaPage, impulsionar: ImpulsionarPage,
}

// ─── componente principal ────────────────────────────────────────────────────
export default function Ferramentas() {
  const [filtro, setFiltro]   = useState('todos')
  const [ativa, setAtiva]     = useState(null)
  const [isCorretor, setIsCorretor] = useState(false)
  const [lockMsg, setLockMsg] = useState(null)
  const [modalAtiva, setModalAtiva] = useState(null)
  const painelRef = useRef(null)
  const navigate = useNavigate()

  useSEO({
    title: 'Ferramentas e calculadoras de imóveis — Uberlândia',
    description: 'Portal completo: simulador de financiamento, FGTS, rentabilidade, ITBI, comparador de imóveis e ferramentas exclusivas para corretores. Grátis, sem cadastro.',
    path: '/ferramentas',
  })

  useEffect(() => {
    // admin (vg_admin_token) tem acesso total — destrava todas as ferramentas
    try { setIsCorretor(!!localStorage.getItem('vg_corretor') || !!localStorage.getItem('vg_admin_token')) } catch {}
  }, [])

  // Sistema CLARO (igual ao resto do site) — garante a página branca, estilo Chaves
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    return () => { html.setAttribute('data-theme', anterior || 'claro') }
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
    // não-logado em ferramenta PRO/assinatura: leva pro bloco de acesso (sem abrir)
    if ((tool.pro || tool.needsSub || tool.toPro) && !isCorretor) {
      setLockMsg(tool.id)
      setTimeout(() => {
        document.getElementById('ferr-pro-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return
    }
    // páginas próprias (ex.: Estúdio de fotos) navegam pra sua URL; o resto abre inline no modal
    setLockMsg(null)
    if (tool.nav && tool.to) { navigate(tool.to); return }
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
            <p className="ferr-hero-sub">{TOOLS.filter(t => !t.pro && !t.needsSub).length} ferramentas gratuitas · {TOOLS.filter(t => t.pro || t.needsSub).length} exclusivas para corretores</p>
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
          const grade = tools.map((tool) => {
            const locked     = tool.pro && !isCorretor
            const subLocked  = tool.needsSub && !isCorretor
            const isOn       = ativa === tool.id
            const isLockMsgOn = lockMsg === tool.id

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
                    {(tool.pro || (tool.needsSub && !isCorretor)) && <span className="ferr-badge-pro-sm">PRO</span>}
                  </span>
                  <i>{tool.desc}</i>
                  {isLockMsgOn && (
                    <span className="ferr-lock-msg">{ASSINATURA_ATIVA ? 'Assine a Área do Corretor para desbloquear.' : 'Em breve · ferramenta em ajustes.'}</span>
                  )}
                </span>
              </button>
            )
          })
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

              {/* PRO não assinante: caixa única — pitch + planos + CTA no topo e
                  TODAS as ferramentas PRO dentro da própria caixa de assinatura. */}
              {sec.pro && !isCorretor ? (
                <div className="ferr-pro-box">
                  {ASSINATURA_ATIVA ? (
                    <div className="ferr-pro-box-head">
                      <div className="ferr-pro-box-pitch">
                        <b>Ferramentas exclusivas para corretores</b>
                        <span>Assine a Área do Corretor e desbloqueie IA de fotos, publicidade e muito mais.</span>
                      </div>
                      <div className="ferr-pro-planos">
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
                      <Link className="ferr-pro-cta-btn" to="/corretor">Assinar e desbloquear <IconArrow /></Link>
                    </div>
                  ) : (
                    <div className="ferr-pro-box-pausa">
                      <b>Ferramentas exclusivas para corretores</b>
                      <span>Estamos preparando novas ferramentas para a Área do Corretor. As assinaturas voltam em breve.</span>
                    </div>
                  )}
                  <div className="ferr-pro-box-sep" aria-hidden="true" />
                  <div className="ferr-grid-3 ferr-grid-3--pro">{grade}</div>
                </div>
              ) : (
                <>
                  {sec.pro && isCorretor && (
                    <div className="ferr-pro-ativo">
                      <FI name="star" size={16} />
                      <span>Você tem acesso à Área do Corretor.</span>
                      <Link to="/corretor" className="ferr-pro-ativo-link">Ir para o painel completo →</Link>
                    </div>
                  )}
                  <div className="ferr-grid-3">{grade}</div>
                </>
              )}
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
              <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as ferramentas no site e quero sua ajuda.')} target="_blank" rel="noopener noreferrer">
                <IconWhats /> Falar com o Vinícius
              </a>
            </div>
          </div>
        )}

        {/* ── MODAL DE CALCULADORA (investidor) ── */}
        {modalAtiva && ModalAtiva && modalAtual && (
          <div className="ferr-modal-backdrop" data-lenis-prevent onClick={() => setModalAtiva(null)}>
            <div className="ferr-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ferr-modal-hd">
                <span className="ferr-modal-ico"><FI name={modalAtual.icon} size={20} /></span>
                <h3 className="ferr-modal-tit">{modalAtual.nome}</h3>
                <button className="ferr-modal-fechar" type="button" onClick={() => setModalAtiva(null)} aria-label="Fechar calculadora">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="ferr-modal-body" data-lenis-prevent>
                <Suspense fallback={<p className="acm-loading">Carregando ferramenta…</p>}>
                  <ModalAtiva />
                </Suspense>
              </div>
              <div className="calc-cta ferr-modal-cta">
                <span>Quer que eu faça essa conta com os números reais e te mostre as melhores opções?</span>
                <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei as ferramentas no site e quero sua ajuda.')} target="_blank" rel="noopener noreferrer">
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
