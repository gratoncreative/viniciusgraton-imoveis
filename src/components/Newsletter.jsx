import { useState } from 'react'

// Captura de e-mail (newsletter) — base para nutrir leads por e-mail depois.
export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [site, setSite] = useState('') // campo-isca
  const [estado, setEstado] = useState('') // '', 'ok', 'erro'

  const enviar = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEstado('erro'); return }
    setEstado('enviando')
    try {
      const r = await fetch('/api/news', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, site, origem: 'rodape' }) })
      setEstado(r.ok ? 'ok' : 'erro')
    } catch { setEstado('erro') }
  }

  return (
    <div className="news-band">
      <div className="news-txt">
        <b>Receba as melhores oportunidades antes de todo mundo</b>
        <span>Imóvel bom voa. Deixe seu e-mail e eu te aviso dos lançamentos e dicas, sem spam.</span>
      </div>
      {estado === 'ok' ? (
        <p className="news-ok">✓ Prontinho! Você está na lista.</p>
      ) : (
        <form className="news-form" onSubmit={enviar}>
          <input type="text" name="site" value={site} onChange={(e) => setSite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} />
          <input type="email" inputMode="email" required autoComplete="email" maxLength={140} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" aria-label="Seu e-mail" />
          <button type="submit" className="btn btn-gold" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Quero receber'}</button>
        </form>
      )}
      {estado === 'erro' && <p className="news-erro">Confere o e-mail e tenta de novo, por favor.</p>}
    </div>
  )
}
