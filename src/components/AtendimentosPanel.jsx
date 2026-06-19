import { useState, useEffect } from 'react'
import { IconWhats } from './icons'

// Atendimentos em aberto do Imoview → mensagem de WhatsApp + plano por IA (token-gated).
const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })).catch(() => ({ status: r.status, j: null })))
const waLink = (fone, texto) => { const d = String(fone || '').replace(/\D/g, ''); const num = d ? (d.startsWith('55') ? d : '55' + d) : ''; return `https://wa.me/${num}?text=${encodeURIComponent(texto || '')}` }
const TEMP = { quente: { t: '🔥 Quente', c: '#eb0128' }, morno: { t: '🟡 Morno', c: '#C6A15B' }, frio: { t: '🔵 Frio', c: '#5a6172' } }

export default function AtendimentosPanel({ token, onSair }) {
  const [leads, setLeads] = useState(null)
  const [erro, setErro] = useState('')
  const [geradoEm, setGeradoEm] = useState(0)
  const [planos, setPlanos] = useState({}) // id -> { loading, mensagem, temperatura, passos, copiado, erro }

  const carregar = async (force = false) => {
    setErro('')
    const { status, j } = await api({ action: 'atendimentos-list', token, force })
    if (status === 401) return onSair && onSair()
    if (!j || j.ok === false) { setErro((j && j.erro) || 'Não consegui carregar os atendimentos. Verifique a integração com o Imoview (chave/login).'); setLeads([]); return }
    setLeads(j.leads || []); setGeradoEm(j.geradoEm || 0)
  }
  useEffect(() => { carregar() }, [])

  const gerar = async (lead, force = false) => {
    setPlanos((p) => ({ ...p, [lead.id]: { ...(p[lead.id] || {}), loading: true, erro: '' } }))
    const { status, j } = await api({ action: 'atendimento-plano', token, lead, force })
    if (status === 401) return onSair && onSair()
    if (!j || j.ok === false || j.error) { setPlanos((p) => ({ ...p, [lead.id]: { loading: false, erro: (j && j.msg) || 'Falha ao gerar a mensagem.' } })); return }
    setPlanos((p) => ({ ...p, [lead.id]: { loading: false, mensagem: j.mensagem, temperatura: j.temperatura, passos: j.passos || [] } }))
  }
  const copiar = async (id, txt) => {
    try { await navigator.clipboard.writeText(txt) } catch { try { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove() } catch {} }
    setPlanos((p) => ({ ...p, [id]: { ...(p[id] || {}), copiado: true } }))
    setTimeout(() => setPlanos((p) => ({ ...p, [id]: { ...(p[id] || {}), copiado: false } })), 1800)
  }

  return (
    <div className="atend-pg">
      <div className="atend-head">
        <div>
          <h3 className="det-rel-titulo" style={{ margin: 0 }}>🔥 Atendimentos em aberto · Imoview</h3>
          <p className="painel-meta">{leads ? `${leads.length} atendimento(s)` : 'Carregando…'}{geradoEm ? ` · atualizado ${new Date(geradoEm).toLocaleString('pt-BR')}` : ''}</p>
        </div>
        <button className="admin-btn" onClick={() => { setLeads(null); carregar(true) }}>↻ Atualizar</button>
      </div>

      {erro && <p className="atend-erro">{erro}</p>}
      {leads && leads.length === 0 && !erro && <p className="painel-meta">Nenhum atendimento em aberto encontrado — ou a integração com o Imoview ainda não foi configurada (chave da API).</p>}

      <div className="atend-lista">
        {(leads || []).map((l) => {
          const pl = planos[l.id] || {}
          return (
            <div className="atend-card" key={l.id}>
              <div className="atend-card-top">
                <b>{l.nome || 'Sem nome'}</b>
                {l.fase && <span className="atend-chip">{l.fase}</span>}
                {l.origem && <span className="atend-origem">{l.origem}</span>}
              </div>
              {l.interesse && <p className="atend-interesse">🏠 {l.interesse}{l.imovelCod ? ` · cód ${l.imovelCod}` : ''}</p>}
              <p className="painel-meta">{[l.fone, l.id && `atend. ${l.id}`, l.ultimoContatoEm && `último contato ${l.ultimoContatoEm}`].filter(Boolean).join(' · ')}</p>

              {!pl.mensagem ? (
                <div className="atend-acoes">
                  <button className="atend-btn-gerar" onClick={() => gerar(l)} disabled={pl.loading}>{pl.loading ? 'Gerando…' : '✨ Gerar mensagem + plano'}</button>
                  {pl.erro && <span className="atend-erro-inline">{pl.erro}</span>}
                </div>
              ) : (
                <div className="atend-plano">
                  {pl.temperatura && TEMP[pl.temperatura] && <span className="atend-temp" style={{ background: TEMP[pl.temperatura].c }}>{TEMP[pl.temperatura].t}</span>}
                  <div className="atend-msg">{pl.mensagem}</div>
                  <div className="atend-msg-acoes">
                    <button className="atend-btn-copiar" onClick={() => copiar(l.id, pl.mensagem)}>{pl.copiado ? '✓ Copiado!' : 'Copiar'}</button>
                    <a className="atend-btn-wa" href={waLink(l.fone, pl.mensagem)} target="_blank" rel="noopener noreferrer"><IconWhats width={16} height={16} /> Enviar no WhatsApp</a>
                    <button className="atend-btn-regerar" onClick={() => gerar(l, true)} disabled={pl.loading}>{pl.loading ? '…' : 'Regerar'}</button>
                  </div>
                  {pl.passos && pl.passos.length > 0 && (
                    <ul className="atend-passos">{pl.passos.map((p, i) => <li key={i}><b>{p.passo}</b>{p.prazo ? <i> · {p.prazo}</i> : ''}</li>)}</ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
