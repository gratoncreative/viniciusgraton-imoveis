import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LANC_LIMIT = 3
const VIS_KEY = 'vg-lanc-vistos'
const LIBRE_KEY = 'vg-lanc-livre'

export function isLancLivre() {
  try { return localStorage.getItem(LIBRE_KEY) === '1' } catch { return false }
}
export function getLancVistos() {
  try { return new Set(JSON.parse(localStorage.getItem(VIS_KEY) || '[]')) } catch { return new Set() }
}
export function markLancVisto(key) {
  const s = getLancVistos()
  s.add(key)
  try { localStorage.setItem(VIS_KEY, JSON.stringify([...s])) } catch {}
}
export { LANC_LIMIT }

const soNum = (s) => String(s || '').replace(/\D/g, '')
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function LancGate() {
  const nav = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [pendUrl, setPendUrl] = useState('')
  const [pendKey, setPendKey] = useState('')
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [perfil, setPerfil] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const h = (ev) => {
      setPendUrl(ev.detail?.url || '')
      setPendKey(ev.detail?.key || '')
      setAberto(true)
      setErro('')
    }
    window.addEventListener('vg-lanc-gate', h)
    return () => window.removeEventListener('vg-lanc-gate', h)
  }, [])

  const fechar = () => setAberto(false)

  const enviar = (ev) => {
    ev.preventDefault()
    if (!nome.trim() || nome.trim().length < 2) { setErro('Informe seu nome'); return }
    try { localStorage.setItem(LIBRE_KEY, '1') } catch {}
    if (pendKey) markLancVisto(pendKey)
    fechar()
    if (pendUrl) nav(pendUrl)
  }

  if (!aberto) return null

  return (
    <div className="lg-overlay" onClick={fechar}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lg-close" onClick={fechar} aria-label="Fechar">×</button>
        <div className="lg-header">
          <span className="lg-icon" aria-hidden="true">🏙️</span>
          <h2 className="lg-titulo">Acesso gratuito ao catálogo completo</h2>
          <p className="lg-sub">
            Você explorou {LANC_LIMIT} empreendimentos. Cadastre-se para acessar todos os +90 lançamentos,
            plantas, preços e condições de pagamento — sem custo.
          </p>
        </div>
        <form className="lg-form" onSubmit={enviar} noValidate>
          <input
            className="lg-input"
            type="text"
            placeholder="Seu nome *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
          />
          <input
            className="lg-input"
            type="tel"
            placeholder="WhatsApp (opcional)"
            value={fone}
            onChange={(e) => setFone(mascaraFone(e.target.value))}
            inputMode="numeric"
            autoComplete="tel"
          />
          <select
            className="lg-input lg-select"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
          >
            <option value="">Meu interesse (opcional)</option>
            <option>Comprar para morar</option>
            <option>Investir em imóveis</option>
            <option>Corretor / assessor</option>
            <option>Apenas pesquisando</option>
          </select>
          {erro && <p className="lg-erro">{erro}</p>}
          <button type="submit" className="lg-btn">
            Acessar catálogo completo →
          </button>
          <p className="lg-nota">Gratuito. Sem spam. Só novidades reais de Uberlândia.</p>
        </form>
      </div>
    </div>
  )
}
