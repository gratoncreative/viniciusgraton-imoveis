// Avisa o Vinícius no WhatsApp depois da sincronização diária do catálogo.
// Usa o CallMeBot (gratuito). Precisa do secret CALLMEBOT_KEY no GitHub.
// Uso: node scripts/avisa-whatsapp.mjs <outcome-do-gerar> <mudou:sim|nao>
import fs from 'node:fs'

const FONE = (process.env.WHATS_DESTINO || '5534991570494').replace(/\D/g, '')
const KEY = (process.env.CALLMEBOT_KEY || '').trim()
const outcome = (process.argv[2] || 'success').trim() // success | failure (passo de geração)
const mudou = (process.argv[3] || 'nao').trim() // sim | nao (houve commit/push)

const lerJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const status = lerJson('public/sync-status.json')
const meta = lerJson('public/catalogo-meta.json') || {}
const nov = lerJson('public/novidades.json') || {}

const total = (status && status.total) || meta.total || 0
const novos = (nov.novos || []).length
const baixaram = (nov.baixaram || []).length

let msg
if (outcome === 'failure') {
  msg = '⚠️ Site Vinícius Graton — a sincronização de imóveis de hoje FALHOU (erro no processo). O site continua no ar com o catálogo anterior, nada foi perdido. Vale conferir quando puder.'
} else if (status && status.ok === false) {
  msg = `⚠️ Site Vinícius Graton — sincronização suspeita hoje: só ${status.recebidos || 0} imóveis vieram da Rotina (provável bloqueio temporário). Mantive o catálogo anterior intacto, nada foi sobrescrito.`
} else if (mudou === 'sim') {
  msg = `✅ Site Vinícius Graton atualizado hoje. Agora são ${total} imóveis no ar. ${novos} novo(s) e ${baixaram} com preço reduzido. Já aparece no catálogo, na sugestão do CRM e nas páginas dos clientes.`
} else {
  msg = `Site Vinícius Graton — sincronização do dia concluída. ${total} imóveis no ar, sem novidades hoje.`
}

if (!KEY) {
  console.log('CALLMEBOT_KEY não configurado — pulando o aviso. A mensagem seria:\n' + msg)
  process.exit(0)
}

const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(FONE)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(KEY)}`
try {
  const r = await fetch(url)
  const t = await r.text()
  console.log('CallMeBot resposta:', r.status, t.slice(0, 200))
} catch (e) {
  console.warn('Falha ao enviar WhatsApp:', e.message)
}
process.exit(0)
