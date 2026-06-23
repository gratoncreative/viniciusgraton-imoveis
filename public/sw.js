/* Service worker do site + App do Corretor (PWA).
   Estratégia conservadora para NÃO quebrar o site público nem servir deploy velho:
   - Navegações (HTML): network-first com fallback ao app-shell em cache (offline).
   - Assets estáticos do mesmo domínio (JS/CSS/img com hash): cache-first (stale-while-revalidate).
   - /api/ e cross-origin: sempre rede, nunca cacheia.
   Troque a versão do cache a cada mudança de estratégia para forçar limpeza. */
const VERSAO = 'vg-v1'
const CACHE = `vg-cache-${VERSAO}`
const SHELL = ['/', '/app']

self.addEventListener('install', (e) => {
  // pré-cacheia o shell mínimo para o app abrir offline; ativa na hora
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // remove caches de versões antigas e assume o controle das abas abertas
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // só mexe no próprio domínio
  if (url.origin !== self.location.origin) return
  // API e analytics: sempre rede (nunca cache)
  if (url.pathname.startsWith('/api/')) return

  // Navegação (abrir página): rede primeiro; se cair, usa o app-shell em cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('/app', res.clone())).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('/app') || caches.match('/')))
    )
    return
  }

  // Assets do mesmo domínio: responde do cache e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then((cacheada) => {
      const rede = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {})
          }
          return res
        })
        .catch(() => cacheada)
      return cacheada || rede
    })
  )
})
