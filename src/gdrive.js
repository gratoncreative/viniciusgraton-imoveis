import { CONFIG } from './data'

// Upload pro Google Drive do próprio usuário, 100% no navegador (Google Identity
// Services + Drive REST). Escopo MÍNIMO `drive.file`: o app só enxerga/escreve nos
// arquivos e pastas que ELE cria — não vê o resto do seu Drive. O token de acesso
// vive só na memória da aba (some ao fechar) e nada passa por servidor nosso.

const SCOPE = 'https://www.googleapis.com/auth/drive.file'

let gisPromise = null
function carregarGIS() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((res, rej) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) return res()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true; s.defer = true
    s.onload = () => res(); s.onerror = () => rej(new Error('Falha ao carregar o Google.'))
    document.head.appendChild(s)
  })
  return gisPromise
}

let tokenClient = null
let _resolve = null, _reject = null
let cachedToken = null, tokenExp = 0

async function initClient() {
  await carregarGIS()
  if (!CONFIG.googleClientId) throw new Error('Google Client ID não configurado.')
  if (!window.google?.accounts?.oauth2) throw new Error('Google indisponível.')
  if (tokenClient) return tokenClient
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.googleClientId,
    scope: SCOPE,
    callback: (resp) => {
      if (resp && resp.access_token) {
        cachedToken = resp.access_token
        tokenExp = Date.now() + ((Number(resp.expires_in) || 3600) - 90) * 1000
        _resolve && _resolve(cachedToken)
      } else if (_reject) { _reject(new Error('Autorização não concluída.')) }
      _resolve = _reject = null
    },
    error_callback: (err) => { _reject && _reject(new Error((err && err.message) || 'Autorização cancelada.')); _resolve = _reject = null },
  })
  return tokenClient
}

// Devolve um access token do Drive (reaproveita enquanto válido; só pede consentimento
// quando precisa). Tem que ser chamado a partir de um clique (popup do Google).
async function obterToken() {
  if (cachedToken && Date.now() < tokenExp) return cachedToken
  const client = await initClient()
  if (_resolve) throw new Error('Já há uma autorização do Google em andamento.')
  return new Promise((res, rej) => { _resolve = res; _reject = rej; client.requestAccessToken() })
}

const _esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")

// Acha (ou cria) a pasta do app pelo nome e devolve o id. Como o escopo é drive.file,
// o files.list só retorna o que o próprio app criou — então não há colisão com pastas suas.
let folderCache = {}
async function garantirPasta(token, nome) {
  if (folderCache[nome]) return folderCache[nome]
  const q = `mimeType='application/vnd.google-apps.folder' and name='${_esc(nome)}' and trashed=false`
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=10`, { headers: { Authorization: 'Bearer ' + token } })
  if (r.ok) { const j = await r.json(); if (j.files && j.files.length) { folderCache[nome] = j.files[0].id; return j.files[0].id } }
  const c = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!c.ok) throw new Error('Não consegui criar a pasta no Drive (' + c.status + ').')
  const cj = await c.json()
  folderCache[nome] = cj.id
  return cj.id
}

// Upload RESUMÍVEL (suporta arquivos grandes) com progresso real via XHR.
function uploadResumavel(token, folderId, nome, blob, onProgress) {
  return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'application/zip' },
    body: JSON.stringify({ name: nome, parents: [folderId], mimeType: 'application/zip' }),
  }).then((init) => {
    if (!init.ok) throw new Error('Falha ao iniciar o envio (' + init.status + ').')
    const sessionUri = init.headers.get('location') || init.headers.get('Location')
    if (!sessionUri) throw new Error('O Google não devolveu a sessão de envio.')
    return new Promise((res, rej) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', sessionUri, true)
      xhr.setRequestHeader('Content-Type', 'application/zip')
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total) }
      xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { res(JSON.parse(xhr.responseText)) } catch { res({}) } } else rej(new Error('Envio falhou (' + xhr.status + ').')) }
      xhr.onerror = () => rej(new Error('Erro de rede durante o envio.'))
      xhr.send(blob)
    })
  })
}

// Fluxo completo: garante token -> garante pasta -> sobe o arquivo. onProgress(0..1).
// Devolve { id, webViewLink, folderId }. Chame a partir de um clique.
export async function subirParaDrive(nome, blob, onProgress) {
  const token = await obterToken()
  const folderId = await garantirPasta(token, CONFIG.googleDriveFolderName || 'Rotina Imóveis — Backups')
  const r = await uploadResumavel(token, folderId, nome, blob, onProgress)
  return { ...r, folderId, folderLink: `https://drive.google.com/drive/folders/${folderId}` }
}

export const driveConfigurado = () => !!CONFIG.googleClientId
