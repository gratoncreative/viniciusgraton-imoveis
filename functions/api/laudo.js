const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id || !/^[a-z0-9-]{8,}$/i.test(id)) return json({ error: 'id-invalido' }, 400)
  if (!env || !env.ENGAGEMENT || typeof env.ENGAGEMENT.get !== 'function') return json({ error: 'kv' }, 503)
  const data = await env.ENGAGEMENT.get('laudo:' + id, 'json')
  if (!data) return json({ error: 'nao-encontrado' }, 404)
  if (data.expiraEm && Date.now() > data.expiraEm) return json({ error: 'expirado', expirouEm: data.expiraEm }, 410)
  return json(data)
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' } })
}
