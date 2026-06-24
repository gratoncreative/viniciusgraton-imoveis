import { kvStore } from '../_lib/store.js'
// Leitor de Área (IA com visão) — recebe UMA imagem (planta baixa, print de anúncio,
// lista de imóveis ou foto de cômodo) e devolve a ÁREA lida/calculada em JSON.
// Usa Claude (ANTHROPIC_API_KEY). Limite por IP p/ conter custo. Degrada com mensagem
// amigável se a chave não estiver configurada.

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const SYSTEM = `Você é um assistente imobiliário brasileiro que LÊ IMAGENS e extrai/calcula ÁREA.
A imagem pode ser: (a) uma PLANTA BAIXA com medidas dos cômodos; (b) um PRINT DE ANÚNCIO (OLX/ZAP/Imoview); (c) uma LISTA/tabela com vários imóveis; (d) uma FOTO comum de um cômodo.
Regras:
- Se for PLANTA com medidas (ex.: 3,00 x 4,20): leia largura x comprimento de CADA ambiente, calcule a área de cada um (l × c) e SOME para obter a área total. Mostre a conta.
- Se for ANÚNCIO: extraia área, quartos, suítes, banheiros, vagas, bairro, preço e o que houver.
- Se for LISTA de imóveis: calcule a MÉDIA da área (e do preço por m² se der) do conjunto.
- Se for FOTO de cômodo sem medidas: dê uma ESTIMATIVA grosseira e deixe MUITO claro que é só um chute visual.
- NUNCA invente números que não dá pra ver/derivar. Se não tiver certeza, diga.
- Toda leitura é ESTIMATIVA de apoio, não medição oficial.
Responda SOMENTE com JSON válido (sem markdown, sem texto fora do JSON):
{"tipo":"planta|anuncio|lista|foto|desconhecido","titulo":"curto","destaque":"o número principal, ex.: Área total ≈ 120 m²","linhas":[{"rotulo":"Sala","valor":"3,00 × 4,20 m = 12,6 m²"}],"resumo":"texto curto pronto para copiar","aviso":"frase curta de ressalva"}`

const PEDIDO = {
  auto: 'Identifique o tipo da imagem e faça a leitura de área conforme as regras.',
  planta: 'É uma PLANTA BAIXA. Leia as medidas de cada cômodo, calcule (largura × comprimento) e some a área total.',
  anuncio: 'É um PRINT DE ANÚNCIO. Extraia área, quartos, suítes, banheiros, vagas, bairro e preço.',
  lista: 'É uma LISTA com vários imóveis. Calcule a MÉDIA da área (e do preço por m², se possível) do conjunto.',
  foto: 'É uma FOTO de um cômodo sem medidas. Dê uma estimativa grosseira da área, deixando claro que é só um chute visual.',
}

export async function onRequestPost({ env, request }) {
  try {
    const key = (env.ANTHROPIC_API_KEY || '').trim()
    if (!key) return json({ erro: 'config', msg: 'A leitura por IA ainda não está ligada neste site (falta a chave ANTHROPIC_API_KEY na Cloudflare).' })

    // limite por IP (anti-abuso/custo): 20 leituras por hora
    const store = kvStore(env)
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'sem-ip'
    const rlKey = 'rl:lerarea:' + ip
    const usos = parseInt(await store.get(rlKey), 10) || 0
    if (usos >= 20) return json({ erro: 'limite', msg: 'Você fez muitas leituras seguidas. Tente de novo daqui a pouco.' })
    await store.put(rlKey, String(usos + 1), { expirationTtl: 3600 })

    const b = await request.json().catch(() => ({}))
    const dataUrl = String(b.imagem || '')
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return json({ erro: 'imagem', msg: 'Envie uma imagem válida (JPG, PNG ou WEBP).' })
    if (m[2].length > 5200000) return json({ erro: 'grande', msg: 'Imagem muito grande. Tente uma com menos resolução.' })
    const modo = ['auto', 'planta', 'anuncio', 'lista', 'foto'].includes(b.modo) ? b.modo : 'auto'

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: (env.LERAREA_MODEL || 'claude-haiku-4-5'),
        max_tokens: 1300,
        system: SYSTEM,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: PEDIDO[modo] },
        ] }],
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return json({ erro: 'ia', msg: 'Falha na IA (' + r.status + '). Tente de novo.' })
    const j = await r.json()
    const txt = ((j.content || []).find((c) => c.type === 'text') || {}).text || ''
    let out = {}
    try { out = JSON.parse(txt.replace(/^```json\s*|\s*```$/g, '').trim()) } catch {}
    if (!out || !out.destaque && !(out.linhas || []).length) return json({ erro: 'leitura', msg: 'Não consegui ler a área dessa imagem. Tente uma planta/print mais nítido.' })
    return json({ ok: true, resultado: out })
  } catch (e) {
    return json({ erro: 'interno', msg: String((e && e.message) || e).slice(0, 160) })
  }
}
