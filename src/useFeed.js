import { useState, useEffect } from 'react'

// Catálogo completo da Rotina (público /catalogo.json) carregado no cliente, com cache
// de módulo (busca uma vez por sessão). As páginas de bairro/tipo usam isto para mostrar
// o MESMO estoque que o prerender já entrega ao Google — não só os imóveis curados.
let _cache = null
export function useFeed() {
  const [feed, setFeed] = useState(_cache || [])
  const [carregando, setCarregando] = useState(!_cache)
  useEffect(() => {
    if (_cache) return
    let vivo = true
    fetch('/catalogo.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.imoveis)) { _cache = d.imoveis; if (vivo) setFeed(d.imoveis) } })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])
  return { feed, carregando }
}
