import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getCorretor, salvarCorretor, sairCorretor } from '../corretor'
import { registrarLead } from '../engajamento'
import { CalcComissao, CalcACM, FichaAvaliacao } from './Ferramentas'
import FerramentaRotina from '../components/FerramentaRotina'
import { IconShield, IconArrow } from '../components/icons'

// Estúdios pesados (IA) só carregam quando o corretor abre — mantém a página leve
const MelhorarFotos = lazy(() => import('../components/MelhorarFotos'))
const PostGen = lazy(() => import('../components/PostGen'))
const RemoverMarca = lazy(() => import('../components/RemoverMarca'))

const soNum = (s) => String(s || '').replace(/\D/g, '')
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const ICN = {
  chat: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
  percent: 'M19 5 5 19M7.5 7.5h.01M16.5 16.5h.01M6 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M15 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  chart: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  megafone: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14',
  varinha: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M14 22l-4-4L20 8l4 4-10 10z',
  swap: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7',
  foguete: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
  painel: 'M3 3h18v18H3zM3 9h18M9 21V9',
}
const Ico = ({ name, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICN[name]} /></svg>
)

// ferramentas internas (renderizam aqui) e atalhos (vão pra outra página)
const TOOLS = [
  { id: 'rotina', nome: 'Abordagem por código', desc: 'Cole o código do imóvel e gere a mensagem de 1º contato com gatilhos + benefícios da região.', icon: 'chat' },
  { id: 'fotos', nome: 'Estúdio de fotos', desc: 'Endireitar, filtros, super-resolução com IA, marca d’água e vídeo do imóvel.', icon: 'camera' },
  { id: 'post', nome: 'Estúdio de publicidade', desc: 'Posts prontos pra Story e Feed com 5 estilos de design, em lote.', icon: 'megafone' },
  { id: 'marca', nome: 'Remover marca d’água', desc: 'Limpa marcas das fotos com IA, direto no navegador.', icon: 'varinha' },
  { id: 'comissao', nome: 'Calculadora de comissão', desc: 'Comissão e repasse de uma venda.', icon: 'percent' },
  { id: 'acm', nome: 'Análise de mercado (ACM)', desc: 'Sugere o preço do imóvel pelo m² do bairro.', icon: 'chart' },
  { id: 'ficha', nome: 'Ficha de avaliação rápida', desc: 'Gera um resumo do imóvel pra enviar.', icon: 'edit' },
]
const ATALHOS = [
  { to: '/ferramentas/converter', nome: 'Conversor de fotos', desc: 'JPG, PNG, WebP e AVIF em lote.', icon: 'swap' },
  { to: '/impulsionar', nome: 'Impulsionar anúncio', desc: 'Destaque pago pro seu imóvel.', icon: 'foguete' },
]

const RENDER = { rotina: FerramentaRotina, comissao: CalcComissao, acm: CalcACM, ficha: FichaAvaliacao, fotos: MelhorarFotos, post: PostGen, marca: RemoverMarca }

// ---------- porta de entrada: valida o código da Rotina no servidor ----------
function GateCorretor({ onOk }) {
  const [f, setF] = useState({ nome: '', creci: '', fone: '', email: '', codigo: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: k === 'fone' ? mascaraFone(e.target.value) : e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    const nome = f.nome.trim()
    if (nome.length < 3) { setErro('Informe seu nome completo.'); return }
    if (soNum(f.fone).length < 10) { setErro('Informe um WhatsApp válido com DDD.'); return }
    if (!f.codigo.trim()) { setErro('Digite o código de acesso enviado após o seu cadastro.'); return }
    setErro(''); setEnviando(true)
    let res = { ok: false }
    try {
      const r = await fetch('/api/corretor-acesso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: f.codigo.trim() }) })
      res = await r.json()
    } catch { setErro('Falha de conexão. Tente de novo.'); setEnviando(false); return }
    if (res.naoConfigurado) { setErro('Acesso ainda não liberado. Aguarde a confirmação do seu cadastro ou entre em contato.'); setEnviando(false); return }
    if (!res.ok) { setErro('Código inválido. Verifique o código recebido após a confirmação do seu cadastro.'); setEnviando(false); return }
    const c = salvarCorretor({ nome, creci: f.creci.trim(), imobiliaria: f.email.trim() ? '' : 'Rotina Imobiliária', rotina: true, fone: f.fone.trim(), email: f.email.trim() })
    try {
      registrarLead({ cod: 'corretor-pro', nome, fone: f.fone.trim(), email: f.email.trim(), bairro: `Corretor Pro${f.creci.trim() ? ' · CRECI ' + f.creci.trim() : ''}`.slice(0, 120) })
    } catch {}
    onOk(c)
  }

  const msgCadastro = 'Olá Vinícius! Tenho interesse em assinar a Área do Corretor. Pode me explicar como funciona o cadastro e o pagamento?'

  return (
    <div className="corr-gate-wrap">
      <div className="corr-pitch">
        <span className="eyebrow">Ferramentas exclusivas para corretores</span>
        <h1 className="section-title">Área do <em>corretor</em></h1>
        <p className="section-sub" style={{ marginTop: 12 }}>
          Todas as ferramentas de trabalho num lugar só — feitas pra você captar, divulgar e vender mais rápido.
        </p>
        <ul className="corr-lista">
          {TOOLS.map((t) => (
            <li key={t.id}><span className="corr-lista-ico"><Ico name={t.icon} size={18} /></span><div><b>{t.nome}</b><span>{t.desc}</span></div></li>
          ))}
        </ul>
      </div>

      <form className="lead-form conta-form corr-form" onSubmit={enviar}>
        <span className="conta-form-selo">Área profissional</span>
        <h3>Entrar na área do corretor</h3>
        <div className="corr-planos">
          <div className="corr-plano">
            <span className="corr-plano-periodo">Mensal</span>
            <strong className="corr-plano-preco">R$ 49,90</strong>
            <span className="corr-plano-detalhe">/mês · acesso completo</span>
          </div>
          <div className="corr-plano-sep">ou</div>
          <div className="corr-plano">
            <span className="corr-plano-periodo">Semanal</span>
            <strong className="corr-plano-preco">R$ 15</strong>
            <span className="corr-plano-detalhe">/semana · sem compromisso</span>
          </div>
        </div>
        <p className="conta-form-promessa">
          Após o pagamento, você recebe o <b>código de acesso</b> para liberar todas as ferramentas imediatamente.
          Ainda não tem cadastro?{' '}
          <a href={`https://wa.me/5534991570494?text=${encodeURIComponent(msgCadastro)}`} target="_blank" rel="noopener"><b>Fale com o Vinícius.</b></a>
        </p>
        <label><span>Código de acesso *</span><input value={f.codigo} onChange={set('codigo')} placeholder="Código recebido após o pagamento" autoComplete="off" required /></label>
        <label><span>Nome completo *</span><input value={f.nome} onChange={set('nome')} required /></label>
        <div className="conta-form-row">
          <label><span>CRECI <i>(se tiver)</i></span><input value={f.creci} onChange={set('creci')} placeholder="MG-00000" /></label>
          <label><span>WhatsApp *</span><input type="tel" inputMode="tel" value={f.fone} onChange={set('fone')} placeholder="(34) 99999-9999" required /></label>
        </div>
        <label><span>E-mail <i>(opcional)</i></span><input type="email" value={f.email} onChange={set('email')} placeholder="voce@email.com" /></label>
        {erro && <p className="lead-erro">{erro}</p>}
        <button type="submit" className="btn btn-gold lead-submit" disabled={enviando}><IconShield width={18} height={18} /> {enviando ? 'Validando…' : 'Entrar na área'} <IconArrow /></button>
        <p className="lead-note">Acesso liberado conforme o cadastro. Seus dados ficam protegidos e são usados apenas para autenticação.</p>
      </form>
    </div>
  )
}

// ---------- hub logado: todas as ferramentas ----------
function HubCorretor({ corretor, onSair }) {
  const [ativa, setAtiva] = useState('rotina')
  const painelRef = useRef(null)
  const atual = TOOLS.find((t) => t.id === ativa)
  const Ativa = RENDER[ativa]
  const escolher = (id) => { setAtiva(id); setTimeout(() => painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }
  const primeiro = (corretor.nome || '').trim().split(' ')[0]

  return (
    <>
      <header className="corr-hero">
        <div>
          <span className="eyebrow">Área do corretor · Rotina Imobiliária</span>
          <h1 className="section-title">Olá, <em>{primeiro || 'corretor'}</em></h1>
          <p className="section-sub" style={{ marginTop: 8 }}>Suas ferramentas de captação, divulgação e venda — tudo num lugar só.</p>
        </div>
        <div className="corr-hero-acoes">
          {corretor.creci && <span className="corr-chip">CRECI {corretor.creci}</span>}
          <button className="btn btn-ghost" type="button" onClick={onSair}>Sair</button>
        </div>
      </header>

      <div className="ferr-grid corr-grid">
        {TOOLS.map((t) => (
          <button key={t.id} className={`ferr-card ${ativa === t.id ? 'on' : ''}`} onClick={() => escolher(t.id)}>
            <span className="ferr-ico"><Ico name={t.icon} /></span>
            <span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span>
          </button>
        ))}
        {ATALHOS.map((t) => (
          <Link key={t.to} className="ferr-card" to={t.to}>
            <span className="ferr-ico"><Ico name={t.icon} /></span>
            <span className="ferr-txt"><b>{t.nome}</b><i>{t.desc}</i></span>
          </Link>
        ))}
        <Link className="ferr-card ferr-card--gold" to="/admin">
          <span className="ferr-ico"><Ico name="painel" /></span>
          <span className="ferr-txt"><b>Painel administrativo</b><i>Imóveis, leads e clientes — acesso restrito (login próprio).</i></span>
        </Link>
      </div>

      <div className="calc-painel corr-painel" ref={painelRef} style={{ marginTop: 30 }}>
        <h3 className="calc-painel-tit"><span className="calc-tit-ico"><Ico name={atual.icon} size={20} /></span>{atual.nome}</h3>
        <Suspense fallback={<p className="section-sub" style={{ padding: '24px 0' }}>Carregando a ferramenta…</p>}>
          <Ativa />
        </Suspense>
      </div>
    </>
  )
}

export default function Corretor() {
  useSEO({
    title: 'Área do corretor — Rotina Imobiliária | Vinícius Graton',
    description: 'Área exclusiva para corretores da Rotina Imobiliária: abordagem por código, estúdio de fotos com IA, publicidade, comissão, ACM e ficha de avaliação.',
    path: '/corretor',
  })
  const [corretor, setCorretor] = useState(() => getCorretor())
  useEffect(() => {
    const ler = () => setCorretor(getCorretor())
    window.addEventListener('vg-corretor', ler)
    return () => window.removeEventListener('vg-corretor', ler)
  }, [])

  return (
    <main className="pagina section--light det corretor-pg">
      <div className="container">
        {corretor
          ? <HubCorretor corretor={corretor} onSair={() => { sairCorretor() }} />
          : <GateCorretor onOk={setCorretor} />}
      </div>
    </main>
  )
}
