import { useState, useEffect } from 'react'
import { IconShield } from './icons'

// Painel de CONVERSÃO — quantos visitantes clicam em contato (WhatsApp/telefone/e-mail)
// e em QUAIS páginas. Lê o endpoint público /api/eng?convstats=1 (só contagens, sem PII).
// Totalmente isolado: se a leitura falhar, mostra aviso e não afeta o resto do painel.
const EV_LABEL = { whatsapp: 'WhatsApp', tel: 'Telefone', email: 'E-mail' }

export default function ConversoesPanel() {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    fetch('/api/eng?convstats=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setD(j) : setErro(true)))
      .catch(() => setErro(true))
  }, [])

  if (erro) return <section><p className="section-sub">Não consegui carregar as conversões agora. Tente Atualizar.</p></section>
  if (!d) return <section><p className="section-sub">Carregando conversões…</p></section>

  const evs = Object.entries(d.ev || {})
  const maxDia = Math.max(1, ...(d.dias || []).map((x) => x.total || 0))

  return (
    <section className="admin-conv">
      <h2 className="det-rel-titulo" style={{ marginTop: 0 }}>Conversões · cliques de contato</h2>
      <p className="painel-meta" style={{ marginBottom: 14 }}>
        Cada clique em WhatsApp, telefone ou e-mail no site. Mostra <b>quais páginas geram contato</b> — o que realmente vira lead, não só visita.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={card}><span style={rot}>Total de cliques</span><b style={val}>{d.totalGeral || 0}</b></div>
        {evs.map(([k, n]) => (
          <div key={k} style={card}><span style={rot}>{EV_LABEL[k] || k}</span><b style={val}>{n}</b></div>
        ))}
      </div>

      {!d.totalGeral && (
        <div className="det-trust" style={{ marginTop: 4 }}>
          <IconShield width={20} height={20} />
          <p>Ainda sem cliques registrados. A medição começou agora — os números aparecem conforme os visitantes clicam em “Falar agora” / WhatsApp. Volte em alguns dias.</p>
        </div>
      )}

      {(d.topPaths || []).length > 0 && (
        <>
          <h3 className="admin-mini-label" style={{ margin: '22px 0 8px' }}>Páginas que mais geram contato</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.topPaths.map((p) => (
              <a key={p.path} href={p.path} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 12px', borderRadius: 10, textDecoration: 'none', background: '#fff', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</span>
                <b style={{ color: '#1C2A44', fontFamily: 'var(--font-head)' }}>{p.n}</b>
              </a>
            ))}
          </div>
        </>
      )}

      {(d.dias || []).length > 0 && (
        <>
          <h3 className="admin-mini-label" style={{ margin: '22px 0 8px' }}>Por dia (últimos {d.dias.length})</h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {d.dias.slice(0, 30).reverse().map((x) => (
              <div key={x.dia} title={`${x.dia}: ${x.total} cliques`} style={{ textAlign: 'center', minWidth: 34 }}>
                <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ width: 16, height: `${Math.round((x.total / maxDia) * 60)}px`, minHeight: 3, background: '#C9A227', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: '.66rem', color: 'var(--text-mute)' }}>{x.dia.slice(5)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

const card = { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', minWidth: 120 }
const rot = { display: 'block', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.04em', color: '#8a909c' }
const val = { display: 'block', fontFamily: 'var(--font-head)', fontSize: '1.5rem', color: '#1C2A44', marginTop: 2 }
