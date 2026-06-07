import { useState, useEffect } from 'react'
import { useSEO } from '../useSEO'
import { CONFIG } from '../data'
import { IconWhats } from '../components/icons'

const LSK = 'vg_painel_key'
const waLink = (fone) => `https://wa.me/55${String(fone || '').replace(/\D/g, '')}`

export default function Painel() {
  useSEO({ title: 'Painel do Vinícius', description: 'Área administrativa.', path: '/painel' })
  const [chave, setChave] = useState(() => { try { return localStorage.getItem(LSK) || '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [leads, setLeads] = useState(null)
  const [clientes, setClientes] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!chave) return
    setCarregando(true); setErro('')
    Promise.all([
      fetch(`/api/eng?leads=${encodeURIComponent(chave)}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`/api/conta?clientes=${encodeURIComponent(chave)}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
    ]).then(([l, c]) => { setLeads(l); setClientes(c) })
      .catch((s) => { setErro(s === 403 ? 'Chave inválida.' : 'Não consegui carregar (o backend KV pode não estar ativo no preview).'); if (s === 403) { setChave(''); try { localStorage.removeItem(LSK) } catch {} } })
      .finally(() => setCarregando(false))
  }, [chave])

  const entrar = (e) => { e.preventDefault(); if (!input.trim()) return; try { localStorage.setItem(LSK, input.trim()) } catch {}; setChave(input.trim()) }

  if (!chave) {
    return (
      <main className="pagina section--light det" style={{ minHeight: '60vh' }}>
        <div className="container" style={{ maxWidth: 420 }}>
          <h1 className="section-title" style={{ textAlign: 'center' }}>Painel</h1>
          <form className="lead-form" onSubmit={entrar} style={{ marginTop: 24 }}>
            <label><span>Chave de acesso</span><input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus /></label>
            <button className="btn btn-gold lead-submit" type="submit">Entrar</button>
            {erro && <p className="anunciar-erro">{erro}</p>}
          </form>
        </div>
      </main>
    )
  }

  const Bloco = ({ titulo, itens, render }) => (
    <section className="conta-bloco">
      <h2 className="det-rel-titulo">{titulo} <span style={{ color: 'var(--gold-3)' }}>({itens.length})</span></h2>
      {itens.length ? <div className="painel-lista">{itens.map(render)}</div> : <p className="section-sub">Nada por aqui ainda.</p>}
    </section>
  )

  return (
    <main className="pagina section--light det painel-pg">
      <div className="container">
        <div className="conta-hero">
          <div><span className="eyebrow">Painel</span><h1 className="section-title">Seus <em>leads e cadastros</em></h1></div>
          <div className="conta-hero-acoes">
            <a className="btn btn-gold" href={`/api/anuncio?ver=${encodeURIComponent(chave)}`} target="_blank" rel="noopener">Ver imóveis enviados</a>
            <button className="btn btn-ghost" onClick={() => { setChave(''); try { localStorage.removeItem(LSK) } catch {} }}>Sair</button>
          </div>
        </div>

        {carregando && <p className="section-sub">Carregando…</p>}
        {erro && <p className="anunciar-erro">{erro}</p>}

        {clientes && (
          <Bloco titulo="Cadastros (área do cliente)" itens={clientes.clientes || []} render={(c) => (
            <div className="painel-card" key={c.token}>
              <b>{c.nome || 'Sem nome'}</b>
              <span>{c.email} · <a href={waLink(c.fone)} target="_blank" rel="noopener">{c.fone}</a></span>
              <span className="painel-meta">{c.objetivo} · {c.bairros || 'sem bairro'} · {c.faixa || 'faixa livre'}{c.idade ? ` · ${c.idade} anos` : ''}{c.sexo ? ` · ${c.sexo}` : ''}</span>
              <span className="painel-meta">favoritos: {(c.favoritos || []).length} · visitados: {(c.historico || []).length} · {new Date(c.atualizadoEm || 0).toLocaleDateString('pt-BR')}</span>
            </div>
          )} />
        )}

        {leads && (
          <Bloco titulo="Leads (avise-me, condomínios, avaliação)" itens={leads.leads || []} render={(l) => (
            <div className="painel-card" key={l.ts}>
              <b>{l.nome}</b>
              <span><a href={waLink(l.fone)} target="_blank" rel="noopener">{l.fone}</a></span>
              <span className="painel-meta">{l.bairro || l.cod} · {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : ''}</span>
            </div>
          )} />
        )}

        <p className="calc-nota" style={{ marginTop: 20 }}>Dica: salve este link nos favoritos do seu celular. WhatsApp do site: {CONFIG.telefone || ''}.</p>
      </div>
    </main>
  )
}
