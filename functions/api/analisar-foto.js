import { kvStore } from '../_lib/store.js'
// Levantamento técnico por foto (IA com visão) — recebe UMA fotografia de imóvel e devolve
// o ambiente + descrição dos ACABAMENTOS visíveis (piso, revestimento, pedra/bancada, teto,
// esquadrias, marcenaria, louças/metais, iluminação) e o estado de conservação, em JSON.
// Usa Claude (ANTHROPIC_API_KEY). Limite por IP p/ conter custo.

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const SYSTEM = `Você é um avaliador imobiliário brasileiro especialista em ACABAMENTOS. Recebe UMA fotografia de um imóvel e faz um LEVANTAMENTO TÉCNICO do que aparece na imagem.
Identifique o ambiente e descreva os acabamentos VISÍVEIS: piso, paredes/revestimento, pedras/bancadas, teto/forro, esquadrias (janelas e portas), marcenaria/armários, louças e metais (se cozinha/banheiro), iluminação e estado de conservação.
Regras:
- Descreva SOMENTE o que dá pra ver na foto. NÃO invente material que não dá pra identificar — em dúvida, escreva "aparenta ..." ou "não identificável".
- Use os termos do mercado brasileiro: porcelanato, cerâmica, laminado, vinílico, taco/tábua de madeira, granito, mármore, quartzo, silestone, gesso/sanca, alumínio, PVC, etc.
- Seja específico e útil para um corretor: cor e formato dos pisos (ex.: porcelanato bege 60×60), tipo de bancada, se há armários planejados.
- Não cite pessoas nem dados pessoais que apareçam na imagem.
Responda SOMENTE com JSON válido (sem markdown, sem texto fora do JSON):
{"ambiente":"ex.: Cozinha","resumo":"1 parágrafo curto descrevendo os acabamentos visíveis","itens":[{"rotulo":"Piso","valor":"..."},{"rotulo":"Bancada","valor":"..."},{"rotulo":"Parede","valor":"..."},{"rotulo":"Teto","valor":"..."},{"rotulo":"Esquadrias","valor":"..."},{"rotulo":"Marcenaria","valor":"..."}],"estado":"Novo|Bem conservado|Usado|Precisa de reforma|Não identificável"}
Inclua em "itens" só os campos que dá pra ver (omita o que não aparecer).`

export async function onRequestPost({ env, request }) {
  try {
    const key = (env.ANTHROPIC_API_KEY || '').trim()
    if (!key) return json({ erro: 'config', msg: 'A análise por IA ainda não está ligada neste site (falta a chave ANTHROPIC_API_KEY na Cloudflare).' })

    // limite por IP (anti-abuso/custo): 150 fotos por hora (um levantamento usa muitas)
    const store = kvStore(env)
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:analisefoto:' + ip
    const usos = parseInt(await store.get(rlKey), 10) || 0
    if (usos >= 150) return json({ erro: 'limite', msg: 'Você analisou muitas fotos seguidas. Tente de novo daqui a pouco.' })
    await store.put(rlKey, String(usos + 1), { expirationTtl: 3600 })

    const b = await request.json().catch(() => ({}))
    const dataUrl = String(b.imagem || '')
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return json({ erro: 'imagem', msg: 'Envie uma imagem válida (JPG, PNG ou WEBP).' })
    if (m[2].length > 5200000) return json({ erro: 'grande', msg: 'Imagem muito grande. Tente uma com menos resolução.' })

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: (env.ANALISEFOTO_MODEL || 'claude-haiku-4-5'),
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: 'Faça o levantamento técnico dos acabamentos visíveis nesta foto do imóvel.' },
        ] }],
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return json({ erro: 'ia', msg: 'Falha na IA (' + r.status + '). Tente de novo.' })
    const j = await r.json()
    const txt = ((j.content || []).find((c) => c.type === 'text') || {}).text || ''
    let out = {}
    try { out = JSON.parse(txt.replace(/^```json\s*|\s*```$/g, '').trim()) } catch {}
    if (!out || (!out.resumo && !(out.itens || []).length)) return json({ erro: 'leitura', msg: 'Não consegui descrever essa foto. Tente uma imagem mais nítida.' })
    return json({ ok: true, resultado: out })
  } catch (e) {
    return json({ erro: 'interno', msg: String((e && e.message) || e).slice(0, 160) })
  }
}
