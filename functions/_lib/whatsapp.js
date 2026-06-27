// Envia uma mensagem no WhatsApp do Vinícius via CallMeBot (gratuito).
// Usado pelas Functions (ex.: alerta de lead quente em tempo real no eng.js).
//
// Precisa, nas variáveis do Cloudflare (Pages → Settings → Variables):
//   CALLMEBOT_KEY  → apikey do CallMeBot (a MESMA que já é secret no GitHub)
//   WHATS_DESTINO  → opcional; padrão 553491570494 (nº ativado no CallMeBot, SEM o 9º dígito)
//
// É no-op silencioso se a chave não estiver configurada — nunca quebra o fluxo principal.
export async function avisaWhats(env, msg) {
  try {
    const key = String((env && env.CALLMEBOT_KEY) || '').trim()
    if (!key || !msg) return false
    const fone = String((env && env.WHATS_DESTINO) || '553491570494').replace(/\D/g, '')
    const texto = String(msg).slice(0, 900)
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(fone)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(key)}`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return r.ok
  } catch {
    return false
  }
}
