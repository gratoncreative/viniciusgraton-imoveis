import { useEffect, useRef } from 'react'
import { CONFIG } from '../data'
import { salvarConta } from '../conta'

// Botão oficial "Entrar com Google" (Google Identity Services). Gratuito.
// Só aparece quando CONFIG.googleClientId está preenchido. Ao logar, valida o
// token no /api/google-login e cria/abre a conta com o id estável do Google.
let gisPromise = null
function carregarGIS() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((res, rej) => {
    if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.id) return res()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => res()
    s.onerror = rej
    document.head.appendChild(s)
  })
  return gisPromise
}

export default function GoogleLogin({ onPronto }) {
  const ref = useRef(null)
  const clientId = CONFIG.googleClientId

  useEffect(() => {
    if (!clientId) return
    let vivo = true
    carregarGIS().then(() => {
      if (!vivo || !(window.google && window.google.accounts && window.google.accounts.id)) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            const r = await fetch('/api/google-login', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ credential: resp.credential }),
            })
            const j = await r.json()
            if (j && j.ok && j.perfil && j.perfil.sub) {
              salvarConta({
                token: 'g_' + j.perfil.sub,
                nome: j.perfil.nome,
                email: j.perfil.email,
                foto: j.perfil.foto,
                login: 'google',
              })
              onPronto && onPronto()
            }
          } catch { /* silencioso: o cadastro manual continua disponível */ }
        },
      })
      if (ref.current) {
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left', width: 320,
        })
      }
    }).catch(() => {})
    return () => { vivo = false }
  }, [clientId])

  if (!clientId) return null
  return (
    <div className="google-login">
      <div ref={ref} className="google-login-btn" />
      <div className="google-login-ou"><span>ou preencha seus dados</span></div>
    </div>
  )
}
