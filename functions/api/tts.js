/**
 * Cloudflare Pages Function — proxy TTS via ElevenLabs
 *
 *   GET /api/tts?texto=...&codigo=...
 *     -> audio/mpeg
 *
 * Variável necessária (Cloudflare → Settings → Environment variables):
 *   ELEVENLABS_KEY  → chave da API ElevenLabs  (elevenlabs.io → Profile → API Keys)
 */

const MAX_CHARS = 1800
const EL_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL' // Bella — feminina, multilingual v2
const EL_MODEL    = 'eleven_multilingual_v2'

export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url)
  const texto = (url.searchParams.get('texto') || '').trim().slice(0, MAX_CHARS)

  if (!texto) {
    return new Response('texto obrigatório', { status: 400 })
  }

  const key = env.ELEVENLABS_KEY
  if (!key) {
    return new Response('TTS não configurado', { status: 503 })
  }

  let resp
  try {
    resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: texto,
          model_id: EL_MODEL,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )
  } catch (err) {
    return new Response('Erro de rede: ' + err.message, { status: 502 })
  }

  if (!resp.ok) {
    const body = await resp.text()
    return new Response('ElevenLabs erro ' + resp.status + ': ' + body, {
      status: resp.status,
    })
  }

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=2592000',
      'Access-Control-Allow-Origin': '*',
      'X-TTS-Engine': 'elevenlabs',
    },
  })
}
