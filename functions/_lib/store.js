/**
 * Camada de armazenamento unificada — D1 (quando bindado) com fallback para KV.
 *
 * Por quê: o Workers KV (free) tem teto de ~1.000 GRAVAÇÕES/dia. O Cloudflare D1
 * (free) dá 100.000 gravações/dia. Esta facade expõe a MESMA interface do KV
 * (get/put/list/delete), então o código existente só precisa trocar
 * `env.ENGAGEMENT` por esta store — uma linha por handler:
 *
 *     env = { ...env, ENGAGEMENT: kvStore(env) }
 *
 * Regras de segurança (por isso é seguro fazer deploy ANTES de criar o D1):
 *  - Sem `env.DB` (D1 não bindado ainda) → usa o KV puro (comportamento atual).
 *  - Valor binário (ArrayBuffer/stream) ou string grande (>900KB) → vai pro KV
 *    (D1 é pra dados pequenos e frequentes; imagens ficam no KV).
 *  - Qualquer erro no D1 em runtime → cai no KV. Nunca derruba o site.
 *  - LEITURA: tenta D1; se não achar a chave, lê o KV (dados legados continuam
 *    acessíveis sem migração). LIST: mescla D1 + KV (D1 vence em duplicadas).
 */

const _ensured = new WeakSet() // por isolate: tabela já garantida para um dado DB

async function ensure(db) {
  if (_ensured.has(db)) return
  try {
    await db.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, meta TEXT, exp INTEGER)')
  } catch {
    // fallback p/ ambientes onde exec não aceita esse formato
    await db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, meta TEXT, exp INTEGER)').run()
  }
  _ensured.add(db)
}

const parse = (s) => { try { return JSON.parse(s) } catch { return null } }
const wantJson = (type) => type === 'json' || (type && type.type === 'json')

export function kvStore(env) {
  const db = env && env.DB && typeof env.DB.prepare === 'function' ? env.DB : null
  const kv = env && env.ENGAGEMENT && typeof env.ENGAGEMENT.get === 'function' ? env.ENGAGEMENT : null

  // Sem D1: devolve o próprio KV (zero overhead, comportamento idêntico ao de hoje).
  if (!db) return kv || nullStore()

  const now = () => Date.now()

  return {
    async get(key, type) {
      try {
        await ensure(db)
        const row = await db.prepare('SELECT v, exp FROM kv WHERE k = ?').bind(key).first()
        if (row && (row.exp == null || row.exp > now())) {
          return wantJson(type) ? parse(row.v) : row.v
        }
        // miss no D1 → tenta o KV legado (leitura barata, cota enorme)
        if (kv) return await kv.get(key, type)
        return null
      } catch {
        if (kv) { try { return await kv.get(key, type) } catch {} }
        return null
      }
    },

    async put(key, value, opts) {
      // binário ou valor grande → KV (D1 = dados pequenos e frequentes; imagens no KV)
      const ehString = typeof value === 'string'
      if (!ehString || value.length > 900000) {
        if (kv) return kv.put(key, value, opts)
      }
      try {
        await ensure(db)
        const exp = opts && opts.expirationTtl ? now() + Number(opts.expirationTtl) * 1000 : null
        const meta = opts && opts.metadata ? JSON.stringify(opts.metadata) : null
        const v = ehString ? value : String(value)
        await db.prepare(
          'INSERT INTO kv (k, v, meta, exp) VALUES (?1, ?2, ?3, ?4) ' +
          'ON CONFLICT(k) DO UPDATE SET v=?2, meta=?3, exp=?4'
        ).bind(key, v, meta, exp).run()
        return
      } catch {
        if (kv) return kv.put(key, value, opts) // D1 falhou → não perde a gravação
      }
    },

    async delete(key) {
      try { await ensure(db); await db.prepare('DELETE FROM kv WHERE k = ?').bind(key).run() } catch {}
      if (kv) { try { await kv.delete(key) } catch {} } // limpa o legado também
    },

    async list(opts) {
      const prefix = (opts && opts.prefix) || ''
      let keys = []
      try {
        await ensure(db)
        const res = await db.prepare('SELECT k, meta, exp FROM kv WHERE k LIKE ?').bind(prefix.replace(/([%_])/g, '\\$1') + '%').all()
        const t = now()
        keys = (res.results || [])
          .filter((r) => r.exp == null || r.exp > t)
          .map((r) => ({ name: r.k, metadata: r.meta ? parse(r.meta) : undefined }))
      } catch {}
      // mescla com o KV legado (chaves ainda não regravadas no D1)
      if (kv) {
        try {
          const lk = await kv.list({ prefix })
          const have = new Set(keys.map((k) => k.name))
          for (const k of (lk.keys || [])) if (!have.has(k.name)) keys.push({ name: k.name, metadata: k.metadata })
        } catch {}
      }
      return { keys, list_complete: true }
    },

    // LEITURA EM LOTE (chave + valor) — pega TUDO do D1 em 1 query e lê do KV só as
    // chaves legadas que ainda não estão no D1. Evita o "D1 miss + KV get" por chave
    // (que dobrava os subrequests e estourava o limite do Cloudflare na ação 'data').
    async entries(opts) {
      const prefix = (opts && opts.prefix) || ''
      const map = new Map() // name -> { name, value, metadata }
      try {
        await ensure(db)
        const res = await db.prepare('SELECT k, v, meta, exp FROM kv WHERE k LIKE ?').bind(prefix.replace(/([%_])/g, '\\$1') + '%').all()
        const t = now()
        for (const r of (res.results || [])) {
          if (r.exp != null && r.exp <= t) continue
          map.set(r.k, { name: r.k, value: parse(r.v), metadata: r.meta ? parse(r.meta) : undefined })
        }
      } catch {}
      if (kv) {
        try {
          const lk = await kv.list({ prefix })
          const faltam = (lk.keys || []).filter((k) => !map.has(k.name))
          const vals = await Promise.all(faltam.map((k) => kv.get(k.name, 'json').then((v) => ({ k, v })).catch(() => ({ k, v: null }))))
          for (const { k, v } of vals) if (v != null) map.set(k.name, { name: k.name, value: v, metadata: k.metadata })
        } catch {}
      }
      return [...map.values()]
    },
  }
}

function nullStore() {
  return {
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true }),
  }
}
