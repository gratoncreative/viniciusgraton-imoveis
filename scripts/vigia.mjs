// Vigia do site + sincronização. Roda no GitHub Actions (nuvem) — sem PC ligado.
// Checa se o site está no ar e se o catálogo da Rotina sincronizou. Avisa no WhatsApp SÓ se algo quebrar.
const SITE = (process.env.SITE_URL || 'https://viniciusgraton.com.br').replace(/\/$/, '')
const FONE = (process.env.WHATS_DESTINO || '553491570494').replace(/\D/g, '')
const CB = (process.env.CALLMEBOT_KEY || '').trim()
const problemas = []

// 1) Site no ar?
try {
  const r = await fetch(SITE + '/', { signal: AbortSignal.timeout(15000) })
  if (!r.ok) problemas.push(`site respondeu ${r.status}`)
} catch (e) { problemas.push('site fora do ar (' + e.message + ')') }

// 2) Sincronização da Rotina recente e bem-sucedida?
try {
  const r = await fetch(SITE + '/sync-status.json', { signal: AbortSignal.timeout(15000) })
  if (r.ok) {
    const s = await r.json().catch(() => null)
    if (s && s.ok === false) problemas.push('sync da Rotina falhou (' + (s.motivo || '?') + ', ' + (s.recebidos ?? '?') + ' imóveis)')
    const ger = Date.parse((s && s.geradoEm) || '') || 0
    if (ger && (Date.now() - ger) > 30 * 3600 * 1000) problemas.push('catálogo sem atualizar há ' + Math.floor((Date.now() - ger) / 3600000) + 'h')
  }
} catch { /* sync-status pode não existir em alguns deploys; não é problema crítico */ }

if (!problemas.length) { console.log('Tudo ok — site no ar e catálogo fresco.'); process.exit(0) }

const texto = '⚠️ Site VG precisa de atenção:\n- ' + problemas.join('\n- ')
console.log(texto)
if (!CB) { console.log('CALLMEBOT_KEY ausente — não enviei.'); process.exit(0) }
try {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(FONE)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(CB)}`
  const r = await fetch(url)
  console.log('CallMeBot:', r.status)
} catch (e) { console.warn('Falha ao enviar no WhatsApp:', e.message) }
