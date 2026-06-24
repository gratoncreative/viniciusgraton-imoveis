import { useState, useEffect } from 'react'

// Imóveis de ALUGUEL da Rotina (público /alugueis.json), carregados no cliente com
// cache de módulo (busca uma vez por sessão). Mesma ideia do useFeed (venda), mas
// para a finalidade Locação. Cada item já vem com finalidade:'Aluguel'.
let _cache = null
export function useAlugueis() {
  const [lista, setLista] = useState(_cache || [])
  const [carregando, setCarregando] = useState(!_cache)
  useEffect(() => {
    if (_cache) return
    let vivo = true
    fetch('/alugueis.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = d && Array.isArray(d.imoveis) ? d.imoveis : (Array.isArray(d) ? d : null)
        if (arr) { _cache = arr; if (vivo) setLista(arr) }
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])
  return { alugueis: lista, carregando }
}
