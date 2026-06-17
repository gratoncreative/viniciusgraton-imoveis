// Histórico LOCAL de imóveis vistos (client-side, sem backend).
// Guarda os últimos códigos abertos em /imovel/:codigo p/ a faixa "Visto recentemente".
const LSK = 'vg_vistos'
const MAX = 12

export function getVistos() {
  try { const a = JSON.parse(localStorage.getItem(LSK) || '[]'); return Array.isArray(a) ? a.map(String) : [] } catch { return [] }
}

export function registrarVisto(codigo) {
  if (!codigo) return
  const c = String(codigo)
  try {
    const atual = getVistos().filter((x) => x !== c)
    atual.unshift(c) // mais recente primeiro
    localStorage.setItem(LSK, JSON.stringify(atual.slice(0, MAX)))
    try { window.dispatchEvent(new Event('vg-vistos')) } catch {}
  } catch {}
}
