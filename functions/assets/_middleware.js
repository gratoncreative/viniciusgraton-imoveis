// /assets/* que não existe (janela de propagação de deploy) NÃO pode responder o
// fallback HTML do SPA: o _headers marca /assets/* como immutable e o navegador
// guardaria o HTML errado por 1 ano na URL do chunk (import() quebra pra sempre).
// Vira 404 no-store, que ninguém cacheia; o lazyRetry do front se recupera sozinho.
// Montado em functions/assets/ pra só interceptar /assets/* (o resto do site nem
// passa por Function e mantém o cache de borda normal).
export async function onRequest({ next }) {
  const resp = await next()
  const ct = (resp.headers.get('content-type') || '').toLowerCase()
  if (ct.includes('text/html')) {
    return new Response('not found', { status: 404, headers: { 'cache-control': 'no-store' } })
  }
  return resp
}
