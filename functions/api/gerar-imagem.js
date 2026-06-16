// Geração de imagem para blog/redes via Cloudflare Workers AI (FLUX-1-schnell).
// Sem chave externa — usa o binding env.AI (mesmo dos textos). Billing no Cloudflare.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx
  if (!env.AI) return Response.json({ ok: false, erro: 'IA indisponível no momento.' }, { status: 503, headers: CORS })

  let body
  try { body = await request.json() } catch { return Response.json({ ok: false, erro: 'Requisição inválida.' }, { status: 400, headers: CORS }) }

  const prompt = String(body.prompt || '').trim().slice(0, 1500)
  if (!prompt) return Response.json({ ok: false, erro: 'Descreva a imagem que você quer.' }, { status: 400, headers: CORS })
  const steps = Math.min(8, Math.max(4, Number(body.steps) || 6))

  try {
    const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps })
    const b64 = out?.image
    if (!b64) return Response.json({ ok: false, erro: 'A IA não retornou imagem. Tente de novo.' }, { status: 502, headers: CORS })
    return Response.json({ ok: true, image: `data:image/jpeg;base64,${b64}` }, { headers: CORS })
  } catch (e) {
    return Response.json({ ok: false, erro: 'Falha ao gerar a imagem. Tente um prompt mais simples.' }, { status: 500, headers: CORS })
  }
}
