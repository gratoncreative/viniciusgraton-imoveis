// =============================================================
//  ENGAJAMENTO — curtidas / compartilhamentos / captação de lead
//  Backend: Cloudflare Pages Function /api/eng (Workers KV).
//  Sem backend ainda? Cai num "seed" determinístico por imóvel
//  (50–90 curtidas, 50–80 shares) para o site nunca aparecer zerado.
//  Quando o KV entra no ar, os números reais e compartilhados assumem.
// =============================================================
const API = '/api/eng'

// hash determinístico (djb2) → mesmo código sempre gera o mesmo número
function hashCod(cod) {
  const s = String(cod)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}
export const seedLikes = (cod) => 50 + (hashCod(cod) % 41) // 50..90
export const seedShares = (cod) => 50 + ((hashCod(cod) >>> 5) % 31) // 50..80

// ---- estado local do visitante (o que ELE já curtiu) ----
const LSK = 'vg_curtidos'
const lidos = () => {
  try { return JSON.parse(localStorage.getItem(LSK) || '[]') } catch { return [] }
}
const grava = (arr) => {
  try { localStorage.setItem(LSK, JSON.stringify(arr)) } catch {}
}
export const jaCurtiu = (cod) => lidos().includes(String(cod))
const marcar = (cod, on) => {
  const c = String(cod)
  const arr = lidos().filter((x) => x !== c)
  if (on) arr.push(c)
  grava(arr)
}

// ---- chamadas à API (sempre tolerantes a falha) ----
export async function lerEngajamento(cod) {
  try {
    const r = await fetch(`${API}?cod=${encodeURIComponent(cod)}`)
    if (!r.ok) return null
    const d = await r.json()
    if (typeof d.likes === 'number') return d
  } catch {}
  return null
}

async function postEng(body) {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export async function alternarCurtida(cod, ligado) {
  marcar(cod, ligado)
  return postEng({ cod: String(cod), tipo: ligado ? 'like' : 'unlike' })
}
export const registrarShare = (cod) => postEng({ cod: String(cod), tipo: 'share' })
export const registrarLead = (lead) => postEng({ tipo: 'lead', ...lead })
