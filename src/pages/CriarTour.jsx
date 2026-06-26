import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { getCorretorOuAdmin } from '../corretor'

// Ferramenta self-service: o corretor cadastrado sobe a cena 3D (capturada no
// celular) e recebe um link compartilhável hospedado no domínio do Vinícius.
// Plano grátis: 1 tour ativo, com marca d'água, expira em 30 dias.
// ADMIN (Vinícius) tem acesso liberado sempre: ilimitado, sem marca, sem expirar.

const diasRestantes = (exp) => Math.max(0, Math.ceil((exp - Date.now()) / 86400000))
const tokenAdmin = () => { try { return localStorage.getItem('vg_admin_token') || '' } catch { return '' } }

export default function CriarTour() {
  const [corr, setCorr] = useState(() => getCorretorOuAdmin())
  useSEO({ title: 'Crie seu Tour 3D', description: 'Hospede o tour 3D do seu imóvel e compartilhe um link na sua marca.', path: '/ferramentas/criar-tour' })
  useEffect(() => {
    const h = () => setCorr(getCorretorOuAdmin())
    window.addEventListener('vg-corretor', h)
    return () => window.removeEventListener('vg-corretor', h)
  }, [])

  const ehAdmin = corr?.tipo === 'admin'
  if (!corr || (!ehAdmin && !corr.fone)) return <Gate />
  return <Criador corr={corr} ehAdmin={ehAdmin} />
}

function Gate() {
  return (
    <main className="pagina section--light">
      <div className="container" style={{ maxWidth: 640, textAlign: 'center', padding: '48px 0' }}>
        <h1 className="section-title">Crie seu Tour 3D</h1>
        <p className="section-sub" style={{ margin: '10px auto 24px' }}>
          Transforme um imóvel num tour 3D navegável e ganhe um link pronto para mandar no WhatsApp e nos anúncios. É grátis — basta o cadastro de corretor.
        </p>
        <Link to="/corretor" className="btn btn-gold">Fazer cadastro grátis</Link>
      </div>
    </main>
  )
}

function Criador({ corr, ehAdmin }) {
  const [titulo, setTitulo] = useState('')
  const [file, setFile] = useState(null)
  const [prog, setProg] = useState(null) // null | 0..100
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null) // { id, url }
  const [tours, setTours] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState('')

  const carregarTours = () => {
    fetch('/api/tour3d-list', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fone: corr.fone || '', adminToken: ehAdmin ? tokenAdmin() : '' }) })
      .then((r) => r.json())
      .then((j) => { setTours(j.ok ? (j.tours || []) : []); setCarregando(false) })
      .catch(() => setCarregando(false))
  }
  useEffect(carregarTours, [])

  const subir = () => {
    setErro('')
    if (!file) { setErro('Selecione o arquivo .ply ou .sog do tour.'); return }
    if (!/\.(ply|sog)$/i.test(file.name)) { setErro('O arquivo precisa ser .ply (PLY comprimido) ou .sog — exporte assim no SuperSplat.'); return }
    setProg(0)
    const fd = new FormData()
    fd.append('arquivo', file)
    fd.append('titulo', titulo)
    fd.append('fone', corr.fone || '')
    fd.append('nome', corr.nome || '')
    if (ehAdmin) fd.append('adminToken', tokenAdmin())
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/tour3d-upload')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProg(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      setProg(null)
      let j = {}
      try { j = JSON.parse(xhr.responseText) } catch {}
      if (j.ok) {
        setResultado({ id: j.id, url: j.url })
        setFile(null); setTitulo('')
        carregarTours()
      } else {
        setErro(j.erro || 'Não foi possível publicar o tour.')
      }
    }
    xhr.onerror = () => { setProg(null); setErro('Falha de conexão ao enviar.') }
    xhr.send(fd)
  }

  const excluir = (id) => {
    if (!window.confirm('Excluir este tour 3D? O link deixará de funcionar.')) return
    fetch('/api/tour3d-delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fone: corr.fone || '', id, adminToken: ehAdmin ? tokenAdmin() : '' }) })
      .then((r) => r.json())
      .then(() => { if (resultado && resultado.id === id) setResultado(null); carregarTours() })
  }

  const copiar = (url, id) => {
    const abs = window.location.origin + url
    try { navigator.clipboard.writeText(abs) } catch {}
    setCopiado(id); setTimeout(() => setCopiado(''), 1800)
  }

  return (
    <main className="pagina section--light">
      <div className="container" style={{ maxWidth: 760, padding: '36px 0' }}>
        <h1 className="section-title">Crie seu Tour 3D</h1>
        <p className="section-sub" style={{ marginTop: 8 }}>
          Olá, {(corr.nome || '').split(' ')[0] || 'corretor'}! Suba a cena 3D do imóvel e ganhe um link na sua marca para compartilhar.
        </p>

        <ol style={passosWrap}>
          <li style={passo}><b>1. Capture</b> o imóvel no celular com o app <b>Scaniverse</b> (grátis, modo Splat).</li>
          <li style={passo}><b>2. Exporte</b> em <b>superspl.at/editor</b> (grátis) como <b>PLY comprimido</b> ou <b>.sog</b>.</li>
          <li style={passo}><b>3. Suba aqui</b> e copie o link pronto. 🎉</li>
        </ol>

        <div style={card}>
          <label style={campo}>
            <span style={lbl}>Título do tour</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Apartamento 3 quartos no Santa Mônica" style={input} maxLength={100} />
          </label>
          <label style={campo}>
            <span style={lbl}>Arquivo 3D (.ply ou .sog · máx 60 MB)</span>
            <input type="file" accept=".ply,.sog" onChange={(e) => { setFile(e.target.files?.[0] || null); setResultado(null); setErro('') }} style={{ ...input, padding: 10 }} />
          </label>

          {prog !== null && (
            <div style={{ margin: '6px 0 12px' }}>
              <div style={barraFora}><div style={{ ...barraDentro, width: prog + '%' }} /></div>
              <span style={{ fontSize: 13, color: '#5a6275' }}>{prog < 100 ? `Enviando… ${prog}%` : 'Processando…'}</span>
            </div>
          )}
          {erro && <p style={{ color: '#C20020', fontSize: 14, margin: '6px 0' }}>{erro}</p>}

          <button onClick={subir} disabled={prog !== null} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
            {prog !== null ? 'Enviando…' : 'Publicar tour 3D'}
          </button>

          {resultado && (
            <div style={sucesso}>
              <b style={{ color: '#1C2A44' }}>✓ Tour publicado!</b>
              <div style={linhaLink}>
                <code style={codeUrl}>{window.location.origin + resultado.url}</code>
                <button onClick={() => copiar(resultado.url, resultado.id)} className="btn btn-navy" style={btnMini}>{copiado === resultado.id ? 'Copiado!' : 'Copiar'}</button>
                <a href={resultado.url} target="_blank" rel="noopener noreferrer" className="btn btn-navy" style={btnMini}>Abrir</a>
              </div>
            </div>
          )}
        </div>

        <h2 className="section-title" style={{ fontSize: '1.3rem', marginTop: 36 }}>Seus tours</h2>
        {carregando ? (
          <p className="section-sub">Carregando…</p>
        ) : tours.length === 0 ? (
          <p className="section-sub">Você ainda não tem tours. Publique o primeiro acima.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
            {tours.map((t) => (
              <li key={t.id} style={itemTour}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ color: '#1C2A44', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</b>
                  <span style={{ fontSize: 12.5, color: '#5a6275' }}>{t.expiresAt ? `Expira em ${diasRestantes(t.expiresAt)} dias · plano grátis` : 'Sem expiração · admin'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => copiar(t.url, t.id)} className="btn btn-navy" style={btnMini}>{copiado === t.id ? 'Copiado!' : 'Copiar link'}</button>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn btn-navy" style={btnMini}>Abrir</a>
                  <button onClick={() => excluir(t.id)} style={{ ...btnMini, background: '#EB0128', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {ehAdmin ? (
          <p style={upgrade}>Você é <b>admin</b>: tours ilimitados, sem marca d'água e sem expiração.</p>
        ) : (
          <p style={upgrade}>
            No plano grátis você mantém <b>1 tour ativo</b> (com marca d'água, expira em 30 dias). Em breve: plano com tours ilimitados, sem marca e sem expirar.
          </p>
        )}
      </div>
    </main>
  )
}

const passosWrap = { listStyle: 'none', padding: 0, display: 'grid', gap: 8, margin: '20px 0' }
const passo = { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 14.5, color: '#3a4154' }
const card = { background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: '0 20px 50px -34px rgba(28,42,68,.4)' }
const campo = { display: 'block', marginBottom: 14 }
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#1C2A44', marginBottom: 6 }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 12px', font: 'inherit', color: '#1C2A44', background: '#fbfbf9' }
const barraFora = { height: 8, background: '#eee', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }
const barraDentro = { height: '100%', background: '#C9A24B', transition: 'width .2s' }
const sucesso = { marginTop: 16, padding: 14, background: '#f4f7f2', border: '1px solid #d8e3cf', borderRadius: 12 }
const linhaLink = { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }
const codeUrl = { flex: 1, minWidth: 180, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1C2A44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const btnMini = { padding: '8px 14px', fontSize: 13 }
const itemTour = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }
const upgrade = { marginTop: 24, padding: 14, background: '#fff7e6', borderRadius: 12, fontSize: 13.5, color: '#5a6275', border: '1px dashed #d9cdb0' }
