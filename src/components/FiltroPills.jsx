// Filtro de seleção rápida em PÍLULAS (clica direto, sem abrir menu) — estilo Chaves na Mão.
// Ideal pra opções de poucos valores (quartos, suítes, vagas). Clicar de novo desmarca.
export default function FiltroPills({ icon, label, value = 0, max = 4, onChange }) {
  return (
    <div className="fp">
      <span className="fp-lbl">{icon}{label}</span>
      <div className="fp-row">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`fp-pill ${Number(value) === n ? 'on' : ''}`}
            onClick={() => onChange(Number(value) === n ? 0 : n)}
          >
            {n}+
          </button>
        ))}
      </div>
    </div>
  )
}
