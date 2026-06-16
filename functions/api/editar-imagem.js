// Edição de imagem por máscara (inpainting) via Cloudflare Workers AI.
// Remover objeto / mobiliar ambiente. Sem chave externa — usa env.AI.
// Recebe image (base64), mask (base64, branco = área a refazer) e prompt.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}

function b64ParaBytes(b64) {
  const limpo = String(b64).replace(/^data:[^,]+,/, '')
  const bin = atob(limpo)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return [...arr]
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx
  if (!env.AI) return Response.json({ ok: false, erro: 'IA indisponível no momento.' }, { status: 503, headers: CORS })

  let body
  try { body = await request.json() } catch { return Response.json({ ok: false, erro: 'Requisição inválida.' }, { status: 400, headers: CORS }) }

  const { image, mask } = body
  const prompt = String(body.prompt || '').trim().slice(0, 1500)
  if (!image || !mask || !prompt) return Response.json({ ok: false, erro: 'Faltam dados (imagem, máscara ou comando).' }, { status: 400, headers: CORS })

  try {
    const resp = await env.AI.run('@cf/runwayml/stable-diffusion-v1-5-inpainting', {
      prompt,
      negative_prompt: String(body.negative || 'blurry, distorted, watermark, text, low quality, deformed').slice(0, 500),
      image: b64ParaBytes(image),
      mask: b64ParaBytes(mask),
      num_steps: 20,
      strength: Number(body.strength) || 1,
      guidance: Number(body.guidance) || 7.5,
    })
    // a IA devolve a imagem (PNG) como stream/binário
    return new Response(resp, { headers: { ...CORS, 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
  } catch (e) {
    return Response.json({ ok: false, erro: 'Falha ao editar a imagem. Tente uma área menor ou um comando mais simples.' }, { status: 500, headers: CORS })
  }
}
