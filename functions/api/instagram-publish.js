/**
 * POST /api/instagram-publish
 *
 * Publica uma imagem no Instagram Business via Graph API.
 *
 * CONFIGURAÇÃO (Cloudflare env vars obrigatórias):
 *   INSTAGRAM_TOKEN    — access token de longa duração (60 dias, renovar antes de expirar)
 *   INSTAGRAM_USER_ID  — ID numérico do usuário Instagram Business (ex.: "17841412345678901")
 *   ADMIN_TOKEN        — mesmo token do painel admin (verifica quem pode publicar)
 *   KV                 — binding KV para armazenamento temporário da imagem
 *
 * COMO OBTER O TOKEN (fazer UMA VEZ):
 *   1. Criar App em developers.facebook.com (tipo "Business")
 *   2. Adicionar produto "Instagram Graph API"
 *   3. Conectar a Page do Facebook à conta Instagram Business
 *   4. Gerar token de usuário com permissões: instagram_basic, instagram_content_publish, pages_read_engagement
 *   5. Trocar por token de longa duração (60 dias) via GET /oauth/access_token?grant_type=fb_exchange_token
 *   6. Salvar em INSTAGRAM_TOKEN na Cloudflare
 *
 * BODY esperado:
 *   { token: string, imageData: string (base64 PNG), caption: string }
 *
 * RESPOSTA:
 *   { ok: true, postId: string } | { ok: false, error: string }
 */

export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const { token, imageData, caption } = await request.json()

    // 1. Verifica admin token
    if (!token || !env.ADMIN_TOKEN) return new Response(JSON.stringify({ ok: false, error: 'Token inválido' }), { status: 401, headers: cors })
    const tokenOk = await verificarToken(token, env)
    if (!tokenOk) return new Response(JSON.stringify({ ok: false, error: 'Não autorizado' }), { status: 401, headers: cors })

    // 2. Verifica variáveis necessárias
    if (!env.INSTAGRAM_TOKEN || !env.INSTAGRAM_USER_ID) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Configure INSTAGRAM_TOKEN e INSTAGRAM_USER_ID nas variáveis de ambiente da Cloudflare.',
      }), { status: 500, headers: cors })
    }

    // 3. Salva imagem temporariamente no KV (expira em 1h)
    const tempKey = `ig_tmp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const imgBytes = base64ToUint8Array(imageData.replace(/^data:image\/\w+;base64,/, ''))
    await env.KV.put(tempKey, imgBytes, { expirationTtl: 3600, metadata: { ct: 'image/png' } })

    // 4. URL pública da imagem temporária
    const host = new URL(request.url).origin
    const imageUrl = `${host}/api/instagram-img?k=${tempKey}`

    // 5. Cria media container no Instagram
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.INSTAGRAM_USER_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption || '',
          access_token: env.INSTAGRAM_TOKEN,
        }),
      }
    )
    const container = await containerRes.json()
    if (!container.id) {
      return new Response(JSON.stringify({ ok: false, error: container.error?.message || 'Erro ao criar container' }), { status: 400, headers: cors })
    }

    // 6. Aguarda processamento (Instagram processa assincronamente)
    await aguardarContainer(container.id, env.INSTAGRAM_TOKEN)

    // 7. Publica
    const pubRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.INSTAGRAM_USER_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: env.INSTAGRAM_TOKEN }),
      }
    )
    const pub = await pubRes.json()
    if (!pub.id) {
      return new Response(JSON.stringify({ ok: false, error: pub.error?.message || 'Erro ao publicar' }), { status: 400, headers: cors })
    }

    // 8. Remove imagem temporária do KV
    await env.KV.delete(tempKey).catch(() => {})

    return new Response(JSON.stringify({ ok: true, postId: pub.id }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function verificarToken(token, env) {
  try {
    const stored = await env.KV.get('admin:auth', 'json')
    if (!stored) return token === env.ADMIN_PASS
    const [salt, hash] = stored.hash.split(':')
    const enc = new TextEncoder()
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(token), { name: 'PBKDF2' }, false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations: 100000, hash: 'SHA-256' }, keyMat, 256)
    const derived = bytesToHex(new Uint8Array(bits))
    return derived === hash
  } catch { return false }
}

async function aguardarContainer(id, token, tentativas = 6) {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=status_code&access_token=${token}`)
    const d = await r.json()
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error('Container com erro no Instagram')
    await new Promise((res) => setTimeout(res, 2000))
  }
  return true
}

function base64ToUint8Array(b64) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr
}

function bytesToHex(arr) {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}
