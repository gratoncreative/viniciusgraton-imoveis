import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useSEO } from '../useSEO'
import { CONFIG, IMOVEIS, IMOVEIS_PENDENTES, formatPreco, CONSTRUTORAS } from '../data'
import { IconShield, IconArrow, IconWhats } from '../components/icons'
import AdminCRM from '../components/AdminCRM'
import InputMoeda from '../components/InputMoeda'

const RemoverMarca = lazy(() => import('../components/RemoverMarca'))
const MelhorarFotos = lazy(() => import('../components/MelhorarFotos'))
const PostGen = lazy(() => import('../components/PostGen'))

const LSK = 'vg_admin_token'
const waLink = (fone) => { const d = String(fone || '').replace(/\D/g, ''); const full = d.length <= 11 ? '55' + d : d; return `https://wa.me/${full}` }
const api = (payload) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json().then((j) => ({ status: r.status, j })))
const STATUS_LEAD = ['Novo', 'Em conversa', 'Visita marcada', 'Fechado', 'Descartado']
// célula CSV segura: neutraliza injeção de fórmula (= + - @ tab CR no início) e aspas
const csvCel = (c) => { let s = String(c == null ? '' : c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }

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

function StatCard({ rotulo, valor, sub, onClick }) {
  return (
    <div className={`admin-stat${onClick ? ' admin-stat--clk' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}>
      <span className="admin-stat-num">{valor}</span>
      <span className="admin-stat-rot">{rotulo}</span>
      {sub && <span className="admin-stat-sub">{sub}</span>}
      {onClick && <span className="admin-stat-go">abrir →</span>}
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
      <span>{lead.fone ? <a href={waLink(lead.fone)} target="_blank" rel="noopener">{lead.fone}</a> : <i style={{ color: 'var(--text-mute)' }}>sem telefone</i>}</span>
      <span className="painel-meta">{[lead.objetivo, lead.bairro || lead.cod, lead.origem, lead.data ? new Date(lead.data).toLocaleDateString('pt-BR') : ''].filter(Boolean).join(' · ')}</span>
      {lead.detalhes && <p className="painel-meta" style={{ marginTop: 4 }}>💬 {lead.detalhes}</p>}
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

function ImoveisPub({ token, onSair, alvo, onAbriu }) {
  const [sel, setSel] = useState(null)
  const [reg, setReg] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const [busca, setBusca] = useState('')
  const [tipoF, setTipoF] = useState('')
  const [faixaF, setFaixaF] = useState('')
  const base = sel ? IMOVEIS.find((i) => String(i.codigo) === String(sel)) : null

  const abrir = async (cod) => {
    setSel(cod); setReg(null); setCarregando(true); setSalvo(false)
    const b = IMOVEIS.find((i) => String(i.codigo) === String(cod)) || {}
    const { status, j } = await api({ action: 'imovel-get', token, codigo: String(cod) })
    if (status === 401) return onSair()
    const kv = j.registro || {}
    setReg({
      owner: { nome: '', email: '', fone: '', ...(kv.owner || {}) },
      campos: { preco: b.preco || 0, tipo: b.tipo || '', bairro: b.bairro || '', quartos: b.quartos || 0, suites: b.suites || 0, banheiros: b.banheiros || 0, vagas: b.vagas || 0, area: b.area || 0, descricao: b.descricao || '', fotos: b.fotos || [], destaque: false, oculto: false, ...(kv.campos || {}) },
    })
    setCarregando(false)
  }
  // veio de "Proprietário / editar" num imóvel: abre direto o editor dele
  useEffect(() => {
    if (!alvo) return
    abrir(String(alvo)); onAbriu && onAbriu()
    setTimeout(() => { try { document.querySelector('.admin-owner')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {} }, 450)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo])
  const setC = (k, v) => setReg((r) => ({ ...r, campos: { ...r.campos, [k]: v } }))
  const setO = (k, v) => setReg((r) => ({ ...r, owner: { ...r.owner, [k]: v } }))
  const moverFoto = (i, dir) => setReg((r) => { const a = [...(r.campos.fotos || [])]; const j = i + dir; if (j < 0 || j >= a.length) return r; [a[i], a[j]] = [a[j], a[i]]; return { ...r, campos: { ...r.campos, fotos: a } } })
  const removerFoto = (i) => setReg((r) => ({ ...r, campos: { ...r.campos, fotos: (r.campos.fotos || []).filter((_, n) => n !== i) } }))
  const capaFoto = (i) => setReg((r) => { const a = [...(r.campos.fotos || [])]; const [x] = a.splice(i, 1); a.unshift(x); return { ...r, campos: { ...r.campos, fotos: a } } })
  // Redimensiona a imagem no próprio navegador (máx. 1280px, JPEG) antes de enviar — leve e rápido
  const redimensionar = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('leitura'))
    fr.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('imagem'))
      img.onload = () => {
        const max = 1280
        let w = img.naturalWidth, h = img.naturalHeight
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r) }
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  })
  const enviarFotos = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setErroFoto(''); setEnviandoFotos(true)
    for (const file of files) {
      try {
        if (!/^image\//.test(file.type)) continue
        const dataUrl = await redimensionar(file)
        const { status, j } = await api({ action: 'img-upload', token, codigo: String(sel), dataUrl })
        if (status === 401) { setEnviandoFotos(false); return onSair() }
        if (j && j.url) setReg((r) => ({ ...r, campos: { ...r.campos, fotos: [...(r.campos.fotos || []), j.url] } }))
        else setErroFoto((j && j.msg) || 'Não consegui enviar uma das fotos.')
      } catch { setErroFoto('Não consegui processar uma das imagens.') }
    }
    setEnviandoFotos(false)
  }
  // —— Download das fotos com e sem marca d'água ——
  const carregarImagem = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load'))
    img.src = src
  })
  // Aplica a marca d'água da Rotina (selo no canto + repetição diagonal sutil)
  const desenharMarca = (ctx, w, h) => {
    const txt = 'VINÍCIUS GRATON'
    ctx.save()
    ctx.globalAlpha = 0.14
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    const fs = Math.max(16, Math.round(w / 22))
    ctx.font = `700 ${fs}px Georgia, "Times New Roman", serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.translate(w / 2, h / 2); ctx.rotate(-Math.atan2(h, w))
    const step = fs * 6
    for (let y = -h; y < h; y += step) {
      for (let x = -w; x < w; x += step * 1.5) {
        ctx.lineWidth = Math.max(1, fs / 16)
        ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y)
      }
    }
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = 0.92
    const fs2 = Math.max(13, Math.round(w / 32))
    ctx.font = `700 ${fs2}px Georgia, "Times New Roman", serif`
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = fs2 / 2
    ctx.fillText('Vinícius Graton', w - fs2, h - fs2)
    ctx.restore()
  }
  const baixarBlob = (blob, nome) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = nome
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
  const baixarFoto = async (src, comMarca, idx) => {
    setErroFoto('')
    try {
      const img = await carregarImagem(src)
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
      if (comMarca) desenharMarca(ctx, c.width, c.height)
      c.toBlob((blob) => {
        if (blob) baixarBlob(blob, `${sel}-foto-${idx + 1}${comMarca ? '-com-marca' : '-sem-marca'}.jpg`)
        else setErroFoto('Não consegui gerar o arquivo dessa foto.')
      }, 'image/jpeg', 0.92)
    } catch {
      setErroFoto('Essa foto vem de outro site e o navegador bloqueia editá-la aqui (abri o original numa aba pra você salvar). Pra ter as duas versões com/sem marca, envie a foto limpa em "+ Adicionar fotos".')
      window.open(src, '_blank', 'noopener')
    }
  }
  const salvar = async () => {
    const { status } = await api({ action: 'imovel-save', token, codigo: String(sel), owner: reg.owner, campos: reg.campos })
    if (status === 401) return onSair()
    setSalvo(true); setTimeout(() => setSalvo(false), 1800)
  }
  const moeda = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const [pubMsg, setPubMsg] = useState('')
  const [publicando, setPublicando] = useState(false)
  const publicar = async () => {
    const fotos = (reg.campos.fotos || []).filter(Boolean)
    if (!fotos.length) { setPubMsg('⚠ Esse imóvel não tem fotos para publicar.'); return }
    const c = reg.campos
    const linkImovel = `https://viniciusgraton.com.br/imovel/${sel}`
    const tagBairro = String(c.bairro || base?.bairro || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
    const legenda = `${c.tipo || base?.tipo || 'Imóvel'} à venda no ${c.bairro || base?.bairro || 'Uberlândia'}, Uberlândia/MG\n`
      + [c.quartos && `${c.quartos} quartos`, c.suites && `${c.suites} suíte(s)`, c.vagas && `${c.vagas} vagas`, c.area && `${c.area} m²`].filter(Boolean).join(' · ') + '\n'
      + (c.preco ? `${moeda(c.preco)}\n` : '')
      + `\nFale comigo e agende uma visita 👉 ${linkImovel}\n\n#imoveis #uberlandia #imovelavenda${tagBairro ? ' #' + tagBairro : ''} #rotinaimobiliaria #viniciusgraton #consultordeimoveis`
    if (!window.confirm('Publicar este imóvel no Instagram (carrossel) e na Página do Facebook?')) return
    setPublicando(true); setPubMsg('')
    const { status, j } = await api({ action: 'publicar-social', token, codigo: String(sel), fotos, legenda, redes: { ig: true, fb: true } })
    setPublicando(false)
    if (status === 401) return onSair()
    if (j.error === 'config') { setPubMsg('⚠ Configure META_TOKEN + IG_USER_ID + FB_PAGE_ID nas variáveis do Cloudflare.'); return }
    if (j.error === 'fotos') { setPubMsg('⚠ Sem fotos válidas.'); return }
    const r = j.resultados || {}
    const ok = []; const erros = []
    if (r.instagram) { r.instagram.ok ? ok.push('Instagram') : erros.push('Instagram: ' + r.instagram.erro) }
    if (r.facebook) { r.facebook.ok ? ok.push('Facebook') : erros.push('Facebook: ' + r.facebook.erro) }
    setPubMsg((ok.length ? '✓ Publicado em ' + ok.join(' e ') + '. ' : '') + (erros.length ? '⚠ ' + erros.join(' | ') : ''))
  }

  if (sel && reg) {
    const owFone = String(reg.owner.fone || '').replace(/\D/g, '')
    const owNome1 = (reg.owner.nome || '').trim().split(/\s+/)[0]
    const linkImovel = `${typeof window !== 'undefined' ? window.location.origin : 'https://viniciusgraton.com.br'}/imovel/${sel}`
    const msgProp = `Olá${owNome1 ? ' ' + owNome1 : ''}! Aqui é o Vinícius Graton, corretor da Rotina Imobiliária. Estou com um cliente com forte interesse de compra no seu ${base?.tipo || 'imóvel'}${base?.bairro ? ' no ' + base.bairro : ''} (cód. ${sel}). Pra você ver qual é, segue o anúncio: ${linkImovel} — gostaria de agendar uma visita. Você pode me dizer onde ficam as chaves: estão com você, com alguém, ou o imóvel está ocupado/vago no momento? É um cliente com real potencial de compra; fico no aguardo pra combinarmos o melhor horário. Obrigado!`
    const linkProp = owFone ? `https://wa.me/55${owFone}?text=${encodeURIComponent(msgProp)}` : ''
    return (
      <section>
        <div className="admin-barra">
          <button className="admin-btn" onClick={() => { setSel(null); setReg(null) }}>← Voltar à lista</button>
          <span className="painel-meta">Editando cód. {sel} · {base?.tipo} · {base?.bairro}</span>
        </div>
        <div className="admin-edit-grid">
          <div>
            <h3 className="det-rel-titulo">Dados do imóvel <span className="painel-meta">(aparecem no site)</span></h3>
            <div className="admin-fields">
              <label className="admin-field"><span>Tipo</span><input value={reg.campos.tipo} onChange={(e) => setC('tipo', e.target.value)} /></label>
              <label className="admin-field"><span>Bairro</span><input value={reg.campos.bairro} onChange={(e) => setC('bairro', e.target.value)} /></label>
              <label className="admin-field"><span>Preço</span><InputMoeda value={reg.campos.preco} onChange={(v) => setC('preco', v)} /></label>
              <label className="admin-field"><span>Preço anterior <i style={{ fontWeight: 400, color: '#9a8e78' }}>(opcional — só se baixou de verdade)</i></span><InputMoeda value={reg.campos.precoAnterior} onChange={(v) => setC('precoAnterior', v)} /></label>
              <label className="admin-field"><span>Área (m²)</span><input type="number" value={reg.campos.area} onChange={(e) => setC('area', e.target.value)} /></label>
              <label className="admin-field"><span>Quartos</span><input type="number" value={reg.campos.quartos} onChange={(e) => setC('quartos', e.target.value)} /></label>
              <label className="admin-field"><span>Suítes</span><input type="number" value={reg.campos.suites} onChange={(e) => setC('suites', e.target.value)} /></label>
              <label className="admin-field"><span>Banheiros</span><input type="number" value={reg.campos.banheiros} onChange={(e) => setC('banheiros', e.target.value)} /></label>
              <label className="admin-field"><span>Vagas</span><input type="number" value={reg.campos.vagas} onChange={(e) => setC('vagas', e.target.value)} /></label>
              <label className="admin-field"><span>Andar (apto · 0 = térreo)</span><input type="number" value={reg.campos.andar ?? ''} onChange={(e) => setC('andar', e.target.value)} placeholder="ex.: 3" /></label>
              <label className="admin-field"><span>Elevador (apto)</span>
                <select value={reg.campos.elevador === true ? 'sim' : reg.campos.elevador === false ? 'nao' : ''} onChange={(e) => setC('elevador', e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : '')}>
                  <option value="">— não informado</option>
                  <option value="sim">Com elevador</option>
                  <option value="nao">Sem elevador</option>
                </select>
              </label>
              <label className="admin-field admin-field--full"><span>Descrição</span><textarea rows="5" value={reg.campos.descricao} onChange={(e) => setC('descricao', e.target.value)} /></label>
            </div>
            <label className="calc-check"><input type="checkbox" checked={!!reg.campos.destaque} onChange={(e) => setC('destaque', e.target.checked)} /><span>Destacar este imóvel na home</span></label>
            <label className="calc-check"><input type="checkbox" checked={!!reg.campos.oculto} onChange={(e) => setC('oculto', e.target.checked)} /><span>Ocultar do site (despublicar)</span></label>
            <div className="admin-fotos-edit">
              <h3 className="det-rel-titulo">Fotos publicadas <span className="painel-meta">({(reg.campos.fotos || []).length}) — a 1ª é a capa</span></h3>
              {(reg.campos.fotos || []).length === 0 && <p className="painel-meta">Este imóvel ainda não tem fotos.</p>}
              <div className="admin-fotos-grid">
                {(reg.campos.fotos || []).map((src, i) => (
                  <div className="admin-foto-item" key={src + i}>
                    <img src={src} loading="lazy" alt={`Foto ${i + 1}`} />
                    {i === 0 && <span className="admin-foto-capa">capa</span>}
                    <div className="admin-foto-baixar">
                      <button type="button" title="Baixar COM marca d'água" onClick={() => baixarFoto(src, true, i)}>⤓ c/ marca</button>
                      <button type="button" title="Baixar SEM marca d'água (foto limpa)" onClick={() => baixarFoto(src, false, i)}>⤓ limpa</button>
                    </div>
                    <div className="admin-foto-acoes">
                      <button type="button" title="Mover para esquerda" onClick={() => moverFoto(i, -1)} disabled={i === 0}>←</button>
                      <button type="button" title="Mover para direita" onClick={() => moverFoto(i, 1)} disabled={i === (reg.campos.fotos.length - 1)}>→</button>
                      {i !== 0 && <button type="button" title="Tornar capa" onClick={() => capaFoto(i)}>★</button>}
                      <button type="button" className="admin-foto-del" title="Excluir foto" onClick={() => removerFoto(i)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-foto-upload">
                <label className="admin-btn admin-btn--upload">
                  {enviandoFotos ? 'Enviando…' : '+ Adicionar fotos'}
                  <input type="file" accept="image/*" multiple hidden disabled={enviandoFotos} onChange={enviarFotos} />
                </label>
                {erroFoto && <span className="lead-erro">{erroFoto}</span>}
              </div>
              <p className="calc-nota">Adicione novas fotos (são reduzidas automaticamente). Excluir, reordenar, definir capa e as fotos novas só valem depois de clicar em <b>Salvar</b> — aí refletem no site.</p>
              <p className="calc-nota"><b>Marca d'água:</b> em cada foto há <b>⤓ c/ marca</b> e <b>⤓ limpa</b>. A marca é aplicada na hora do download, então a versão "limpa" sai sem marca — desde que a foto tenha sido <b>enviada limpa</b> aqui. Fotos que já vieram marcadas de origem (ex.: Imoview) têm a marca "queimada" na imagem e não dá pra remover por software; nesse caso, envie a foto original limpa em "+ Adicionar fotos" e use os dois botões.</p>
            </div>
          </div>
          <div>
            <div className="admin-owner">
              <h3 className="det-rel-titulo" style={{ marginTop: 0 }}>🔒 Proprietário <span className="admin-owner-tag">confidencial · só você vê</span></h3>
              <label className="admin-field"><span>Nome</span><input value={reg.owner.nome} onChange={(e) => setO('nome', e.target.value)} /></label>
              <label className="admin-field"><span>E-mail</span><input value={reg.owner.email} onChange={(e) => setO('email', e.target.value)} /></label>
              <label className="admin-field"><span>Telefone</span><input value={reg.owner.fone} onChange={(e) => setO('fone', e.target.value)} /></label>
              <p className="calc-nota">Guardado só no seu painel (servidor, com login). Nunca aparece no site, nem no código, nem para o cliente.</p>
              <div className="admin-owner-acoes">
                {linkProp
                  ? <a className="btn btn-gold" href={linkProp} target="_blank" rel="noopener"><IconWhats width={17} height={17} /> Chamar o proprietário</a>
                  : <span className="painel-meta">Preencha o telefone acima pra liberar o WhatsApp.</span>}
                <a className="admin-btn" href={`/imovel/${sel}`} target="_blank" rel="noopener">Ver perfil público do imóvel <IconArrow width={14} height={14} /></a>
              </div>
              <p className="calc-nota">A mensagem já vai pronta: me apresento como corretor da Rotina, digo que tenho cliente com interesse de compra e pergunto sobre as chaves (com quem estão, se está ocupado/vago) pra agendar a visita.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-gold" onClick={salvar}>Salvar alterações</button>
              {salvo && <span className="lead-salvo">✓ salvo</span>}
              <button className="btn btn-ghost" onClick={publicar} disabled={publicando}>{publicando ? 'Publicando…' : '📣 Publicar nas redes (Insta + Face)'}</button>
            </div>
            {pubMsg && <p className="painel-meta" style={{ marginTop: 8 }}>{pubMsg}</p>}
          </div>
        </div>
      </section>
    )
  }

  const q = busca.trim().toLowerCase()
  const tipos = [...new Set(IMOVEIS.map((i) => i.tipo).filter(Boolean))].sort()
  const naFaixa = (p) => {
    p = p || 0
    if (faixaF === 'a') return p < 300000
    if (faixaF === 'b') return p >= 300000 && p < 500000
    if (faixaF === 'c') return p >= 500000 && p < 1000000
    if (faixaF === 'd') return p >= 1000000
    return true
  }
  const lista = IMOVEIS.filter((i) => {
    if (tipoF && i.tipo !== tipoF) return false
    if (faixaF && !naFaixa(i.preco)) return false
    if (q && ![i.codigo, i.bairro, i.tipo, i.endereco, i.edificio].some((c) => String(c || '').toLowerCase().includes(q))) return false
    return true
  })

  return (
    <section>
      {carregando && <p className="section-sub">Carregando…</p>}
      <p className="section-sub" style={{ marginBottom: 12 }}>Clique num imóvel para <b>editar os dados</b> e cadastrar o <b>proprietário</b> (confidencial). {IMOVEIS.length} imóveis publicados.</p>
      <div className="admin-busca">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔎 Buscar por código, bairro, tipo, endereço…" />
        <select value={faixaF} onChange={(e) => setFaixaF(e.target.value)}>
          <option value="">Qualquer preço</option>
          <option value="a">Até R$ 300 mil</option>
          <option value="b">R$ 300–500 mil</option>
          <option value="c">R$ 500 mil – 1 mi</option>
          <option value="d">Acima de R$ 1 mi</option>
        </select>
        {(busca || tipoF || faixaF) && <button className="admin-btn" onClick={() => { setBusca(''); setTipoF(''); setFaixaF('') }}>limpar</button>}
        <span className="painel-meta">{lista.length} {lista.length === 1 ? 'imóvel' : 'imóveis'}</span>
      </div>
      <div className="crm-chips" style={{ marginBottom: 14 }}>
        <button type="button" className={`crm-chip ${!tipoF ? 'on' : ''}`} onClick={() => setTipoF('')}>Todos</button>
        {tipos.map((t) => <button type="button" key={t} className={`crm-chip ${tipoF === t ? 'on' : ''}`} onClick={() => setTipoF(t)}>{t}</button>)}
      </div>
      <div className="admin-imoveis-grid">
        {lista.map((i) => (
          <button className="admin-im-card" key={i.codigo} onClick={() => abrir(i.codigo)} title={`Editar ${i.tipo} · ${i.bairro} · cód ${i.codigo}`}>
            <div className="admin-im-foto">
              <img src={i.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </div>
            <div className="admin-im-info">
              <b className="admin-im-bairro">{i.bairro}</b>
              <span className="painel-meta">{i.tipo} · {i.quartos || 0}q{i.suites ? ` · ${i.suites} st` : ''} · {i.area || 0} m² · cód {i.codigo}</span>
              <span className="admin-im-preco">{formatPreco(i.preco)}</span>
            </div>
          </button>
        ))}
        {lista.length === 0 && <p className="painel-meta">Nenhum imóvel encontrado para "{busca}".</p>}
      </div>
    </section>
  )
}

export default function Admin() {
  useSEO({ title: 'Painel administrativo', description: 'Área restrita do Vinícius Graton.', path: '/admin', noindex: true })

  // Admin é sempre escuro — força dark independente da preferência do visitante
  useEffect(() => {
    const html = document.documentElement
    const prev = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'dark')
    return () => {
      const pref = (() => { try { return localStorage.getItem('vg-tema') } catch { return null } })()
      html.setAttribute('data-theme', pref === 'claro' ? 'light' : 'dark')
    }
  }, [])

  const [token, setToken] = useState(() => { try { return localStorage.getItem(LSK) || '' } catch { return '' } })
  const [dados, setDados] = useState(null)
  const [blogViews, setBlogViews] = useState(null)
  const [aba, setAba] = useState('geral')
  const [subImovel, setSubImovel] = useState('avaliar') // sub-aba do hub de Imóveis
  const [imovelAlvo, setImovelAlvo] = useState(null) // abre direto o editor/proprietário deste código
  const [erro, setErro] = useState('')
  const [aprovadosLocais, setAprovadosLocais] = useState([]) // esconde na hora (KV tem atraso de leitura)
  const [carregando, setCarregando] = useState(false)
  const [espelhoTotal, setEspelhoTotal] = useState(null) // total do espelho da Rotina (catalogo-meta.json)
  const [catalogoMeta, setCatalogoMeta] = useState(null)  // { geradoEm, total }
  const [novidades, setNovidades] = useState(null)
  useEffect(() => {
    fetch('/catalogo-meta.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.total === 'number') { setEspelhoTotal(d.total); setCatalogoMeta(d) } }).catch(() => {})
    fetch('/novidades.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setNovidades(d) }).catch(() => {})
  }, [])

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
  const aprovados = dados?.aprovados || []
  const importadosPendentes = IMOVEIS_PENDENTES.filter((im) => !aprovados.includes(String(im.codigo)) && !aprovadosLocais.includes(String(im.codigo)))
  const aAvaliar = importadosPendentes.length + pendentes
  const totalViews = blogViews ? Object.values(blogViews).reduce((s, n) => s + (n || 0), 0) : 0
  const crmTotal = dados?.crmTotal || 0
  const crmNovos = dados?.crmNovos || 0
  const crmNovidades = dados?.crmNovidades || 0

  // backup: baixa todos os dados operacionais (leads, anúncios, contas, CRM) em JSON
  const baixarBackup = async () => {
    const { status, j } = await api({ action: 'crm-list', token })
    if (status === 401) return sair()
    const dump = { geradoEm: new Date().toISOString(), anuncios: anuncios, leads: leads, contas: clientes, newsletter: dados?.news || [], crm: (j && j.clientes) || [] }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `backup-vinicius-graton-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const aprovarImovel = async (codigo, aprovado) => {
    if (aprovado !== false) setAprovadosLocais((a) => [...new Set([...a, String(codigo)])]) // some na hora
    const { status } = await api({ action: 'imovel-aprovar', token, codigo, aprovado })
    if (status === 401) return sair()
    carregar()
  }
  const aprovarTodos = async () => {
    if (!window.confirm(`Aprovar e publicar os ${importadosPendentes.length} imóveis importados?`)) return
    const cods = importadosPendentes.map((im) => String(im.codigo))
    setAprovadosLocais((a) => [...new Set([...a, ...cods])]) // somem na hora
    for (const c of cods) await api({ action: 'imovel-aprovar', token, codigo: c, aprovado: true })
    carregar()
  }
  const conferirTodosImoview = () => {
    if (!window.confirm(`Abrir as ${importadosPendentes.length} fichas no Imoview em abas novas? (se o navegador bloquear pop-ups, libere para este site)`)) return
    importadosPendentes.forEach((im) => window.open(`https://app.imoview.com.br/Imovel/Detalhes/${im.codigo}`, '_blank', 'noopener'))
  }

  const copiarEmails = () => {
    const emails = (dados?.news || []).map((n) => n.email).filter(Boolean).join(', ')
    try { navigator.clipboard.writeText(emails) } catch {}
  }
  const exportarNews = () => {
    const linhas = [['E-mail', 'Nome', 'Data']]
    ;(dados?.news || []).forEach((n) => linhas.push([n.email || '', n.nome || '', n.ts ? new Date(n.ts).toLocaleString('pt-BR') : '']))
    const csv = linhas.map((r) => r.map(csvCel).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'newsletter-vinicius-graton.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const exportarCSV = () => {
    const linhas = [['Nome', 'Telefone', 'Objetivo', 'Detalhes', 'Bairro/Cód', 'Origem', 'Status', 'Anotação', 'Data']]
    leads.forEach((l) => linhas.push([l.nome, l.fone, l.objetivo || '', (l.detalhes || '').replace(/[\r\n]+/g, ' '), l.bairro || l.cod || '', l.origem || '', l.status || 'Novo', (l.nota || '').replace(/[\r\n]+/g, ' '), l.data ? new Date(l.data).toLocaleString('pt-BR') : '']))
    const csv = linhas.map((r) => r.map(csvCel).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'leads-vinicius-graton.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const ABAS = [
    ['geral', 'Visão geral'],
    ['relatorio', '📄 Relatório'],
    ['imoveis', `Imóveis${aAvaliar ? ` (${aAvaliar} a avaliar)` : ''}`],
    ['leads', `Leads (${leads.length})`],
    ['crm', `Clientes${crmNovidades ? ` 🔔${crmNovidades}` : crmNovos ? ` (${crmNovos} novos)` : ''}`],
    ['news', `Newsletter (${(dados?.news || []).length})`],
    ['acessos', 'Acessos'],
    ['post', '📣 Gerar post'],
    ['fotos', '✨ Melhorar fotos'],
    ['marca', "Remover marca d'água"],
  ]

  return (
    <main className="pagina section--light det painel-pg admin-pg">
      <div className="container">
        <div className="conta-hero">
          <div><span className="eyebrow">Painel administrativo</span><h1 className="section-title">Central do <em>Vinícius</em></h1></div>
          <div className="conta-hero-acoes">
            <button className="btn btn-ghost" onClick={carregar} disabled={carregando}>{carregando ? 'Atualizando…' : 'Atualizar'}</button>
            <button className="btn btn-ghost" title="Baixa JSON com todos os leads, anúncios, clientes, newsletter e CRM — arquivo backup-YYYY-MM-DD.json" onClick={baixarBackup}>⬇ Backup</button>
            <button className="btn btn-ghost" onClick={sair}>Sair</button>
          </div>
        </div>

        <div className="admin-abas">
          {ABAS.map(([k, label]) => (
            <button key={k} className={`admin-aba ${aba === k ? 'on' : ''}`} onClick={() => setAba(k)}>{label}</button>
          ))}
        </div>

        {erro && <p className="anunciar-erro">{erro}</p>}
        {carregando && !dados && (
          <div className="admin-carregando">
            <svg viewBox="0 0 50 50" width="38" height="38" className="admin-spinner-svg" aria-hidden="true">
              <circle cx="25" cy="25" r="20" fill="none" stroke="#b8862f" strokeWidth="4" strokeLinecap="round" strokeDasharray="82 120" />
            </svg>
            <span>Carregando dados do painel…</span>
          </div>
        )}

        {aba === 'geral' && (
          <section>
            <div className="admin-stats">
              <StatCard rotulo="Imóveis a avaliar" valor={aAvaliar} sub={`${importadosPendentes.length} importados · ${pendentes} enviados`} onClick={() => { setAba('imoveis'); setSubImovel('avaliar') }} />
              <StatCard rotulo="Leads (7 dias)" valor={leadsNovos} sub={`${leads.length} no total`} onClick={() => setAba('leads')} />
              <StatCard rotulo="Clientes" valor={crmTotal} sub={`${crmNovidades ? '🔔 ' + crmNovidades + ' mexeram · ' : ''}${crmNovos ? crmNovos + ' novos · ' : ''}${clientes.length} cadastros`} onClick={() => setAba('crm')} />
              <StatCard rotulo="Imóveis no site" valor={espelhoTotal != null ? espelhoTotal.toLocaleString('pt-BR') : IMOVEIS.length} sub={espelhoTotal != null ? `ver todos no site · ${IMOVEIS.length} curados pra editar` : 'em destaque no site'} onClick={() => window.open('/imoveis', '_blank')} />
              <StatCard rotulo="Acessos no site" valor={totalViews} sub={blogViews ? `${Object.keys(blogViews).length} posts lidos` : 'leituras registradas'} onClick={() => setAba('acessos')} />
              <StatCard rotulo="Newsletter" valor={(dados?.news || []).length} sub="inscritos por e-mail" onClick={() => setAba('news')} />
            </div>
            {catalogoMeta?.geradoEm && (() => {
              const diasCatalogo = Math.floor((Date.now() - new Date(catalogoMeta.geradoEm).getTime()) / 86400000)
              if (diasCatalogo < 7) return null
              return (
                <div className="admin-alerta-stale">
                  ⚠ Catálogo desatualizado há <b>{diasCatalogo} dias</b> — rode <code>node scripts/gera-catalogo-rotina.mjs</code> para atualizar os {espelhoTotal?.toLocaleString('pt-BR')} imóveis.
                </div>
              )
            })()}
            <div className="det-trust" style={{ marginTop: 18 }}>
              <IconShield width={20} height={20} />
              <p><b>Visão geral do seu negócio.</b> Aqui ficam os números em tempo real. Use as abas acima para gerenciar os imóveis enviados pelos proprietários, seus leads (com status e anotações) e os cadastros da área do cliente.</p>
            </div>
          </section>
        )}

        {aba === 'imoveis' && (
          <div className="admin-subabas">
            <button className={`admin-subaba ${subImovel === 'avaliar' ? 'on' : ''}`} onClick={() => setSubImovel('avaliar')}>A avaliar ({aAvaliar})</button>
            <button className={`admin-subaba ${subImovel === 'publicados' ? 'on' : ''}`} onClick={() => setSubImovel('publicados')}>Publicados ({IMOVEIS.length})</button>
          </div>
        )}

        {aba === 'imoveis' && subImovel === 'avaliar' && (
          <section>
            <div className="admin-aprovar-head">
              <h3 className="det-rel-titulo" style={{ margin: 0 }}>Importados aguardando sua aprovação ({importadosPendentes.length})</h3>
              {importadosPendentes.length > 1 && (
                <div className="admin-aprovar-head-btns">
                  <button className="btn btn-gold" onClick={aprovarTodos}>✓ Aprovar todos ({importadosPendentes.length})</button>
                </div>
              )}
            </div>
            {importadosPendentes.length === 0 && <p className="section-sub">Nenhum imóvel importado aguardando aprovação. Tudo que eu importar do Imoview entra aqui primeiro — só vai pro site depois que você aprovar.</p>}
            <div className="admin-aprovar-lista">
              {importadosPendentes.map((im) => (
                <article className="aprovar-banner" key={im.codigo}>
                  <div className="aprovar-banner-fotos">
                    <img className="aprovar-banner-capa" src={im.img} alt="" loading="lazy" />
                    <div className="aprovar-banner-thumbs">
                      {(im.fotos || []).slice(1, 5).map((f, i) => <img key={i} src={f} alt="" loading="lazy" />)}
                      {(im.fotos || []).length > 5 && <span className="aprovar-banner-mais">+{im.fotos.length - 5}</span>}
                    </div>
                  </div>
                  <div className="aprovar-banner-info">
                    <div className="aprovar-banner-top">
                      <div>
                        <b>{im.tipo} · {im.bairro}</b>
                        <span className="aprovar-banner-end">{im.endereco || `${im.cidade} — ${im.uf}`}{im.edificio ? ` · Ed. ${im.edificio}` : ''}</span>
                      </div>
                      <span className="aprovar-banner-preco">{formatPreco(im.preco)}</span>
                    </div>
                    {im.conferido && <span className="aprovar-conf">✓ Conferido pelo sistema no Imoview ({new Date(im.conferido + 'T12:00:00').toLocaleDateString('pt-BR')}) — dados batem</span>}
                    <div className="aprovar-banner-specs">
                      {im.quartos > 0 && <span>{im.quartos} quartos</span>}
                      {im.suites > 0 && <span>{im.suites} suíte{im.suites > 1 ? 's' : ''}</span>}
                      {im.banheiros > 0 && <span>{im.banheiros} banheiros</span>}
                      {im.vagas > 0 && <span>{im.vagas} vaga{im.vagas > 1 ? 's' : ''}</span>}
                      {im.area > 0 && <span>{im.area} m²</span>}
                      {im.condominio > 0 && <span>Cond. {formatPreco(im.condominio)}</span>}
                      <span>cód. {im.codigo}</span>
                      <span>{(im.fotos || []).length} fotos</span>
                    </div>
                    {im.descricao && <p className="aprovar-banner-desc">{im.descricao}</p>}
                    <div className="aprovar-banner-acoes">
                      <button className="btn btn-gold" onClick={() => aprovarImovel(im.codigo, true)}>✓ Aprovar e publicar</button>
                      <a className="admin-btn" href={`/imovel/${im.codigo}`} target="_blank" rel="noopener">Pré-visualizar</a>
                      <a className="admin-btn admin-btn--imoview" href={`https://app.imoview.com.br/Imovel/Detalhes/${im.codigo}`} target="_blank" rel="noopener">↗ Conferir no Imoview</a>
                      <button className="admin-btn" onClick={() => { setImovelAlvo(im.codigo); setAba('imoveis'); setSubImovel('publicados') }}>🔒 Proprietário / editar</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <h3 className="det-rel-titulo" style={{ marginTop: 28 }}>Enviados pelos proprietários ({anuncios.length})</h3>
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
                {a.placa && <p className="admin-card-end">🪧 Placa VENDE-SE: <b>{a.placa}</b></p>}
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

        {aba === 'imoveis' && subImovel === 'publicados' && <ImoveisPub token={token} onSair={sair} alvo={imovelAlvo} onAbriu={() => setImovelAlvo(null)} />}

        {aba === 'crm' && <AdminCRM token={token} onSair={sair} cadastros={clientes} onExcluirCadastro={(c) => excluir(c._key, `o cadastro de ${c.nome || 'cliente'}`)} />}

        {aba === 'acessos' && (
          <section>
            <div className="admin-stats">
              <StatCard rotulo="Leituras no blog" valor={totalViews} sub={blogViews ? `${Object.keys(blogViews).length} posts lidos` : '—'} />
              <StatCard rotulo="Imóveis no site" valor={espelhoTotal != null ? espelhoTotal.toLocaleString('pt-BR') : IMOVEIS.length} sub="no ar agora" />
              <StatCard rotulo="Leads (7 dias)" valor={leadsNovos} sub={`${leads.length} no total`} />
              <StatCard rotulo="Clientes" valor={crmTotal} sub={`${clientes.length} cadastros`} />
            </div>
            <h3 className="admin-sec-tit">Conteúdo mais acessado</h3>
            {blogViews && Object.keys(blogViews).length ? (
              <ul className="admin-rank">
                {Object.entries(blogViews).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([slug, n]) => (
                  <li key={slug}><a href={`/blog/${slug}`} target="_blank" rel="noopener">{slug.replace(/-/g, ' ')}</a><b>{n} {n === 1 ? 'leitura' : 'leituras'}</b></li>
                ))}
              </ul>
            ) : <p className="section-sub">Ainda sem leituras registradas. Conforme o site recebe visitas, o ranking aparece aqui.</p>}
            <div className="admin-info-box">
              <p><b>Visão de acessos do site.</b> Aqui mostro o que o próprio site registra em tempo real (leituras do blog, leads e cadastros). Para o relatório completo de visitas, origem do tráfego, dispositivos e tempo de navegação, abra o Google Analytics.</p>
              <a className="btn btn-ghost" href="https://analytics.google.com/" target="_blank" rel="noopener">Abrir o Google Analytics ↗</a>
            </div>
          </section>
        )}

        {aba === 'news' && (
          <section>
            <div className="admin-news-top">
              <h3 className="admin-sec-tit" style={{ margin: 0 }}>{(dados?.news || []).length} {(dados?.news || []).length === 1 ? 'inscrito' : 'inscritos'} na newsletter</h3>
              <div className="admin-news-acoes">
                <button className="btn btn-ghost" onClick={copiarEmails}>Copiar e-mails</button>
                <button className="btn btn-ghost" onClick={exportarNews}>Exportar CSV</button>
                <a className="btn btn-ghost" href="https://dashboard.mailerlite.com/subscribers" target="_blank" rel="noopener">Abrir MailerLite ↗</a>
              </div>
            </div>
            {(dados?.news || []).length ? (
              <ul className="admin-news-lista">
                {dados.news.map((nw) => (
                  <li key={nw._key || nw.email}>
                    <div className="admin-news-info"><b>{nw.email || '—'}</b>{nw.nome ? <i> · {nw.nome}</i> : null}</div>
                    <span className="admin-news-data">{nw.ts ? new Date(nw.ts).toLocaleDateString('pt-BR') : ''}</span>
                    <button className="admin-news-x" onClick={() => excluir(nw._key, `o inscrito ${nw.email || ''}`)} title="Remover inscrito" aria-label="Remover">✕</button>
                  </li>
                ))}
              </ul>
            ) : <p className="section-sub">Ninguém inscrito ainda. Os e-mails capturados no rodapé do site aparecem aqui automaticamente.</p>}
          </section>
        )}

        {aba === 'relatorio' && (() => {
          const porStatus = {}
          leads.forEach((l) => { const s = l.status || 'Novo'; porStatus[s] = (porStatus[s] || 0) + 1 })
          const empre = CONSTRUTORAS.reduce((a, c) => a + ((c.projetos || []).length), 0)
          const agora = new Date()
          const Bloco = ({ titulo, itens }) => (
            <>
              <h4 className="rel-h">{titulo}</h4>
              <div className="rel-nums">{itens.map((it, i) => <div key={i}><b>{it.v}</b><span>{it.l}</span></div>)}</div>
            </>
          )
          return (
            <section className="admin-relatorio">
              <div className="rel-top">
                <div>
                  <h3 className="admin-sec-tit" style={{ margin: 0 }}>Relatório completo do site</h3>
                  <p className="section-sub" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Tudo num lugar só. Clique pra salvar em PDF (na janela, escolha "Salvar como PDF").</p>
                </div>
                <button className="btn btn-gold" onClick={() => window.print()}>⬇ Baixar PDF / Imprimir</button>
              </div>

              <div className="rel-doc" id="relatorio-doc">
                <div className="rel-cabec">
                  <div><b className="rel-marca">{CONFIG.nome}</b><span>Consultor de imóveis · Uberlândia</span></div>
                  <div className="rel-data">Gerado em<br /><b>{agora.toLocaleString('pt-BR')}</b></div>
                </div>

                <Bloco titulo="Imóveis" itens={[
                  { v: (espelhoTotal != null ? espelhoTotal : IMOVEIS.length).toLocaleString('pt-BR'), l: 'no site' },
                  { v: IMOVEIS.length, l: 'em destaque' },
                  { v: aAvaliar, l: 'a avaliar' },
                  { v: CONSTRUTORAS.length, l: 'construtoras' },
                  { v: empre, l: 'empreendimentos' },
                ]} />

                <Bloco titulo="Leads" itens={[
                  { v: leads.length, l: 'no total' },
                  { v: leadsNovos, l: 'últimos 7 dias' },
                  ...STATUS_LEAD.map((s) => ({ v: porStatus[s] || 0, l: s })),
                ]} />

                <Bloco titulo="Clientes e contatos" itens={[
                  { v: crmTotal, l: 'clientes (CRM)' },
                  { v: clientes.length, l: 'cadastros (área do cliente)' },
                  { v: (dados?.news || []).length, l: 'inscritos newsletter' },
                ]} />

                <Bloco titulo="Acessos e novidades" itens={[
                  { v: totalViews, l: 'leituras no blog' },
                  { v: (novidades?.novos || []).length, l: 'imóveis novos (hoje)' },
                  { v: (novidades?.baixaram || []).length, l: 'baixaram de preço' },
                ]} />

                {leads.length > 0 && (
                  <>
                    <h4 className="rel-h">Últimos leads</h4>
                    <table className="rel-tab">
                      <thead><tr><th>Nome</th><th>WhatsApp</th><th>Origem</th><th>Status</th><th>Data</th></tr></thead>
                      <tbody>
                        {[...leads].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 12).map((l, i) => (
                          <tr key={i}><td>{l.nome}</td><td>{l.fone}</td><td>{l.bairro || l.cod || '—'}</td><td>{l.status || 'Novo'}</td><td>{l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <p className="rel-rod">Relatório gerado pela Central do Vinícius · {CONFIG.nome} · {agora.toLocaleDateString('pt-BR')}</p>
              </div>
            </section>
          )
        })()}

        {aba === 'post' && <Suspense fallback={<p className="section-sub">Carregando…</p>}><PostGen /></Suspense>}

        {aba === 'fotos' && <Suspense fallback={<p className="section-sub">Carregando…</p>}><MelhorarFotos /></Suspense>}

        {aba === 'marca' && <Suspense fallback={<p className="section-sub">Carregando…</p>}><RemoverMarca /></Suspense>}

        <p className="calc-nota rel-noprint" style={{ marginTop: 22 }}>Painel seguro · sessão de 12h · WhatsApp do site: {CONFIG.telefone || ''}.</p>
      </div>
    </main>
  )
}
