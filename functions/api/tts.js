/**
 * Cloudflare Pages Function — proxy Azure Cognitive Services TTS
 *
 *   GET /api/tts?texto=...
 *     -> audio/mpeg (MP3 24kHz)
 *
 * Variáveis de ambiente necessárias (Cloudflare Dashboard → Settings → Variables):
 *   AZURE_TTS_KEY    → chave do recurso Cognitive Services (Speech)
 *   AZURE_TTS_REGION → região do recurso, ex: "brazilsouth" ou "eastus"
 *
 * Sem as variáveis retorna 503 e o frontend cai no fallback (Web Speech API).
 */

const MAX_CHARS = 1800

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const texto = (url.searchParams.get('texto') || '').trim().slice(0, MAX_CHARS)

  if (!texto) return new Response('', { status: 400 })

  const key = env.AZURE_TTS_KEY
  const region = env.AZURE_TTS_REGION || 'brazilsouth'

  // Sem chave configurada → sinaliza ao frontend para usar fallback
  if (!key) return new Response('TTS não configurado', { status: 503 })

  // SSML com voz neural PT-BR feminina (Francisca) e entonação natural
  const ssml = `<speak version='1.0' xml:lang='pt-BR'>
    <voice name='pt-BR-FranciscaNeural'>
      <prosody rate='-5%' pitch='+1st'>${escapeXml(texto)}</prosody>
    </voice>
  </speak>`

  let resp
  try {
    resp = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: ssml,
      }
    )
  } catch {
    return new Response('Erro de rede', { status: 502 })
  }

  if (!resp.ok) {
    return new Response('Azure TTS falhou', { status: resp.status })
  }

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      // Cache no navegador por 1h — mesmo imóvel não regenera áudio
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
