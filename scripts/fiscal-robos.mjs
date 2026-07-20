/**
 * FISCAL DOS ROBÔS — roda a cada 2 dias na nuvem (sem PC ligado).
 *
 * Os outros robôs cuidam do site; este cuida DELES. Ele responde uma pergunta:
 * "o que deveria acontecer sozinho está mesmo acontecendo?"
 *
 * Checa duas coisas, porque uma sem a outra engana:
 *   1) EXECUÇÃO  - cada robô rodou dentro do prazo dele e terminou bem?
 *                  (pela API do GitHub, olhando a última execução de cada um)
 *   2) RESULTADO - o trabalho realmente saiu? Um robô pode "passar" e não
 *                  produzir nada. Então conferimos o dado fresco no site
 *                  (catálogo sincronizado) e o arquivo de status.
 *
 * Só manda WhatsApp quando algo está fora do conforme. Silencioso quando está ok.
 */

const SITE = (process.env.SITE_URL || 'https://viniciusgraton.com.br').replace(/\/$/, '')
const FONE = (process.env.WHATS_DESTINO || '553491570494').replace(/\D/g, '')
const CB = (process.env.CALLMEBOT_KEY || '').trim()
const CRON_KEY = (process.env.BACKUP_CRON_KEY || '').trim()
const GH_TOKEN = (process.env.GITHUB_TOKEN || '').trim()
const REPO = process.env.GITHUB_REPOSITORY || 'gratoncreative/viniciusgraton-imoveis'

const H = 3600 * 1000
const agora = Date.now()

// Prazo de tolerância por robô: quanto tempo pode passar sem rodar antes de virar
// problema (o intervalo esperado + uma folga, para não alarmar por atraso bobo).
const ROBOS = [
  { arq: 'sync-rotina.yml', nome: 'Sincronizar catálogo da Rotina', prazoH: 30, critico: true },
  { arq: 'ops-brief.yml', nome: 'Briefing do dia', prazoH: 30, critico: true },
  { arq: 'backup-diario.yml', nome: 'Backup diário', prazoH: 30, critico: true },
  { arq: 'vigia.yml', nome: 'Vigia do site', prazoH: 8, critico: true },
  { arq: 'backup-fotos.yml', nome: 'Backup das fotos', prazoH: 14, critico: false },
  { arq: 'sync-blow.yml', nome: 'Sincronizar lançamentos', prazoH: 30, critico: false },
  { arq: 'captar-proprietarios.yml', nome: 'Captação de proprietários', prazoH: 30, critico: false },
  { arq: 'exporta-aicapitei.yml', nome: 'Exportar para o aicapitei', prazoH: 6, critico: false },
  { arq: 'checa-fotos.yml', nome: 'Conferir fotos quebradas', prazoH: 8 * 24, critico: false },
]

const problemas = []
const avisos = []

const horas = (ms) => Math.floor(ms / H)

// ---------- 1) execução de cada robô ----------
async function ultimaExecucao(arquivo) {
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${arquivo}/runs?per_page=1`
  const r = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(GH_TOKEN ? { authorization: `Bearer ${GH_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error('GitHub respondeu ' + r.status)
  const j = await r.json()
  return (j.workflow_runs || [])[0] || null
}

for (const robo of ROBOS) {
  try {
    const run = await ultimaExecucao(robo.arq)
    if (!run) {
      problemas.push(`${robo.nome}: nunca rodou`)
      continue
    }
    const quando = Date.parse(run.updated_at || run.created_at || '') || 0
    const idade = agora - quando
    const parado = idade > robo.prazoH * H
    const falhou = run.conclusion && run.conclusion !== 'success' && run.conclusion !== 'skipped'

    if (falhou) {
      const linha = `${robo.nome}: última execução ${run.conclusion === 'failure' ? 'FALHOU' : run.conclusion} (há ${horas(idade)}h)`
      ;(robo.critico ? problemas : avisos).push(linha)
    } else if (parado) {
      const linha = `${robo.nome}: sem rodar há ${horas(idade)}h (esperado a cada ${robo.prazoH}h)`
      ;(robo.critico ? problemas : avisos).push(linha)
    }
  } catch (e) {
    avisos.push(`${robo.nome}: não consegui verificar (${e.message})`)
  }
}

// ---------- 2) o trabalho saiu mesmo? ----------
try {
  const r = await fetch(SITE + '/sync-status.json', {
    headers: CRON_KEY ? { 'x-backup-key': CRON_KEY } : {},
    signal: AbortSignal.timeout(20000),
  })
  if (r.status === 403) {
    problemas.push('sync-status.json bloqueado para os robôs (chave dos crons não está valendo)')
  } else if (r.ok) {
    const s = await r.json().catch(() => null)
    if (s && s.ok === false) problemas.push('catálogo: última sincronização falhou (' + (s.motivo || 'motivo não informado') + ')')
    const ger = Date.parse((s && s.geradoEm) || '') || 0
    if (ger && agora - ger > 48 * H) problemas.push('catálogo sem atualizar há ' + horas(agora - ger) + 'h')
  } else {
    avisos.push('sync-status.json respondeu ' + r.status)
  }
} catch (e) {
  avisos.push('não consegui ler o sync-status (' + e.message + ')')
}

// site no ar (checagem básica, é o mínimo)
try {
  const r = await fetch(SITE + '/', { signal: AbortSignal.timeout(20000) })
  if (!r.ok) problemas.push('site respondeu ' + r.status)
} catch (e) {
  problemas.push('site fora do ar (' + e.message + ')')
}

// ---------- relatório ----------
if (!problemas.length && !avisos.length) {
  console.log('Fiscal: tudo dentro dos conformes.')
  process.exit(0)
}

const linhas = []
if (problemas.length) linhas.push('PRECISA DE ATENÇÃO:', ...problemas.map((p) => '- ' + p))
if (avisos.length) linhas.push(problemas.length ? '' : 'Pontos de atenção:', ...avisos.map((a) => '- ' + a))
const texto = '🤖 Fiscal dos robôs (VG)\n\n' + linhas.filter((l) => l !== undefined).join('\n')
console.log(texto)

// Só incomoda no WhatsApp quando há problema de verdade (aviso leve fica no log).
if (!problemas.length) {
  console.log('(só avisos leves — não vou mandar WhatsApp)')
  process.exit(0)
}
if (!CB) {
  console.log('(sem CALLMEBOT_KEY — não enviei WhatsApp)')
  process.exit(0)
}
try {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(FONE)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(CB)}`
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  console.log('WhatsApp:', r.status)
} catch (e) {
  console.log('falha ao avisar no WhatsApp:', e.message)
}
