/**
 * O PRÓPRIO cliente refina o perfil pela página /cliente/<token>.
 * Público (token UUID impossível de adivinhar). Atualiza SÓ campos de
 * preferência + feedback (curtir/descartar) no registro crm:<id>.
 * NUNCA mexe em whatsapp, nome, nota ou sugeridos (curadoria do Vinícius).
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export async function onRequestPost({ env, request }) {
  if (!(env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function')) return json({ error: 'kv' }, 503)
  const b = await request.json().catch(() => ({}))
  const id = String(b.t || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
  if (!id) return json({ error: 'token' }, 400)
  const reg = await env.ENGAGEMENT.get('crm:' + id, 'json').catch(() => null)
  if (!reg) return json({ error: 'nao-encontrado' }, 404)

  const num = (v) => Math.max(0, Math.min(99999999, Number(v) || 0))
  const p = b.prefs && typeof b.prefs === 'object' ? b.prefs : null
  if (p) {
    if (Array.isArray(p.tipos)) reg.tipos = p.tipos.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 30))
    if (Array.isArray(p.bairros)) reg.bairros = p.bairros.filter((x) => typeof x === 'string').slice(0, 30).map((x) => x.slice(0, 40))
    if ('precoMin' in p) reg.precoMin = num(p.precoMin)
    if ('precoMax' in p) reg.precoMax = num(p.precoMax)
    if ('quartosMin' in p) reg.quartosMin = num(p.quartosMin)
    if ('suitesMin' in p) reg.suitesMin = num(p.suitesMin)
    if ('vagasMin' in p) reg.vagasMin = num(p.vagasMin)
  }
  if (b.feedback && typeof b.feedback === 'object') {
    const fb = reg.feedback && typeof reg.feedback === 'object' ? reg.feedback : {}
    for (const [cod, v] of Object.entries(b.feedback)) {
      const c = String(cod).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      if (!c) continue
      if (v === null || v === 'remove') delete fb[c]
      else if (v === 'like' || v === 'dislike') fb[c] = v
      if (Object.keys(fb).length > 200) break
    }
    reg.feedback = fb
  }
  reg.refinadoEm = Date.now()
  reg.atualizadoEm = Date.now()
  await env.ENGAGEMENT.put('crm:' + id, JSON.stringify(reg))
  return json({ ok: true })
}
