/**
 * Valida o código de acesso exclusivo dos corretores da Rotina.
 * O código fica num segredo do Cloudflare (ROTINA_CODIGO) — nunca no código-fonte.
 *
 *   POST /api/corretor-acesso { codigo } -> { ok: true } | { ok:false } | { ok:false, naoConfigurado:true }
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })

export async function onRequestPost({ request, env }) {
  let body = {}
  try { body = await request.json() } catch {}
  const codigo = String(body.codigo || '').trim()
  const esperado = String((env && env.ROTINA_CODIGO) || '').trim()
  if (!esperado) return json({ ok: false, naoConfigurado: true })
  if (codigo && codigo.toLowerCase() === esperado.toLowerCase()) return json({ ok: true })
  return json({ ok: false })
}
