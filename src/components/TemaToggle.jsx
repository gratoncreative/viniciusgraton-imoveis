import { useState, useEffect } from 'react'
import { getTema, toggleTema } from '../tema'

// Interruptor claro/escuro estilo iOS. O cliente escolhe na hora.
export default function TemaToggle({ className = '' }) {
  const [tema, setT] = useState('claro')
  useEffect(() => {
    setT(getTema())
    const ler = () => setT(getTema())
    window.addEventListener('vg-tema', ler)
    window.addEventListener('storage', ler)
    return () => { window.removeEventListener('vg-tema', ler); window.removeEventListener('storage', ler) }
  }, [])

  const escuro = tema === 'escuro'
  return (
    <button
      type="button"
      className={`tema-toggle ${escuro ? 'is-escuro' : ''} ${className}`}
      onClick={() => setT(toggleTema())}
      role="switch"
      aria-checked={escuro}
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
    >
      <span className="tema-track">
        <svg className="tema-ico tema-ico--sol" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        <svg className="tema-ico tema-ico--lua" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        <span className="tema-bola" />
      </span>
    </button>
  )
}
