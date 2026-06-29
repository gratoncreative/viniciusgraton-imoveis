import { useRef, useState } from 'react'

// Ícone padrão (documento) — usado quando a ferramenta não passa um próprio.
function iconePadrao(size = 48) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
}

// Zona de upload reutilizável (arrastar/soltar ou clicar). Reusa as classes pdfjpg-drop*
// já estilizadas. Não sobe nada a servidor — só entrega os File ao chamador.
export default function ArquivoDrop({ accept, multiple = false, onFiles, icon, titulo, sub, hint }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const entregar = (fileList) => {
    const files = [...(fileList || [])]
    if (files.length) onFiles(files)
  }

  return (
    <div
      className={`pdfjpg-drop${over ? ' pdfjpg-drop--over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); entregar(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => { entregar(e.target.files); e.target.value = '' }}
        style={{ display: 'none' }}
      />
      <div className="pdfjpg-drop-icon">{icon || iconePadrao(48)}</div>
      <p className="pdfjpg-drop-titulo">{titulo}</p>
      <p className="pdfjpg-drop-sub">{sub}</p>
      {hint && <span className="pdfjpg-drop-hint">{hint}</span>}
    </div>
  )
}
