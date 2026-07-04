import { lazy } from 'react'

// Carrega um chunk sob demanda e AUTO-RECUPERA de falha de chunk. Duas causas reais:
// (1) deploy trocou os arquivos com a página aberta; (2) cache ENVENENADO: na janela de
// propagação de um deploy, a URL do chunk respondeu o fallback HTML e o navegador guardou
// isso como immutable (1 ano) — reload comum NÃO cura. A cura: fetch(url,{cache:'reload'})
// força a rede e REGRAVA a entrada do cache com os bytes certos; aí o import funciona.
// Se nem isso resolver, recarrega 1x (sessionStorage evita loop).
export const lazyRetry = (factory) => lazy(() => factory().catch(async (err) => {
  try {
    const m = String((err && err.message) || '').match(/https?:\/\/\S+\.js/)
    if (m) {
      await fetch(m[0], { cache: 'reload' })
      return await factory() // segunda tentativa já com o cache regravado
    }
  } catch { /* cai pro reload abaixo */ }
  const K = 'chunkReloadEm'
  const ultimo = Number(sessionStorage.getItem(K) || 0)
  if (Date.now() - ultimo > 12000) {
    sessionStorage.setItem(K, String(Date.now()))
    window.location.reload()
    return new Promise(() => {}) // segura o render até recarregar
  }
  throw err
}))
