// Envia ao IndexNow (Bing, Yandex, etc. — e ajuda o Google) as URLs que mudaram hoje.
// Roda no workflow diário, depois da sincronização. Best-effort: nunca quebra o fluxo.
import fs from 'node:fs'

const KEY = '8e3a9f1c7b4d2056e9a1f3c8b6d40792'
const SITE = 'https://viniciusgraton.com.br'
const HOST = 'viniciusgraton.com.br'

let nov = { novos: [], baixaram: [] }
try { nov = JSON.parse(fs.readFileSync('public/novidades.json', 'utf8')) } catch {}

const codes = [...new Set([...(nov.novos || []), ...(nov.baixaram || [])].map((i) => String(i.codigo)))]
const urlList = [`${SITE}/imoveis`, ...codes.map((c) => `${SITE}/imovel/${c}`)]

if (urlList.length <= 1) {
  console.log('IndexNow: sem novidades para enviar hoje.')
  process.exit(0)
}

const body = { host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urlList.slice(0, 9000) }
try {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })
  console.log(`IndexNow: HTTP ${r.status} · ${urlList.length} URLs enviadas`)
} catch (e) {
  console.warn('IndexNow falhou (ignorado):', e.message)
}
