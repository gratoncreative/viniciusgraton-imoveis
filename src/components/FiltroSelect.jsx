import { useState, useRef, useEffect } from 'react'

// Dropdown de filtro personalizado (substitui o <select> nativo).
// - single: escolha única (tipo, preço, quartos…)
// - multiple: marca vários (bairros) com caixinhas
// - searchable: campo de busca no topo (útil pra lista grande de bairros)
// Texto com respiro, opções alinhadas, e seleção múltipla — tudo sob nosso controle.
export default function FiltroSelect({ icon, placeholder, options = [], value, multiple = false, searchable = false, neutral = '', onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const arr = multiple ? (Array.isArray(value) ? value : []) : []
  const ativo = multiple ? arr.length > 0 : String(value) !== String(neutral)

  const rotulo = () => {
    if (multiple) return arr.length === 0 ? placeholder : arr.length === 1 ? arr[0] : `${arr.length} bairros`
    if (!ativo) return placeholder
    const o = options.find((x) => String(x.value) === String(value))
    return o ? o.label : placeholder
  }

  const lista = searchable && q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  const escolher = (v) => {
    if (multiple) {
      const set = new Set(arr.map(String))
      set.has(String(v)) ? set.delete(String(v)) : set.add(String(v))
      onChange(options.filter((o) => set.has(String(o.value))).map((o) => o.value))
    } else {
      onChange(v)
      setOpen(false)
    }
  }

  return (
    <div className={`fs ${ativo ? 'fs--on' : ''} ${open ? 'fs--open' : ''}`} ref={ref}>
      <button type="button" className="fs-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {icon && <span className="fs-ico">{icon}</span>}
        <span className="fs-label">{rotulo()}</span>
        <svg className="fs-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="fs-pop">
          {searchable && (
            <input className="fs-busca" autoFocus type="search" placeholder="Buscar bairro…" value={q} onChange={(e) => setQ(e.target.value)} />
          )}
          <ul className="fs-opts">
            {lista.map((o) => {
              const on = multiple ? arr.map(String).includes(String(o.value)) : String(value) === String(o.value)
              return (
                <li key={String(o.value)}>
                  <button type="button" className={`fs-opt ${on ? 'on' : ''}`} onClick={() => escolher(o.value)}>
                    {multiple && <span className={`fs-check ${on ? 'on' : ''}`} aria-hidden="true" />}
                    <span className="fs-opt-txt">{o.label}</span>
                  </button>
                </li>
              )
            })}
            {lista.length === 0 && <li className="fs-vazio">Nada encontrado</li>}
          </ul>
          {multiple && arr.length > 0 && (
            <button type="button" className="fs-limpar" onClick={() => onChange([])}>Limpar seleção</button>
          )}
        </div>
      )}
    </div>
  )
}
