import { useState, useEffect, useCallback } from 'react'
import { useSEO } from '../useSEO'
import { CONFIG } from '../data'
import { IconShield, IconArrow } from '../components/icons'

const LSK = 'vg_admin_token'
const waLink = (fone) => `https://wa.me/55${String(fone || '').replace(/\D/g, '')}`
const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })))

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

export default function Admin() {
  useSEO({ title: 'Painel administrativo', description: 'Área restrita do Vinícius Graton.', path: '/admin' })
  const [token, setToken] = useState(() => { try { return localStorage.getItem(LSK) || '' } catch { return '' } })
  const [dados, setDados] = useState(null)
  const [aba, setAba] = useState('moderacao')
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
  const ABAS = [
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
          <section className="painel-lista">
            {leads.length === 0 && <p className="section-sub">Nenhum lead ainda.</p>}
            {leads.map((l) => (
              <div className="painel-card" key={l._key || l.ts}>
                <b>{l.nome}</b>
                <span><a href={waLink(l.fone)} target="_blank" rel="noopener">{l.fone}</a></span>
                <span className="painel-meta">{l.bairro || l.cod} · {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : ''}</span>
                <button className="admin-btn admin-btn--del admin-btn--mini" onClick={() => excluir(l._key, `o lead de ${l.nome}`)}>Excluir</button>
              </div>
            ))}
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
              <p><b>Gestão dos imóveis publicados — próxima etapa.</b> Hoje os imóveis em destaque do site vêm da sua carteira (coleta automática do Imoview + curadoria). O próximo passo é permitir <b>adicionar, editar e despublicar imóveis aqui no painel</b>, ao vivo. Me dê o sinal verde que eu construo essa parte.</p>
            </div>
            <p className="section-sub">Por enquanto, para inserir um imóvel novo manualmente, me mande os dados + fotos (ou use o formulário <b>/anunciar</b>) que eu publico. Em breve isso fica self-service aqui.</p>
          </section>
        )}

        <p className="calc-nota" style={{ marginTop: 22 }}>Painel seguro · sessão de 12h · WhatsApp do site: {CONFIG.telefone || ''}.</p>
      </div>
    </main>
  )
}
