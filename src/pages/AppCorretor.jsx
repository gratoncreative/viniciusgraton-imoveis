import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CONFIG, linkWhatsApp } from '../data'

// ─────────────────────────────────────────────────────────────────────────────
//  APP DO CORRETOR (PWA) — cockpit mobile que organiza o arsenal já existente.
//  Não recria ferramentas: leva o corretor para /admin (leads), /corretor
//  (ferramentas, captação, WhatsApp) e /avaliar (ACM/parecer).
// ─────────────────────────────────────────────────────────────────────────────

const ICN = {
  whats: 'M20.5 3.5A11 11 0 0 0 3.2 17L2 22l5.1-1.3A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.7.7-.9 1.6-.6 2.6.5 1.7 1.7 3.1 3.4 4 .9.5 1.8.7 2.7.6.6-.1 1.3-.5 1.5-1 .2-.4.2-.8.1-.9z',
  leads: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  tools: 'M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5L17 13l1.7-1.8L21 8.7a4 4 0 0 0-6.3-2.4z',
  chart: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4',
  home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
  capta: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  install: 'M12 3v12M7 10l5 5 5-5M5 21h14',
}
const Ico = ({ d, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

const saudacao = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
const hojeFmt = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

// detecta iOS (Safari não dispara beforeinstallprompt — precisa de instrução manual)
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '')

export default function AppCorretor() {
  const { pathname } = useLocation()
  const [deferido, setDeferido] = useState(null)   // evento beforeinstallprompt
  const [instalado, setInstalado] = useState(false)
  const [dicaIOS, setDicaIOS] = useState(false)

  // título + noindex (app privado, não deve aparecer na busca)
  useEffect(() => {
    const titAntes = document.title
    document.title = 'VG Corretor — Painel'
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { document.title = titAntes; meta.remove() }
  }, [])

  // troca o manifest para o do corretor enquanto está no app; restaura ao sair
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]')
    const antes = link ? link.getAttribute('href') : null
    if (link) link.setAttribute('href', '/manifest-corretor.webmanifest')
    return () => { if (link && antes) link.setAttribute('href', antes) }
  }, [])

  // captura o prompt de instalação (Android/Chrome) e o estado de já instalado
  useEffect(() => {
    const jaApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setInstalado(!!jaApp)
    const onPrompt = (e) => { e.preventDefault(); setDeferido(e) }
    const onInstalado = () => { setInstalado(true); setDeferido(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalado)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalado)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (deferido) { deferido.prompt(); await deferido.userChoice; setDeferido(null); return }
    if (ehIOS()) setDicaIOS(true)            // iOS: mostra instrução manual
  }, [deferido])

  const podeInstalar = !instalado && (deferido || ehIOS())

  return (
    <div className="appc">
      <Estilos />

      <header className="appc-top">
        <div>
          <p className="appc-ola">{saudacao()},</p>
          <h1 className="appc-nome">{CONFIG.nome.split(' ')[0]}</h1>
          <p className="appc-data">{hojeFmt()}</p>
        </div>
        {podeInstalar && (
          <button className="appc-instalar" onClick={instalar}>
            <Ico d={ICN.install} size={18} /> Instalar
          </button>
        )}
      </header>

      {dicaIOS && (
        <div className="appc-ios" role="status">
          No iPhone: toque em <strong>Compartilhar</strong> <Ico d={ICN.share} size={16} /> e depois em
          <strong> “Adicionar à Tela de Início”</strong>.
          <button className="appc-ios-x" onClick={() => setDicaIOS(false)} aria-label="Fechar">×</button>
        </div>
      )}

      {/* AÇÕES RÁPIDAS */}
      <section className="appc-sec">
        <h2 className="appc-h2">Ações rápidas</h2>
        <div className="appc-rapidas">
          <a className="appc-rapida vermelho" href={linkWhatsApp('')} target="_blank" rel="noopener noreferrer">
            <Ico d={ICN.whats} /> <span>WhatsApp</span>
          </a>
          <Link className="appc-rapida navy" to="/corretor/rotina">
            <Ico d={ICN.capta} /> <span>Captação</span>
          </Link>
          <Link className="appc-rapida navy" to="/avaliar">
            <Ico d={ICN.chart} /> <span>Avaliar</span>
          </Link>
        </div>
      </section>

      {/* 1 — LEADS */}
      <section className="appc-sec">
        <h2 className="appc-h2">Seus leads</h2>
        <Link className="appc-bloco" to="/admin">
          <span className="appc-bloco-ic"><Ico d={ICN.leads} size={26} /></span>
          <span className="appc-bloco-txt">
            <strong>CRM &amp; Atendimentos</strong>
            <small>Leads do site e atendimentos do Imoview, com follow-up por IA.</small>
          </span>
          <span className="appc-bloco-seta">›</span>
        </Link>
      </section>

      {/* 2 — WHATSAPP & CAPTAÇÃO */}
      <section className="appc-sec">
        <h2 className="appc-h2">WhatsApp &amp; captação</h2>
        <div className="appc-grid">
          <Link className="appc-card" to="/corretor/rotina">
            <Ico d={ICN.capta} /> <strong>Abordagem 1º contato</strong>
            <small>Mensagem por código, com gatilhos do bairro.</small>
          </Link>
          <Link className="appc-card" to="/corretor/legenda">
            <Ico d={ICN.doc} /> <strong>Legenda p/ portais</strong>
            <small>Descrição pronta p/ OLX, ZAP e VivaReal.</small>
          </Link>
          <Link className="appc-card" to="/corretor/objecoes">
            <Ico d={ICN.tools} /> <strong>Script de objeções</strong>
            <small>Respostas prontas pro WhatsApp.</small>
          </Link>
          <Link className="appc-card" to="/corretor/post">
            <Ico d={ICN.share} /> <strong>Estúdio de posts</strong>
            <small>Story e feed em lote, 6 estilos.</small>
          </Link>
        </div>
        <Link className="appc-vertudo" to="/corretor">Ver todas as ferramentas ›</Link>
      </section>

      {/* 3 — AVALIAÇÃO & PARECER */}
      <section className="appc-sec">
        <h2 className="appc-h2">Avaliação &amp; parecer</h2>
        <Link className="appc-bloco" to="/avaliar">
          <span className="appc-bloco-ic"><Ico d={ICN.chart} size={26} /></span>
          <span className="appc-bloco-txt">
            <strong>Avaliar imóvel (ACM)</strong>
            <small>Referência pela área com base no m² do bairro e parecer em PDF.</small>
          </span>
          <span className="appc-bloco-seta">›</span>
        </Link>
      </section>

      <div className="appc-rodape">Painel de trabalho — {CONFIG.marca}</div>

      {/* BARRA DE ABAS */}
      <nav className="appc-tabs" aria-label="Navegação do app">
        <Tab to="/app" pathname={pathname} d={ICN.home} label="Início" exact />
        <Tab to="/admin" pathname={pathname} d={ICN.leads} label="Leads" />
        <Tab to="/corretor" pathname={pathname} d={ICN.tools} label="Ferramentas" />
        <Tab to="/avaliar" pathname={pathname} d={ICN.chart} label="Avaliar" />
      </nav>
    </div>
  )
}

function Tab({ to, pathname, d, label, exact }) {
  const ativo = exact ? pathname === to : pathname.startsWith(to)
  return (
    <Link className={`appc-tab${ativo ? ' on' : ''}`} to={to}>
      <Ico d={d} size={22} />
      <span>{label}</span>
    </Link>
  )
}

// estilos próprios do app (escopados em .appc) — base marfim, marinho e dourado;
// botões só marinho+branco ou vermelho+branco (regra de ouro). Nada de preto.
function Estilos() {
  return (
    <style>{`
.appc{--navy:#1C2A44;--escuro:#212b3d;--vermelho:#EB0128;--ouro:#B68A3E;--marfim:#FBFAF7;--linha:#ECE7DD;
  min-height:100vh;background:var(--marfim);color:var(--navy);
  font-family:'Manrope',system-ui,sans-serif;padding:0 16px calc(86px + env(safe-area-inset-bottom));
  max-width:560px;margin:0 auto;}
.appc-top{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 0 8px;}
.appc-ola{margin:0;font-size:15px;color:#6b7280;}
.appc-nome{margin:2px 0 0;font-family:'Fraunces',serif;font-size:30px;font-weight:700;line-height:1;}
.appc-data{margin:6px 0 0;font-size:13px;color:#8a8f98;text-transform:capitalize;}
.appc-instalar{display:inline-flex;align-items:center;gap:6px;background:var(--navy);color:#fff;border:0;
  border-radius:999px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;}
.appc-ios{background:#fff;border:1px solid var(--linha);border-radius:14px;padding:12px 38px 12px 14px;
  margin:10px 0;font-size:13px;line-height:1.5;position:relative;display:flex;flex-wrap:wrap;gap:4px;align-items:center;}
.appc-ios strong{color:var(--navy);} .appc-ios svg{vertical-align:middle;color:var(--navy);}
.appc-ios-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:20px;color:#9aa0a6;cursor:pointer;line-height:1;}
.appc-sec{margin-top:22px;}
.appc-h2{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8a8f98;margin:0 0 10px;}
.appc-rapidas{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.appc-rapida{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
  border-radius:16px;padding:16px 8px;font-size:13px;font-weight:700;text-decoration:none;color:#fff;}
.appc-rapida.navy{background:var(--navy);} .appc-rapida.vermelho{background:var(--vermelho);}
.appc-bloco{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--linha);
  border-radius:18px;padding:16px;text-decoration:none;color:var(--navy);box-shadow:0 6px 18px rgba(33,43,61,.05);}
.appc-bloco-ic{flex:0 0 auto;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;
  background:var(--navy);color:#fff;}
.appc-bloco-txt{flex:1;display:flex;flex-direction:column;gap:3px;}
.appc-bloco-txt strong{font-size:16px;} .appc-bloco-txt small{font-size:12.5px;color:#6b7280;line-height:1.4;}
.appc-bloco-seta{font-size:24px;color:var(--ouro);font-weight:700;}
.appc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.appc-card{display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--linha);
  border-radius:16px;padding:14px;text-decoration:none;color:var(--navy);}
.appc-card svg{color:var(--ouro);} .appc-card strong{font-size:14px;} .appc-card small{font-size:11.5px;color:#6b7280;line-height:1.4;}
.appc-vertudo{display:block;text-align:center;margin-top:12px;font-size:14px;font-weight:700;color:var(--navy);text-decoration:none;}
.appc-rodape{text-align:center;font-size:11.5px;color:#aab0b6;margin:28px 0 8px;}
.appc-tabs{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;background:#fff;
  border-top:1px solid var(--linha);padding:8px 0 calc(8px + env(safe-area-inset-bottom));
  max-width:560px;margin:0 auto;}
.appc-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;text-decoration:none;
  color:#9aa0a6;font-size:11px;font-weight:600;}
.appc-tab.on{color:var(--navy);}
@media (max-width:380px){.appc-grid{grid-template-columns:1fr;}}
    `}</style>
  )
}
