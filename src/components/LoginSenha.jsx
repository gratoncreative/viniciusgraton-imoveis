import { useState } from 'react'
import { salvarConta } from '../conta'

// Login do cliente por e-mail + senha (além do Google e do cadastro).
const MSG = {
  'nao-encontrado': 'E-mail não encontrado. Se é sua 1ª vez, clique em "Criar senha".',
  'senha-errada': 'Senha incorreta. Tente de novo.',
  'ja-existe': 'Esse e-mail já tem senha. Use "Entrar".',
  'email-invalido': 'E-mail inválido.',
  'senha-curta': 'A senha precisa ter ao menos 6 caracteres.',
  'muitas-tentativas': 'Muitas tentativas. Aguarde alguns minutos.',
  'indisponivel': 'Login indisponível no momento.',
}

export default function LoginSenha({ onPronto }) {
  const [modo, setModo] = useState('entrar') // entrar | criar
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)

  const enviar = async (e) => {
    e.preventDefault(); setErro(''); setLoad(true)
    try {
      const r = await fetch('/api/auth', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: modo === 'criar' ? 'cadastrar' : 'login', email: email.trim(), senha, nome: nome.trim() }),
      })
      const j = await r.json()
      if (j && j.ok) {
        salvarConta({ token: j.token, nome: j.nome || nome.trim(), email: j.email || email.trim(), login: 'senha' })
        onPronto && onPronto(); return
      }
      setErro(MSG[j && j.error] || 'Não consegui agora. Tente de novo.')
    } catch { setErro('Falha de conexão. Tente de novo.') }
    setLoad(false)
  }

  return (
    <form className="login-senha" onSubmit={enviar}>
      <div className="login-senha-tabs">
        <button type="button" className={modo === 'entrar' ? 'on' : ''} onClick={() => { setModo('entrar'); setErro('') }}>Entrar</button>
        <button type="button" className={modo === 'criar' ? 'on' : ''} onClick={() => { setModo('criar'); setErro('') }}>Criar senha</button>
      </div>
      {modo === 'criar' && <input type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />}
      <input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <input type="password" placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />
      {erro && <p className="lead-erro" style={{ margin: 0 }}>{erro}</p>}
      <button type="submit" className="btn btn-gold" disabled={load}>{load ? 'Aguarde…' : modo === 'criar' ? 'Criar conta e entrar' : 'Entrar'}</button>
      {modo === 'entrar' && <p className="login-senha-dica">Primeira vez aqui ou nunca criou senha? Toque em <b>“Criar senha”</b> acima.</p>}
    </form>
  )
}
