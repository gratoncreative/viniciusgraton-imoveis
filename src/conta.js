// =============================================================
//  CONTA DO CLIENTE — área do cliente (local-first + sync no KV)
//  Cadastro gratuito, não obrigatório. Guarda perfil, favoritos e
//  histórico no navegador e sincroniza no backend (/api/conta) para
//  o Vinícius acompanhar o lead e o cliente recuperar em outro aparelho.
// =============================================================
const KEY = 'vg_conta'
const HIST = 'vg_historico'

const ler = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || fb) } catch { return JSON.parse(fb) } }

// token forte (criptográfico) — substitui Math.random (adivinhável). ~122 bits de entropia.
function tokenSeguro() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
    const a = new Uint8Array(16); crypto.getRandomValues(a)
    return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
}

export function getConta() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export function estaLogado() { return !!getConta() }

export function getHistorico() { return ler(HIST, '[]') }
const favsLocais = () => ler('vg_curtidos', '[]')

async function sincronizar(conta) {
  if (!conta || !conta.token) return
  try {
    await fetch('/api/conta', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: conta.token, nome: conta.nome, email: conta.email, fone: conta.fone,
        idade: conta.idade, sexo: conta.sexo, objetivo: conta.objetivo,
        bairros: conta.bairros, faixa: conta.faixa,
        favoritos: favsLocais(), historico: getHistorico(),
      }),
    })
  } catch {}
}

export function salvarConta(dados) {
  const atual = getConta() || {}
  const conta = { ...atual, ...dados }
  if (!conta.token) conta.token = 'vg_' + tokenSeguro()
  if (!conta.criadoEm) conta.criadoEm = Date.now()
  try { localStorage.setItem(KEY, JSON.stringify(conta)) } catch {}
  try { window.dispatchEvent(new Event('vg-conta')) } catch {}
  sincronizar(conta)
  return conta
}

export function logout() {
  try { localStorage.removeItem(KEY) } catch {}
  try { window.dispatchEvent(new Event('vg-conta')) } catch {}
}

// histórico de imóveis visitados (códigos; mais recente primeiro; máx 30)
export function registrarVisita(cod) {
  cod = String(cod)
  let h = getHistorico().filter((x) => x !== cod)
  h.unshift(cod)
  h = h.slice(0, 30)
  try { localStorage.setItem(HIST, JSON.stringify(h)) } catch {}
  const conta = getConta()
  if (conta) sincronizar({ ...conta })
  return h
}
