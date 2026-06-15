/**
 * Cloudflare Pages Function — TTS via ElevenLabs (primário) ou Azure (fallback)
 *
 *   GET /api/tts?texto=...&codigo=...
 *     -> audio/mpeg
 *
 * Variável necessária (Cloudflare → Settings → Environment variables):
 *   ELEVENLABS_KEY  → chave da API ElevenLabs  (elevenlabs.io → Profile → API Keys)
 *
 * Opcional (para manter compatibilidade se Azure for configurado depois):
 *   AZURE_TTS_KEY    → chave Azure Cognitive Services Speech
 *   AZURE_TTS_REGION → região Azure (padrão: "brazilsouth")
 *
 * Cache: cada texto é gerado UMA vez e cacheado por 30 dias no edge da
 * Cloudflare. Requisições subsequentes do mesmo imóvel não consomem quota.
 */

const MAX_CHARS = 1800
// Voz ElevenLabs: Bella — feminina, calorosa, excelente em PT-BR com multilingual v2
const EL_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const EL_MODEL = 'eleven_multilingual_v2'

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context
  const url = new URL(request.url)
  const texto = (url.searchParams.get('texto') || '').trim().slice(0, MAX_CHARS)
  const codigo = url.searchParams.get('codigo') || 'x'

  if (!texto) return new Response('', { status: 400 })

  // ── Tentar cache no edge Cloudflare ─────────────────────────────────────
  const cacheUrl = new URL(request.url)
  cacheUrl.pathname = `/tts-cache/${codigo}`
  cacheUrl.search = ''
  const cacheKey = new Request(cacheUrl.toString())

  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  // ── ElevenLabs ──────────────────────────────────────────────────────────
  const elKey = env.ELEVENLABS_KEY
  if (elKey) {
    const resp = await fetchElevenLabs(texto, elKey)
    if (resp.ok) {
      const audio = new Response(resp.body, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=2592000', // 30 dias
          'Access-Control-Allow-Origin': '*',
          'X-TTS-Engine': 'elevenlabs',
        },
      })
      waitUntil(caches.default.put(cacheKey, audio.clone()))
      return audio
    }
  }

  // ── Azure (fallback, se configurado) ────────────────────────────────────
  const azKey = env.AZURE_TTS_KEY
  const azRegion = env.AZURE_TTS_REGION || 'brazilsouth'
  if (azKey) {
    const resp = await fetchAzure(texto, azKey, azRegion)
    if (resp.ok) {
      const audio = new Response(resp.body, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=2592000',
          'Access-Control-Allow-Origin': '*',
          'X-TTS-Engine': 'azure',
        },
      })
      waitUntil(caches.default.put(cacheKey, audio.clone()))
      return audio
    }
  }

  // Nenhuma chave configurada → frontend cai no Web Speech
  return new Response('TTS não configurado', { status: 503 })
}

async function fetchElevenLabs(texto, key) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: texto,
      model_id: EL_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.0, use_speaker_boost: true },
    }),
  }).catch(() => ({ ok: false }))
}

async function fetchAzure(texto, key, region) {
  const ssml = `<speak version='1.0' xml:lang='pt-BR'><voice name='pt-BR-FranciscaNeural'><prosody rate='-5%' pitch='+1st'>${escapeXml(texto)}</prosody></voice></speak>`
  return fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
  }).catch(() => ({ ok: false }))
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
