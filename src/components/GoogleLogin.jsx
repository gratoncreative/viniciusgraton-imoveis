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

export default function GoogleLogin({ onPronto, onLogin }) {
  const ref = useRef(null)
  const clientId = CONFIG.googleClientId
  const onLoginRef = useRef(onLogin)
  onLoginRef.current = onLogin

  useEffect(() => {
    if (!clientId) return
    let vivo = true
    let limparResize = () => {}
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
              // se o pai quer tratar o login (ex.: pedir o WhatsApp antes), entrega o perfil
              if (onLoginRef.current) {
                onLoginRef.current(j.perfil)
              } else {
                salvarConta({
                  token: 'g_' + j.perfil.sub,
                  nome: j.perfil.nome,
                  email: j.perfil.email,
                  foto: j.perfil.foto,
                  login: 'google',
                })
                onPronto && onPronto()
              }
            }
          } catch { /* silencioso: o cadastro manual continua disponível */ }
        },
      })
      // desenha o botão na largura do espaço disponível (sem cortar o texto),
      // limitado a 400px (máximo do Google) — re-desenha ao redimensionar
      const desenharBotao = () => {
        if (!vivo || !ref.current || !(window.google && window.google.accounts && window.google.accounts.id)) return
        const largura = Math.min(400, Math.max(240, Math.floor(ref.current.offsetWidth) || 320))
        ref.current.innerHTML = ''
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: largura,
        })
      }
      desenharBotao()
      window.addEventListener('resize', desenharBotao)
      limparResize = () => window.removeEventListener('resize', desenharBotao)
    }).catch(() => {})
    return () => { vivo = false; limparResize() }
  }, [clientId])

  if (!clientId) return null
  return (
    <div className="google-login">
      <div ref={ref} className="google-login-btn" />
      <div className="google-login-ou"><span>ou preencha seus dados</span></div>
    </div>
  )
}
