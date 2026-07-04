import { lazy } from 'react'

// Cura de chunk com cache ENVENENADO: na janela de propagação de um deploy, a URL do
// chunk pode responder o fallback HTML e o navegador guarda isso como immutable (1 ano);
// reload comum NÃO cura. A cura: fetch(url,{cache:'reload'}) força a rede e REGRAVA a
// entrada do cache com os bytes certos. Acha na mensagem do erro a URL que falhou
// (.js ou .css, absoluta ou relativa à raiz). Devolve true se achou e regravou.
const regravarCache = async (err) => {
  const m = String((err && err.message) || '').match(/(?:https?:\/\/|\/)\S+\.(?:js|css)/)
  if (!m) return false
  await fetch(m[0], { cache: 'reload' })
  return true
}

// Carrega um chunk de rota/componente sob demanda e AUTO-RECUPERA de falha. Duas causas
// reais: (1) deploy trocou os arquivos com a página aberta; (2) cache envenenado (acima).
// Se nem a regravação resolver, recarrega 1x (sessionStorage evita loop).
export const lazyRetry = (factory) => lazy(() => factory().catch(async (err) => {
  try {
    if (await regravarCache(err)) return await factory() // segunda tentativa já com o cache regravado
  } catch { /* cai pro reload abaixo */ }
  try {
    const K = 'chunkReloadEm'
    const ultimo = Number(sessionStorage.getItem(K) || 0)
    if (Date.now() - ultimo > 12000) {
      sessionStorage.setItem(K, String(Date.now()))
      window.location.reload()
      return new Promise(() => {}) // segura o render até recarregar
    }
  } catch { /* sessionStorage indisponível: sem guarda anti-loop, melhor não recarregar */ }
  throw err
}))

// Mesma cura para import() "cru" fora do lazy de rota (jspdf, pdf-lib, jszip, heic2any,
// transformers, onnxruntime, módulos de PDF próprios) — sem isso, cache envenenado nessas
// URLs faz a ferramenta falhar em silêncio. Uso:
//   const { jsPDF } = await importRetry(() => import('jspdf'))
export const importRetry = async (factory) => {
  try {
    return await factory()
  } catch (err) {
    try {
      if (await regravarCache(err)) return await factory()
    } catch { /* mantém o erro original */ }
    throw err
  }
}
