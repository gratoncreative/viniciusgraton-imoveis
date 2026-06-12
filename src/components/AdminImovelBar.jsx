import { useState, useEffect } from 'react'
import { formatPreco } from '../data'

const LSK = 'vg_admin_token'

export default function AdminImovelBar({ im }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', fone: '' })
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const check = () => setIsAdmin(!!localStorage.getItem(LSK))
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  if (!isAdmin || !im) return null

  const token = localStorage.getItem(LSK)
  const codigo = im.codigo

  const post = async (action, extra = {}) => {
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, token, codigo, ...extra }),
    })
    return r.json()
  }

  const buscar = async () => {
    setLoading(true)
    setMsg('')
    try {
      const j = await post('owner-fetch')
      if (j.ok) {
        const o = j.owner || { nome: '', email: '', fone: '' }
        const temDados = !!(o.nome || o.fone)
        setOwner(temDados ? o : null)
        setForm(o)
        if (j.source && j.source.startsWith('imoview')) setMsg('✓ Captado do Imoview e salvo automaticamente')
        else if (j.source === 'saved') setMsg('✓ Dados já cadastrados neste imóvel')
        else { setMsg('Nenhum dado encontrado. Preencha os campos abaixo.'); setEditing(true) }
      } else {
        setMsg(j.msg || 'Erro ao buscar dados')
        setEditing(true)
      }
    } catch {
      setMsg('Falha de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  const salvar = async () => {
    if (!form.nome && !form.fone) return
    setLoading(true)
    setMsg('')
    try {
      const j = await post('owner-save', { owner: form })
      if (j.ok) {
        setOwner(j.owner)
        setEditing(false)
        setMsg('✓ Dados do proprietário salvos')
      } else {
        setMsg(j.msg || 'Erro ao salvar')
      }
    } catch {
      setMsg('Falha de conexão')
    }
    setLoading(false)
  }

  const waLink = () => {
    const primeiroNome = (owner?.nome || '').split(' ')[0]
    const preco = im.preco ? formatPreco(im.preco) : 'a combinar'
    const tipo = (im.tipo || 'imóvel').toLowerCase()
    const bairro = im.bairro || ''
    const finalidade = (im.finalidade || 'venda').toLowerCase()
    const area = im.area ? ` de ${im.area}m²` : ''
    const texto = [
      `Olá${primeiroNome ? ', ' + primeiroNome : ''}!`,
      `Aqui é o Vinícius Graton, da Rotina Imobiliária.`,
      `Tenho um cliente com interesse no seu ${tipo}${area} no ${bairro} (código ${codigo}).`,
      `Pode confirmar: o imóvel ainda está disponível para ${finalidade}?`,
      `E o valor de ${preco} ainda se mantém? Meu cliente gostou muito e estamos em bom momento para avançar.`,
      `Aguardo seu retorno!`,
    ].join('\n\n')
    const fone = (owner?.fone || '').replace(/\D/g, '')
    const num = fone ? (fone.startsWith('55') ? fone : '55' + fone) : ''
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
  }

  const temContato = !!(owner && (owner.nome || owner.fone))

  return (
    <div className="adm-bar" role="region" aria-label="Painel administrativo">
      <div className="adm-bar-strip">
        <span className="adm-bar-label">Admin · cód. {codigo}</span>
        <button
          className="adm-bar-btn"
          onClick={() => {
            const next = !open
            setOpen(next)
            if (next && !owner && !loading) buscar()
          }}
        >
          {open ? '▲' : '▼'} Proprietário
        </button>
        {temContato && (
          <a
            className="adm-bar-btn adm-bar-wa"
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp →
          </a>
        )}
      </div>

      {open && (
        <div className="adm-panel">
          {loading && (
            <p className="adm-status adm-status--load">Buscando dados no Imoview…</p>
          )}
          {!loading && msg && (
            <p className={`adm-status${msg.startsWith('✓') ? ' adm-status--ok' : ''}`}>{msg}</p>
          )}

          {!editing && temContato ? (
            <div className="adm-owner-view">
              <div className="adm-field"><label>Nome</label><span>{owner.nome || '—'}</span></div>
              <div className="adm-field">
                <label>E-mail</label>
                {owner.email
                  ? <a href={`mailto:${owner.email}`}>{owner.email}</a>
                  : <span>—</span>}
              </div>
              <div className="adm-field">
                <label>Telefone</label>
                {owner.fone
                  ? <a href={`tel:${owner.fone}`}>{owner.fone}</a>
                  : <span>—</span>}
              </div>
              <div className="adm-acoes">
                <button className="adm-btn" onClick={() => { setEditing(true); setForm(owner) }}>
                  Editar
                </button>
                <a className="adm-btn adm-btn--wa" href={waLink()} target="_blank" rel="noopener noreferrer">
                  Enviar WhatsApp ao proprietário
                </a>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="adm-form">
                <input
                  className="adm-input"
                  placeholder="Nome do proprietário"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                />
                <input
                  className="adm-input"
                  placeholder="E-mail"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                  className="adm-input"
                  placeholder="Telefone / WhatsApp (com DDD)"
                  value={form.fone}
                  onChange={e => setForm(f => ({ ...f, fone: e.target.value }))}
                />
                <div className="adm-acoes">
                  <button
                    className="adm-btn adm-btn--gold"
                    onClick={salvar}
                    disabled={loading || (!form.nome && !form.fone)}
                  >
                    Salvar dados
                  </button>
                  {temContato && (
                    <button className="adm-btn" onClick={() => setEditing(false)}>Cancelar</button>
                  )}
                  {!temContato && (
                    <button className="adm-btn" onClick={buscar} disabled={loading}>
                      ↺ Buscar no Imoview
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
