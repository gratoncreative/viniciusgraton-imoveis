import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

// Dropdown de filtro personalizado (substitui o <select> nativo).
// - single: escolha única (tipo, preço, quartos…)
// - multiple: marca vários (bairros) com caixinhas
// - searchable: campo de busca no topo (útil pra lista grande de bairros)
// Texto com respiro, opções alinhadas, e seleção múltipla — tudo sob nosso controle.
export default function FiltroSelect({ icon, placeholder, options = [], value, multiple = false, searchable = false, neutral = '', onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState(null) // posição fixa do dropdown (não é cortado por colunas que rolam)
  const ref = useRef(null)
  const popRef = useRef(null)

  useLayoutEffect(() => {
    if (!open) return
    const calc = () => {
      const t = ref.current
      if (!t) return
      // O site usa html{zoom:0.85} no desktop. getBoundingClientRect devolve coords
      // VISUAIS (já escaladas); um position:fixed re-aplica o zoom. Por isso dividimos
      // os valores aplicados pelo zoom — assim o popup alinha exatamente com o gatilho.
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1
      const r = t.getBoundingClientRect()
      const vh = window.innerHeight * z // altura da viewport em coords visuais
      const abaixo = vh - r.bottom - 12
      const acima = r.top - 12
      // se não há espaço suficiente embaixo, abre PRA CIMA (não vaza pra fora da tela)
      const abrirCima = abaixo < 240 && acima > abaixo
      const maxH = Math.max(160, Math.min(360, abrirCima ? acima : abaixo))
      setPos({
        left: r.left / z,
        width: r.width / z,
        maxH: maxH / z,
        abrirCima,
        top: (r.bottom + 6) / z,
        bottom: (vh - r.top + 6) / z,
      })
    }
    calc()
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && popRef.current && !popRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    // reposiciona quando a coluna/página rola — MAS ignora a rolagem interna do próprio dropdown
    const onScroll = (e) => { if (popRef.current && popRef.current.contains(e.target)) return; calc() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', onScroll, true)
    }
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
      {open && createPortal(
        <div className="fs-pop" data-lenis-prevent ref={popRef} style={pos ? { position: 'fixed', left: pos.left, width: pos.width, maxHeight: pos.maxH, right: 'auto', top: pos.abrirCima ? 'auto' : pos.top, bottom: pos.abrirCima ? pos.bottom : 'auto', zIndex: 1000 } : { visibility: 'hidden' }}>
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
        </div>,
        document.body
      )}
    </div>
  )
}
