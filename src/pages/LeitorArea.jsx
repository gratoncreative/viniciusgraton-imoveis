import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import { IconArrow, IconWhats } from '../components/icons'
import '../styles/converter.css'
import '../styles/catalogo.css'
import '../styles/admin.css'

const MODOS = [
  { id: 'auto', nome: 'Detectar automaticamente' },
  { id: 'planta', nome: 'Planta baixa (somar a área)' },
  { id: 'anuncio', nome: 'Print de anúncio (extrair dados)' },
  { id: 'lista', nome: 'Lista de imóveis (média do m²)' },
  { id: 'foto', nome: 'Foto do cômodo (estimativa)' },
]

// comprime a imagem no navegador (mantém legível p/ a IA ler números)
function comprimir(file) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const esc = Math.min(1, 1600 / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * esc)), h = Math.max(1, Math.round(img.height * esc))
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      ok(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('não consegui ler a imagem')) }
    img.src = url
  })
}

export default function LeitorArea() {
  useSEO({
    title: 'Leitor de Área por IA - leia a metragem de plantas e anúncios',
    description: 'Envie a foto de uma planta baixa, print de anúncio ou lista de imóveis e a IA lê e calcula a área (total, por cômodo e média). Ferramenta gratuita do Vinícius Graton.',
    path: '/ferramentas/leitor-area',
  })

  const [img, setImg] = useState('')
  const [modo, setModo] = useState('auto')
  const [carregando, setCarregando] = useState(false)
  const [res, setRes] = useState(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  const carregar = async (file) => {
    if (!file || !/^image\//.test(file.type)) { setErro('Envie uma imagem (JPG, PNG ou WEBP).'); return }
    setErro(''); setRes(null)
    try { setImg(await comprimir(file)) } catch { setErro('Não consegui abrir essa imagem.') }
  }
  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.[0]) carregar(e.dataTransfer.files[0]) }

  const ler = async () => {
    if (!img || carregando) return
    setCarregando(true); setErro(''); setRes(null)
    try {
      const r = await fetch('/api/ler-area', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imagem: img, modo }) })
      const j = await r.json()
      if (j.ok && j.resultado) setRes(j.resultado)
      else setErro(j.msg || 'Não consegui ler a área dessa imagem.')
    } catch { setErro('Falha de conexão. Tente de novo.') }
    setCarregando(false)
  }

  const copiar = () => { if (res?.resumo) { navigator.clipboard?.writeText(res.resumo).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } }

  return (
    <main className="pagina section--light det conv-pg">
      <div className="container">
        <div className="cat-head" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 8px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramenta gratuita</span>
          <h1 className="section-title">Leitor de <em>Área</em> por IA</h1>
          <p className="section-sub" style={{ marginTop: 12 }}>
            Mande a foto de uma <b>planta baixa</b>, <b>print de anúncio</b> ou <b>lista de imóveis</b> - a IA lê e calcula a área (total, por cômodo e média). A imagem é processada com segurança e não fica salva.
          </p>
        </div>

        <div className="conv-painel" style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className={`conv-drop ${drag ? 'on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { carregar(e.target.files[0]); e.target.value = '' }} />
            {img ? (
              <img src={img} alt="Imagem enviada" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 10, objectFit: 'contain' }} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <b>Arraste a planta/print aqui ou clique pra escolher</b>
                <i>JPG · PNG · WEBP</i>
              </>
            )}
          </div>

          <div className="conv-controles" style={{ marginTop: 16 }}>
            <label className="conv-campo" style={{ flex: 1 }}>
              <span>O que tem na imagem?</span>
              <select value={modo} onChange={(e) => setModo(e.target.value)}>
                {MODOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </label>
          </div>

          <div className="conv-acoes" style={{ marginTop: 14 }}>
            <button className="btn btn-gold" type="button" disabled={!img || carregando} onClick={ler}>
              {carregando ? 'Lendo a área…' : 'Ler a área'}
            </button>
            {img && <button className="conv-limpar" type="button" onClick={() => { setImg(''); setRes(null); setErro('') }}>Trocar imagem</button>}
          </div>

          {erro && <p className="conv-erro" style={{ marginTop: 14, color: '#b3261e' }}>{erro}</p>}

          {res && (
            <div className="lerarea-res" style={{ marginTop: 20 }}>
              {res.destaque && <div style={{ background: '#FBF7EF', border: '1px solid #e9dfc6', borderRadius: 14, padding: '16px 18px', textAlign: 'center', fontFamily: 'var(--font-head)', fontSize: '1.35rem', fontWeight: 800, color: '#1C2A44' }}>{res.destaque}</div>}
              {(res.linhas || []).length > 0 && (
                <table className="post-tabela" style={{ width: '100%', marginTop: 16 }}>
                  <tbody>{res.linhas.map((l, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{l.rotulo}</td><td>{l.valor}</td></tr>)}</tbody>
                </table>
              )}
              {res.resumo && (
                <div style={{ marginTop: 16 }}>
                  <p className="admin-mini-label" style={{ margin: '0 0 6px' }}>Resumo pronto pra copiar</p>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{res.resumo}</div>
                  <button className="btn btn-ghost" type="button" onClick={copiar} style={{ marginTop: 10 }}>{copiado ? '✓ Copiado' : 'Copiar resumo'}</button>
                </div>
              )}
              {res.aviso && <p className="painel-meta" style={{ marginTop: 12, fontStyle: 'italic' }}>⚠ {res.aviso}</p>}
            </div>
          )}

          <p className="conv-privacidade" style={{ marginTop: 18 }}>
            🔒 A imagem é usada só pra essa leitura e não é arquivada. A área é uma <b>estimativa de apoio</b> - a metragem oficial é a da matrícula do imóvel.
          </p>
        </div>

        <div style={{ marginTop: 28, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/ferramentas">Outras ferramentas <IconArrow /></Link>
          <a className="btn btn-gold" href={linkWhatsApp('Olá Vinícius! Usei o leitor de área no site e quero tirar uma dúvida.')} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar pelo WhatsApp</a>
        </div>
      </div>
    </main>
  )
}
