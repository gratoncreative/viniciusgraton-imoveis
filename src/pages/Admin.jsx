import { useState, useEffect, useCallback } from 'react'
import { useSEO } from '../useSEO'
import { CONFIG, IMOVEIS } from '../data'
import { IconShield, IconArrow } from '../components/icons'

const LSK = 'vg_admin_token'
const waLink = (fone) => `https://wa.me/55${String(fone || '').replace(/\D/g, '')}`
const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })))
const STATUS_LEAD = ['Novo', 'Em conversa', 'Visita marcada', 'Fechado', 'Descartado']

function Login({ onOk }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    setCarregando(true); setErro('')
    try {
      const { status, j } = await api({ action: 'login', email: email.trim(), senha })
      if (status === 200 && j.token) { onOk(j.token) }
      else if (j.error === 'config') setErro(j.msg || 'Login ainda não configurado (defina ADMIN_PASS na Cloudflare).')
      else setErro(j.msg || 'E-mail ou senha incorretos.')
    } catch { setErro('Falha de conexão. Tente de novo.') }
    finally { setCarregando(false) }
  }

  return (
    <main className="pagina section--light det" style={{ minHeight: '66vh' }}>
      <div className="container" style={{ maxWidth: 430 }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span className="aviseme-ico" style={{ margin: '0 auto 14px' }}><IconShield width={26} height={26} /></span>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Área restrita</span>
          <h1 className="section-title">Painel do <em>Vinícius</em></h1>
        </div>
        <form className="lead-form" onSubmit={entrar} style={{ marginTop: 18 }}>
          <label><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@viniciusgraton.com.br" autoComplete="username" autoFocus required /></label>
          <label><span>Senha</span><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required /></label>
          <button className="btn btn-gold lead-submit" type="submit" disabled={carregando}>{carregando ? 'Entrando…' : 'Entrar'} <IconArrow /></button>
          {erro && <p className="anunciar-erro">{erro}</p>}
        </form>
        <p className="calc-nota" style={{ marginTop: 18, textAlign: 'center' }}>Acesso exclusivo do corretor. Seus dados são verificados no servidor.</p>
      </div>
    </main>
  )
}

function StatCard({ rotulo, valor, sub }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-num">{valor}</span>
      <span className="admin-stat-rot">{rotulo}</span>
      {sub && <span className="admin-stat-sub">{sub}</span>}
    </div>
  )
}

function LeadCard({ lead, token, onSair, onMudou }) {
  const [status, setStatus] = useState(lead.status || 'Novo')
  const [nota, setNota] = useState(lead.nota || '')
  const [salvo, setSalvo] = useState(false)
  const [editandoNota, setEditandoNota] = useState(false)

  const patch = async (campos) => {
    const { status: st } = await api({ action: 'patch', token, key: lead._key, patch: campos })
    if (st === 401) return onSair()
    setSalvo(true); setTimeout(() => setSalvo(false), 1400)
    onMudou && onMudou()
  }
  const mudarStatus = (s) => { setStatus(s); patch({ status: s }) }
  const salvarNota = () => { patch({ nota }); setEditandoNota(false) }
  const excluir = async () => {
    if (!window.confirm(`Excluir o lead de ${lead.nome}?`)) return
    const { status: st } = await api({ action: 'del', token, key: lead._key })
    if (st === 401) return onSair()
    onMudou && onMudou()
  }
  const cor = status === 'Fechado' ? 'ok' : status === 'Descartado' ? 'off' : status === 'Novo' ? 'novo' : 'andamento'

  return (
    <div className="painel-card">
      <b>{lead.nome} <span className={`lead-badge lead-badge--${cor}`}>{status}</span></b>
      <span><a href={waLink(lead.fone)} target="_blank" rel="noopener">{lead.fone}</a></span>
      <span className="painel-meta">{lead.bairro || lead.cod} · {lead.data ? new Date(lead.data).toLocaleDateString('pt-BR') : ''}</span>
      <div className="lead-status">
        {STATUS_LEAD.map((s) => (
          <button key={s} className={`lead-status-b ${status === s ? 'on' : ''}`} onClick={() => mudarStatus(s)}>{s}</button>
        ))}
      </div>
      {editandoNota ? (
        <div className="lead-nota-edit">
          <textarea rows="2" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Anotações sobre este lead..." />
          <button className="admin-btn admin-btn--ok admin-btn--mini" onClick={salvarNota}>Salvar nota</button>
        </div>
      ) : (
        <p className="lead-nota" onClick={() => setEditandoNota(true)}>{nota ? `📝 ${nota}` : '+ adicionar anotação'}</p>
      )}
      <div className="lead-acoes">
        {salvo && <span className="lead-salvo">✓ salvo</span>}
        <button className="admin-btn admin-btn--del admin-btn--mini" onClick={excluir}>Excluir</button>
      </div>
    </div>
  )
}

export default function Admin() {
  useSEO({ title: 'Painel administrativo', description: 'Área restrita do Vinícius Graton.', path: '/admin' })
  const [token, setToken] = useState(() => { try { return localStorage.getItem(LSK) || '' } catch { return '' } })
  const [dados, setDados] = useState(null)
  const [blogViews, setBlogViews] = useState(null)
  const [aba, setAba] = useState('geral')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const salvarToken = (t) => { try { localStorage.setItem(LSK, t) } catch {}; setToken(t) }
  const sair = useCallback(() => { try { localStorage.removeItem(LSK) } catch {}; setToken(''); setDados(null) }, [])

  const carregar = useCallback(async () => {
    if (!token) return
    setCarregando(true); setErro('')
    try {
      const { status, j } = await api({ action: 'data', token })
      if (status === 401) { sair(); return }
      if (j.error) { setErro(j.msg || 'Não consegui carregar os dados.'); setDados({ anuncios: [], leads: [], clientes: [] }) }
      else setDados(j)
    } catch { setErro('Falha de conexão.') }
    finally { setCarregando(false) }
    fetch('/api/eng?blogviews=1').then((r) => r.json()).then((d) => setBlogViews(d.views || {})).catch(() => {})
  }, [token, sair])

  useEffect(() => { carregar() }, [carregar])

  const excluir = async (key, label) => {
    if (!window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return
    const { status } = await api({ action: 'del', token, key })
    if (status === 401) return sair()
    carregar()
  }
  const aprovar = async (key, aprovado) => {
    const { status } = await api({ action: 'aprovar', token, key, aprovado })
    if (status === 401) return sair()
    carregar()
  }

  if (!token) return <Login onOk={salvarToken} />

  const anuncios = dados?.anuncios || []
  const leads = dados?.leads || []
  const clientes = dados?.clientes || []
  const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000
  const leadsNovos = leads.filter((l) => (l.ts || 0) > seteDias).length
  const pendentes = anuncios.filter((a) => !a.aprovado).length
  const totalViews = blogViews ? Object.values(blogViews).reduce((s, n) => s + (n || 0), 0) : 0

  const exportarCSV = () => {
    const linhas = [['Nome', 'Telefone', 'Origem', 'Status', 'Anotação', 'Data']]
    leads.forEach((l) => linhas.push([l.nome, l.fone, l.bairro || l.cod || '', l.status || 'Novo', (l.nota || '').replace(/[\r\n]+/g, ' '), l.data ? new Date(l.data).toLocaleString('pt-BR') : '']))
    const csv = linhas.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'leads-vinicius-graton.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const ABAS = [
    ['geral', 'Visão geral'],
    ['moderacao', `Imóveis enviados (${anuncios.length})`],
    ['leads', `Leads (${leads.length})`],
    ['clientes', `Cadastros (${clientes.length})`],
    ['imoveis', 'Imóveis publicados'],
  ]

  return (
    <main className="pagina section--light det painel-pg admin-pg">
      <div className="container">
        <div className="conta-hero">
          <div><span className="eyebrow">Painel administrativo</span><h1 className="section-title">Central do <em>Vinícius</em></h1></div>
          <div className="conta-hero-acoes">
            <button className="btn btn-ghost" onClick={carregar} disabled={carregando}>{carregando ? 'Atualizando…' : 'Atualizar'}</button>
            <button className="btn btn-ghost" onClick={sair}>Sair</button>
          </div>
        </div>

        <div className="admin-abas">
          {ABAS.map(([k, label]) => (
            <button key={k} className={`admin-aba ${aba === k ? 'on' : ''}`} onClick={() => setAba(k)}>{label}</button>
          ))}
        </div>

        {erro && <p className="anunciar-erro">{erro}</p>}
        {carregando && !dados && <p className="section-sub">Carregando…</p>}

        {aba === 'geral' && (
          <section>
            <div className="admin-stats">
              <StatCard rotulo="Imóveis a avaliar" valor={pendentes} sub={`${anuncios.length} no total`} />
              <StatCard rotulo="Leads (7 dias)" valor={leadsNovos} sub={`${leads.length} no total`} />
              <StatCard rotulo="Cadastros de clientes" valor={clientes.length} sub="área do cliente" />
              <StatCard rotulo="Imóveis publicados" valor={IMOVEIS.length} sub="em destaque no site" />
              <StatCard rotulo="Leituras no blog" valor={totalViews} sub={blogViews ? `${Object.keys(blogViews).length} posts` : '—'} />
            </div>
            <div className="det-trust" style={{ marginTop: 18 }}>
              <IconShield width={20} height={20} />
              <p><b>Visão geral do seu negócio.</b> Aqui ficam os números em tempo real. Use as abas acima para gerenciar os imóveis enviados pelos proprietários, seus leads (com status e anotações) e os cadastros da área do cliente.</p>
            </div>
          </section>
        )}

        {aba === 'moderacao' && (
          <section>
            {anuncios.length === 0 && <p className="section-sub">Nenhum imóvel enviado pelos proprietários ainda. Os envios do formulário <b>/anunciar</b> aparecem aqui com as fotos.</p>}
            {anuncios.map((a) => (
              <div className={`admin-card ${a.aprovado ? 'admin-card--ok' : ''}`} key={a._key}>
                <div className="admin-card-top">
                  <div>
                    <b>{a.nome} {a.aprovado && <span className="admin-tag-ok">aprovado</span>}</b>
                    <span className="painel-meta">{a.data ? new Date(a.data).toLocaleString('pt-BR') : ''} · {a.finalidade} · {a.tipo} · {a.bairro || 'sem bairro'}</span>
                    <span className="painel-meta"><a href={waLink(a.fone)} target="_blank" rel="noopener">{a.fone}</a>{a.email ? ` · ${a.email}` : ''}</span>
                  </div>
                  <div className="admin-card-acoes">
                    <button className="admin-btn admin-btn--ok" onClick={() => aprovar(a._key, !a.aprovado)}>{a.aprovado ? 'Desaprovar' : 'Aprovar'}</button>
                    <button className="admin-btn admin-btn--del" onClick={() => excluir(a._key, `o imóvel de ${a.nome}`)}>Excluir</button>
                  </div>
                </div>
                <p className="admin-card-specs">
                  <b>{a.preco || 'valor a combinar'}</b>
                  {a.quartos ? ` · ${a.quartos} quartos` : ''}{a.suites ? ` · ${a.suites} suítes` : ''}{a.vagas ? ` · ${a.vagas} vagas` : ''}{a.area ? ` · ${a.area} m²` : ''}{a.condominio ? ` · cond. ${a.condominio}` : ''}{a.iptu ? ` · IPTU ${a.iptu}` : ''}
                </p>
                {a.endereco && <p className="admin-card-end">📍 {a.endereco}</p>}
                {a.descricao && <p className="admin-card-desc">{a.descricao}</p>}
                {(a.fotos || []).length > 0 && (
                  <div className="admin-fotos">
                    {a.fotos.map((src, i) => (
                      <a className="admin-foto" key={i} href={src} download={`imovel-${a.nome}-${i + 1}.jpg`} target="_blank" rel="noopener">
                        <img src={src} loading="lazy" alt={`Foto ${i + 1}`} />
                      </a>
                    ))}
                  </div>
                )}
                <p className="calc-nota">{(a.fotos || []).length} foto(s) — clique para abrir/baixar em alta.</p>
              </div>
            ))}
          </section>
        )}

        {aba === 'leads' && (
          <section>
            <div className="admin-barra">
              <span className="painel-meta">{leads.length} lead(s) · {leadsNovos} nos últimos 7 dias</span>
              {leads.length > 0 && <button className="admin-btn" onClick={exportarCSV}>⬇ Exportar CSV</button>}
            </div>
            {leads.length === 0 && <p className="section-sub">Nenhum lead ainda. Pedidos de “avise-me”, condomínios e avaliação aparecem aqui.</p>}
            <div className="painel-lista">
              {leads.map((l) => <LeadCard key={l._key || l.ts} lead={l} token={token} onSair={sair} onMudou={carregar} />)}
            </div>
          </section>
        )}

        {aba === 'clientes' && (
          <section className="painel-lista">
            {clientes.length === 0 && <p className="section-sub">Nenhum cadastro na área do cliente ainda.</p>}
            {clientes.map((c) => (
              <div className="painel-card" key={c._key || c.token}>
                <b>{c.nome || 'Sem nome'}</b>
                <span>{c.email} · <a href={waLink(c.fone)} target="_blank" rel="noopener">{c.fone}</a></span>
                <span className="painel-meta">{c.objetivo} · {c.bairros || 'sem bairro'} · {c.faixa || 'faixa livre'}{c.idade ? ` · ${c.idade} anos` : ''}{c.sexo ? ` · ${c.sexo}` : ''}</span>
                <span className="painel-meta">favoritos: {(c.favoritos || []).length} · visitados: {(c.historico || []).length} · {new Date(c.atualizadoEm || 0).toLocaleDateString('pt-BR')}</span>
                <button className="admin-btn admin-btn--del admin-btn--mini" onClick={() => excluir(c._key, `o cadastro de ${c.nome || 'cliente'}`)}>Excluir</button>
              </div>
            ))}
          </section>
        )}

        {aba === 'imoveis' && (
          <section>
            <div className="det-trust" style={{ marginBottom: 16 }}>
              <IconShield width={20} height={20} />
              <p><b>Gestão de imóveis ao vivo — em construção (próxima onda).</b> Em breve você poderá <b>adicionar, editar, despublicar e subir fotos</b> de imóveis aqui no painel, sem depender de mim. Por ora, o site mostra {IMOVEIS.length} imóveis em destaque da sua carteira.</p>
            </div>
            <p className="section-sub">Para inserir um imóvel agora, me mande os dados + fotos (ou use o formulário <b>/anunciar</b>) que eu publico.</p>
          </section>
        )}

        <p className="calc-nota" style={{ marginTop: 22 }}>Painel seguro · sessão de 12h · WhatsApp do site: {CONFIG.telefone || ''}.</p>
      </div>
    </main>
  )
}
