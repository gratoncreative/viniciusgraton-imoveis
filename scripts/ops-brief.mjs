// Briefing matinal no WhatsApp do Vinícius. Roda no GitHub Actions (nuvem) — sem PC ligado.
// Busca a mensagem pronta na Function /api/ops-brief (auth BACKUP_CRON_KEY) e envia via CallMeBot.
const SITE = (process.env.SITE_URL || 'https://viniciusgraton.com.br').replace(/\/$/, '')
const FONE = (process.env.WHATS_DESTINO || '553491570494').replace(/\D/g, '')
const CB = (process.env.CALLMEBOT_KEY || '').trim()
const CRON = (process.env.BACKUP_CRON_KEY || '').trim()

if (!CRON) { console.log('BACKUP_CRON_KEY ausente — abortando (sem chave, a function recusa).'); process.exit(0) }

let msg = ''
try {
  const r = await fetch(SITE + '/api/ops-brief', { method: 'POST', headers: { 'x-backup-key': CRON }, signal: AbortSignal.timeout(20000) })
  const j = await r.json().catch(() => ({}))
  if (!j.ok || !j.msg) { console.log('Function não retornou mensagem:', r.status, JSON.stringify(j).slice(0, 200)); process.exit(0) }
  msg = j.msg
  console.log('Resumo do dia:', JSON.stringify(j.resumo || {}))
} catch (e) { console.warn('Falha ao buscar o briefing:', e.message); process.exit(0) }

if (!CB) { console.log('CALLMEBOT_KEY ausente — não enviei. A mensagem seria:\n' + msg); process.exit(0) }
try {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(FONE)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(CB)}`
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  console.log('CallMeBot:', r.status, (await r.text()).slice(0, 160))
} catch (e) { console.warn('Falha ao enviar no WhatsApp:', e.message) }
