import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Barra de abas global do App do Corretor — aparece em todas as telas internas
// quando em "modo app" (instalado/standalone ou entrou pelo /app). Só no mobile.
const TABS = [
  { to: '/app', label: 'Início', exact: true, d: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9' },
  { to: '/admin', label: 'Leads', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  { to: '/corretor', label: 'Ferramentas', d: 'M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5L17 13l1.7-1.8L21 8.7a4 4 0 0 0-6.3-2.4z' },
  { to: '/avaliar', label: 'Avaliar', d: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4' },
]

export default function AppTabBar() {
  const { pathname } = useLocation()

  // marca o body para reservar espaço embaixo (conteúdo não fica atrás da barra)
  useEffect(() => {
    document.body.classList.add('com-appbar')
    return () => document.body.classList.remove('com-appbar')
  }, [])

  return (
    <nav className="vgtabs" aria-label="Navegação do app">
      {TABS.map((t) => {
        const ativo = t.exact ? pathname === t.to : pathname.startsWith(t.to)
        return (
          <Link key={t.to} to={t.to} className={`vgtab${ativo ? ' on' : ''}`}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
            <span>{t.label}</span>
          </Link>
        )
      })}
      <style>{`
.vgtabs{position:fixed;left:0;right:0;bottom:0;z-index:300;display:none;background:#fff;
  border-top:1px solid var(--border,#ECE7DD);padding:8px 0 calc(8px + env(safe-area-inset-bottom));}
.vgtab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;text-decoration:none;
  color:#9aa0a6;font-size:11px;font-weight:600;font-family:var(--font-body,system-ui);}
.vgtab.on{color:var(--navy,#212b3d);}
.vgtab.on svg{color:var(--gold-2,#EB0128);}
@media (max-width:720px){.vgtabs{display:flex;}}
body.com-appbar{padding-bottom:calc(66px + env(safe-area-inset-bottom));}
      `}</style>
    </nav>
  )
}
