import { useEffect, useState } from 'react'
import { IMOVEIS, TIPOS_IMOVEL, BAIRROS_TODOS, filtrarParaCliente, formatPreco } from '../data'
import InputMoeda from './InputMoeda'

const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })))

const VAZIO = { id: '', nome: '', whatsapp: '', finalidade: 'Comprar', tipos: [], bairros: [], precoMin: '', precoMax: '', quartosMin: '', suitesMin: '', vagasMin: '', areaMin: '', obs: '', sugeridos: [] }
const waLink = (wa, msg) => { const d = String(wa || '').replace(/\D/g, ''); const full = d.length <= 11 ? '55' + d : d; return `https://wa.me/${full}?text=${encodeURIComponent(msg)}` }

export default function AdminCRM({ token, onSair }) {
  const [clientes, setClientes] = useState(null)
  const [sel, setSel] = useState(null) // null = lista; objeto = editando
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)

  const carregar = async () => {
    const { status, j } = await api({ action: 'crm-list', token })
    if (status === 401) return onSair()
    setClientes(j.clientes || [])
  }
  useEffect(() => { carregar() }, [])

  const setF = (k, v) => setSel((s) => ({ ...s, [k]: v }))
  const toggleArr = (k, val) => setSel((s) => { const a = new Set(s[k] || []); a.has(val) ? a.delete(val) : a.add(val); return { ...s, [k]: [...a] } })

  // imóveis que casam com os critérios atuais (para sugerir/escolher)
  const matches = sel ? filtrarParaCliente({
    tipos: sel.tipos, bairros: sel.bairros,
    precoMin: +sel.precoMin || 0, precoMax: +sel.precoMax || 0,
    quartosMin: +sel.quartosMin || 0, suitesMin: +sel.suitesMin || 0, vagasMin: +sel.vagasMin || 0, areaMin: +sel.areaMin || 0,
  }) : []

  const sugerirAuto = () => setSel((s) => ({ ...s, sugeridos: matches.slice(0, 9).map((x) => String(x.im.codigo)) }))
  const toggleSug = (cod) => setSel((s) => { const a = new Set(s.sugeridos || []); a.has(cod) ? a.delete(cod) : a.add(cod); return { ...s, sugeridos: [...a] } })

  const salvar = async () => {
    setErro('')
    const { status, j } = await api({ action: 'crm-save', token, cliente: sel })
    if (status === 401) { onSair(); return null }
    if (!j.ok) { setErro(j.msg || 'Não consegui salvar.'); return null }
    setSel(j.cliente); setSalvo(true); setTimeout(() => setSalvo(false), 1800); carregar()
    return j.cliente
  }
  // Salva ANTES de abrir/enviar — garante que a página do cliente reflita as alterações
  const comSalvar = async (acao) => {
    const c = await salvar()
    if (!c || !c.id) return
    await new Promise((r) => setTimeout(r, 700)) // pequena espera p/ o banco propagar
    acao(c)
  }
  const excluir = async (id) => {
    if (!confirm('Excluir este cliente do CRM?')) return
    await api({ action: 'crm-del', token, id }); setSel(null); carregar()
  }

  const linkCliente = (c) => `${window.location.origin}/cliente/${c.id}`

  // ——— EDITOR ———
  if (sel) {
    const podePagina = sel.id && (sel.sugeridos?.length || matches.length)
    const msg = `Olá${sel.nome ? ' ' + sel.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Separei alguns imóveis pensando no que você procura. Dá uma olhada na sua seleção: ${sel.id ? linkCliente(sel) : ''}`
    return (
      <section>
        <div className="admin-barra">
          <button className="admin-btn" onClick={() => setSel(null)}>← Voltar à lista</button>
          {sel.id && <span className="painel-meta">Cliente salvo · página: /cliente/{sel.id.slice(0, 8)}…</span>}
        </div>
        <div className="admin-edit-grid">
          <div>
            <h3 className="det-rel-titulo">Dados e preferências do cliente</h3>
            <div className="admin-fields">
              <label className="admin-field"><span>WhatsApp (obrigatório)</span><input value={sel.whatsapp} onChange={(e) => setF('whatsapp', e.target.value)} placeholder="34 99999-9999" /></label>
              <label className="admin-field"><span>Nome (opcional)</span><input value={sel.nome} onChange={(e) => setF('nome', e.target.value)} /></label>
              <label className="admin-field"><span>Finalidade</span>
                <select value={sel.finalidade} onChange={(e) => setF('finalidade', e.target.value)}><option>Comprar</option><option>Alugar</option><option>Investir</option></select>
              </label>
              <label className="admin-field"><span>Preço mín.</span><InputMoeda value={sel.precoMin} onChange={(v) => setF('precoMin', v)} /></label>
              <label className="admin-field"><span>Preço máx.</span><InputMoeda value={sel.precoMax} onChange={(v) => setF('precoMax', v)} /></label>
              <label className="admin-field"><span>Quartos (mín.)</span><input type="number" value={sel.quartosMin} onChange={(e) => setF('quartosMin', e.target.value)} /></label>
              <label className="admin-field"><span>Suítes (mín.)</span><input type="number" value={sel.suitesMin} onChange={(e) => setF('suitesMin', e.target.value)} /></label>
              <label className="admin-field"><span>Vagas (mín.)</span><input type="number" value={sel.vagasMin} onChange={(e) => setF('vagasMin', e.target.value)} /></label>
              <label className="admin-field"><span>Área mín. (m²)</span><input type="number" value={sel.areaMin} onChange={(e) => setF('areaMin', e.target.value)} /></label>
            </div>

            <p className="admin-mini-label">Tipo de imóvel</p>
            <div className="crm-chips">
              {TIPOS_IMOVEL.map((t) => <button type="button" key={t} className={`crm-chip ${(sel.tipos || []).includes(t) ? 'on' : ''}`} onClick={() => toggleArr('tipos', t)}>{t}</button>)}
            </div>
            <p className="admin-mini-label">Bairros de interesse <span className="painel-meta">(todos os bairros de Uberlândia · {(sel.bairros || []).length} selecionado{(sel.bairros || []).length === 1 ? '' : 's'})</span></p>
            <div className="crm-chips crm-chips--bairros">
              {BAIRROS_TODOS.map((b) => <button type="button" key={b} className={`crm-chip ${(sel.bairros || []).includes(b) ? 'on' : ''}`} onClick={() => toggleArr('bairros', b)}>{b}</button>)}
            </div>
            <label className="admin-field admin-field--full" style={{ marginTop: 12 }}><span>Observações (o que o cliente quer, detalhes)</span><textarea rows="4" value={sel.obs} onChange={(e) => setF('obs', e.target.value)} /></label>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={salvar}>Salvar cliente</button>
              {salvo && <span className="lead-salvo">✓ salvo</span>}
              {erro && <span className="lead-erro">{erro}</span>}
            </div>
          </div>

          <div>
            <div className="admin-owner">
              <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>Imóveis sugeridos <span className="painel-meta">({(sel.sugeridos || []).length})</span></h3>
              <p className="calc-nota">Marque os imóveis que vão aparecer na página do cliente. Use <b>Sugerir automático</b> pra preencher com os que mais combinam.</p>
              <button className="admin-btn" onClick={sugerirAuto} style={{ marginBottom: 10 }}>✨ Sugerir automático ({matches.length} combinam)</button>
              <div className="crm-match-list">
                {matches.length === 0 && <p className="painel-meta">Nenhum imóvel publicado combina com esses critérios ainda. Ajuste os filtros.</p>}
                {matches.map(({ im, m }) => {
                  const cod = String(im.codigo); const on = (sel.sugeridos || []).includes(cod)
                  return (
                    <label className={`crm-match ${on ? 'on' : ''}`} key={cod}>
                      <input type="checkbox" checked={on} onChange={() => toggleSug(cod)} />
                      <img src={im.img} alt="" loading="lazy" />
                      <span className="crm-match-info"><b>{im.tipo} · {im.bairro}</b><i>{formatPreco(im.preco)} · {im.quartos}q · cód {cod}</i></span>
                    </label>
                  )
                })}
              </div>
            </div>

            {sel.id && (
              <div className="admin-owner" style={{ marginTop: 14 }}>
                <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>Página do cliente</h3>
                <p className="calc-nota">Link exclusivo (privado, não indexado). Os botões abaixo <b>salvam suas alterações automaticamente</b> antes de abrir/enviar.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="admin-btn" onClick={() => comSalvar((c) => window.open(linkCliente(c), '_blank', 'noopener'))}>Salvar e abrir página</button>
                  <button className="admin-btn" onClick={() => comSalvar((c) => { navigator.clipboard?.writeText(linkCliente(c)); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 1500) })}>{linkCopiado ? '✓ copiado' : 'Salvar e copiar link'}</button>
                  <button className="btn btn-gold" onClick={() => comSalvar((c) => window.open(waLink(c.whatsapp, `Olá${c.nome ? ' ' + c.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Separei alguns imóveis pensando no que você procura. Dá uma olhada na sua seleção: ${linkCliente(c)}`), '_blank', 'noopener'))}>Salvar e enviar no WhatsApp</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  // ——— LISTA ———
  return (
    <section>
      <div className="admin-barra">
        <button className="btn btn-gold" onClick={() => { setSel({ ...VAZIO }); setErro('') }}>+ Novo cliente</button>
        <span className="painel-meta">{clientes ? `${clientes.length} cliente(s)` : 'Carregando…'}</span>
      </div>
      {clientes && clientes.length === 0 && <p className="section-sub">Nenhum cliente cadastrado ainda. Clique em <b>+ Novo cliente</b> para começar.</p>}
      <div className="crm-lista">
        {(clientes || []).map((c) => (
          <div className="crm-card" key={c.id}>
            <div className="crm-card-top">
              <b>{c.nome || 'Sem nome'}</b>
              <span className="painel-meta">{c.whatsapp}</span>
            </div>
            <p className="crm-card-crit">{[c.finalidade, (c.tipos || []).join('/'), (c.bairros || []).slice(0, 2).join(', '), c.precoMax ? 'até ' + formatPreco(c.precoMax) : ''].filter(Boolean).join(' · ')}</p>
            <p className="painel-meta">{(c.sugeridos || []).length} imóvel(is) na página</p>
            <div className="crm-card-acoes">
              <button className="admin-btn" onClick={() => setSel({ ...VAZIO, ...c })}>Abrir / editar</button>
              <a className="admin-btn" href={`${window.location.origin}/cliente/${c.id}`} target="_blank" rel="noopener">Página</a>
              <a className="admin-btn admin-btn--ok" href={waLink(c.whatsapp, `Olá${c.nome ? ' ' + c.nome.split(' ')[0] : ''}! Aqui é o Vinícius. Separei uma seleção de imóveis pensando no que você procura: ${window.location.origin}/cliente/${c.id}`)} target="_blank" rel="noopener">WhatsApp</a>
              <button className="admin-btn admin-btn--del" onClick={() => excluir(c.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
