import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { IMOVEIS, getImovel, FAIXAS_PRECO, BAIRROS_IMOVEL, validarWhatsappBR, linkWhatsApp, formatarFoneBR } from '../data'
import { favoritos, registrarLead } from '../engajamento'
import { getConta, salvarConta, logout, getHistorico, estaLogado } from '../conta'
import GoogleLogin from '../components/GoogleLogin'
import LoginSenha from '../components/LoginSenha'
import { useSEO } from '../useSEO'
import { IconArrow, IconHeart, IconShield, IconWhats } from '../components/icons'

const BEN_ICN = {
  star: 'M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.3 6.8 19l1-5.8L3.6 9.2l5.8-.9z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  heart: 'M20.8 5.1a5.4 5.4 0 0 0-7.7 0L12 6.2l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7L12 21.5l8.8-8.7a5.4 5.4 0 0 0 0-7.7z',
  clock: 'M12 7v5l3 2',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  gift: 'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 8h20v4H2zM12 8v13M12 8S10.5 4 8 4a2 2 0 0 0 0 4M12 8s1.5-4 4-4a2 2 0 0 1 0 4',
}
const BenIcon = ({ name, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'clock' && <circle cx="12" cy="12" r="9" />}
    <path d={BEN_ICN[name] || BEN_ICN.star} />
  </svg>
)

const BENEFICIOS = [
  ['star', 'Seleção VIP sob medida', 'Eu separo a dedo os imóveis com a sua cara e deixo prontos na sua área - você não perde tempo garimpando.'],
  ['bell', 'Avisos em primeira mão', 'Imóvel bom voa. Você é o primeiro a saber quando entrar um no seu perfil - antes do anúncio público.'],
  ['heart', 'Favoritos na nuvem', 'Salve quantos quiser e compare com calma, de qualquer celular ou computador.'],
  ['clock', 'Continue de onde parou', 'Seu histórico fica salvo e me ajuda a acertar cada vez mais nas indicações pra você.'],
  ['bolt', 'Linha direta comigo', 'Atendimento prioritário, com o seu perfil já em mãos - sem precisar repetir tudo.'],
  ['gift', 'Guias e bônus exclusivos', 'Materiais de compra, financiamento e os melhores bairros de Uberlândia, só pra cadastrados.'],
]

const COMPARATIVO = [
  ['Imóveis que você vê', 'Só os anúncios públicos', 'Seleção exclusiva sob medida'],
  ['Seus favoritos', 'Somente neste aparelho', 'Salvos na nuvem, em qualquer lugar'],
  ['Imóveis novos', 'Você descobre depois', 'Avisado em primeira mão'],
  ['Atendimento', 'Comum', 'Prioritário, com seu perfil pronto'],
]

function CadastroView({ onPronto }) {
  const [f, setF] = useState({ nome: '', email: '', fone: '', idade: '', sexo: '', objetivo: 'Comprar para morar', bairros: '', faixa: '' })
  const [erroFone, setErroFone] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  // confirmação na prática: abre o WhatsApp do cliente com a mensagem pronta pra ELE te enviar.
  // Quando ele manda, você recebe do número real → confirma que o número é dele e já inicia a conversa.
  const confirmarNoWhats = (nome) => {
    const msg = `Olá Vinícius! Acabo de criar minha conta no seu site e preciso confirmar para liberar meu acesso. Código de ativação: #VG${Math.floor(1000 + Math.random() * 9000)} - ${nome || ''}`
    try { window.open(linkWhatsApp(msg), '_blank', 'noopener') } catch { /* ok */ }
  }
  const enviar = (e) => {
    e.preventDefault()
    if (!f.nome.trim() || !f.email.trim() || !f.fone.trim()) return
    if (!validarWhatsappBR(f.fone)) { setErroFone('Confira o WhatsApp: precisa ser DDD + número (ex.: (34) 99157-0494).'); return }
    salvarConta({ ...f })
    registrarLead({ cod: 'cadastro', nome: f.nome.trim(), fone: f.fone.trim(), objetivo: f.objetivo, origem: 'conta', bairro: `${f.bairros || 'sem bairro'} · ${f.faixa || 'faixa livre'}` })
    confirmarNoWhats(f.nome.trim())
    onPronto()
  }

  // login com Google entrega nome+e-mail; pedimos só o WhatsApp num passo curto
  const [googlePerfil, setGooglePerfil] = useState(null)
  const [gFone, setGFone] = useState('')
  const [gObj, setGObj] = useState('Comprar para morar')
  const salvarGoogle = (comFone) => {
    const p = googlePerfil
    salvarConta({ token: 'g_' + p.sub, nome: p.nome, email: p.email, foto: p.foto, login: 'google', ...(comFone ? { fone: gFone.trim(), objetivo: gObj } : {}) })
    registrarLead({ cod: 'cadastro', nome: p.nome, fone: comFone ? gFone.trim() : '', email: p.email, objetivo: comFone ? gObj : '', origem: 'conta-google' })
    if (comFone) confirmarNoWhats(p.nome)
    onPronto()
  }
  const [gErro, setGErro] = useState('')
  const concluirGoogle = (e) => {
    e.preventDefault()
    if (!validarWhatsappBR(gFone)) { setGErro('Confira o WhatsApp: precisa ser DDD + número (ex.: (34) 99157-0494).'); return }
    setGErro(''); salvarGoogle(true)
  }

  return (
    <div className="conta-cadastro">
      <div className="conta-pitch">
        <span className="eyebrow">Área exclusiva · 100% grátis</span>
        <h1 className="section-title conta-pitch-tit">Imóvel bom <em>some rápido</em>. Seja o primeiro a saber.</h1>
        <p className="section-sub" style={{ margin: '14px 0 18px' }}>
          Crie sua conta gratuita e tenha uma experiência feita pra você: uma seleção que eu separo a dedo, favoritos salvos, alertas em primeira mão e atendimento prioritário. Leva 30 segundos.
        </p>
        <div className="conta-trust-chips">
          <span>✓ Grátis pra sempre</span><span>✓ Leva 30 segundos</span><span>✓ Sem spam</span>
        </div>

        <ul className="conta-beneficios">
          {BENEFICIOS.map(([ico, t, d]) => (
            <li key={t}><span className="conta-bene-ico"><BenIcon name={ico} /></span><div><b>{t}</b><span>{d}</span></div></li>
          ))}
        </ul>

        <div className="conta-comp">
          <div className="conta-comp-head">
            <span></span><span className="conta-comp-sem">Sem conta</span><span className="conta-comp-com">Com conta</span>
          </div>
          {COMPARATIVO.map(([rot, sem, com]) => (
            <div className="conta-comp-row" key={rot}>
              <span className="conta-comp-rot">{rot}</span>
              <span className="conta-comp-sem">{sem}</span>
              <span className="conta-comp-com">{com}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="conta-direita">
      {!googlePerfil && (
        <div className="lead-form conta-form conta-login">
          <span className="conta-form-selo">Já tem conta?</span>
          <h3>Entrar na minha área</h3>
          <LoginSenha onPronto={onPronto} />
          <GoogleLogin onLogin={setGooglePerfil} onPronto={onPronto} />
        </div>
      )}
      {googlePerfil ? (
        <form className="lead-form conta-form" onSubmit={concluirGoogle}>
          <span className="conta-form-selo">Quase lá</span>
          <h3>Boa, {String(googlePerfil.nome || '').split(' ')[0]}! Falta só seu WhatsApp</h3>
          <p className="lead-note" style={{ marginTop: 0, marginBottom: 8 }}>
            Entrei com seu Google ({googlePerfil.email}). Me passa seu WhatsApp que eu te aviso em primeira mão dos imóveis com a sua cara.
          </p>
          <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={gFone} onChange={(e) => { setGFone(formatarFoneBR(e.target.value)); if (gErro) setGErro('') }} placeholder="(34) 99157-0494" required autoFocus /></label>
          {gErro && <p className="lead-erro">{gErro}</p>}
          <label><span>O que você busca?</span>
            <select value={gObj} onChange={(e) => setGObj(e.target.value)}>
              <option>Comprar para morar</option><option>Comprar para investir</option><option>Alugar</option><option>Vender meu imóvel</option><option>Só pesquisar / usar ferramentas</option>
            </select>
          </label>
          <button type="submit" className="btn btn-gold lead-submit"><IconWhats width={18} height={18} /> Concluir e confirmar no WhatsApp <IconArrow /></button>
          <p className="lead-note">Ao concluir, abro o WhatsApp pra você confirmar seu número e já falar comigo. Leva 10 segundos.</p>
        </form>
      ) : (
      <form className="lead-form conta-form" onSubmit={enviar}>
        <span className="conta-form-selo">Grátis · 30 segundos</span>
        <h3>Crie sua conta e receba os imóveis com a sua cara no e-mail</h3>
        <p className="conta-form-promessa">Todo imóvel <b>novo</b> que entrar no <b>perfil que você busca</b> chega <b>direto no seu e-mail</b>, em primeira mão - automático, sem você precisar ficar procurando.</p>
        <label><span>Nome completo *</span><input value={f.nome} onChange={set('nome')} required /></label>
        <label><span>E-mail *</span><input type="email" value={f.email} onChange={set('email')} required /></label>
        <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={f.fone} onChange={(e) => { setF((s) => ({ ...s, fone: formatarFoneBR(e.target.value) })); if (erroFone) setErroFone('') }} placeholder="(34) 99157-0494" required /></label>
        {erroFone && <p className="lead-erro">{erroFone}</p>}
        <div className="conta-form-row">
          <label><span>Idade <i>(opcional)</i></span><input inputMode="numeric" value={f.idade} onChange={set('idade')} /></label>
          <label><span>Sexo <i>(opcional)</i></span>
            <select value={f.sexo} onChange={set('sexo')}><option value="">Prefiro não dizer</option><option>Masculino</option><option>Feminino</option><option>Outro</option></select>
          </label>
        </div>
        <label><span>O que você busca?</span>
          <select value={f.objetivo} onChange={set('objetivo')}>
            <option>Comprar para morar</option><option>Comprar para investir</option><option>Alugar</option><option>Vender meu imóvel</option><option>Só pesquisar / usar ferramentas</option>
          </select>
        </label>
        <label><span>Bairros de interesse <i>(opcional)</i></span>
          <input list="bairros-dl" value={f.bairros} onChange={set('bairros')} placeholder="Ex.: Jardim Karaíba, Santa Mônica" />
          <datalist id="bairros-dl">{BAIRROS_IMOVEL.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label><span>Faixa de valor <i>(opcional)</i></span>
          <select value={f.faixa} onChange={set('faixa')}>
            <option value="">Indiferente</option>
            {FAIXAS_PRECO.map((p, i) => <option key={i} value={p.label}>{p.label}</option>)}
          </select>
        </label>
        <label className="lead-consent">
          <input type="checkbox" required />
          <span>Concordo em ser contatado e com o tratamento dos meus dados conforme a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
        </label>
        <button type="submit" className="btn btn-gold lead-submit"><IconShield width={18} height={18} /> Criar conta grátis <IconArrow /></button>
        <p className="lead-note">Ao criar, abro o WhatsApp pra você confirmar seu número e já falar comigo. Sem custo, sem spam.</p>
      </form>
      )}
      </div>
    </div>
  )
}

function PainelView({ conta, onSair }) {
  const [favs, setFavs] = useState(() => favoritos().map(getImovel).filter(Boolean))
  const hist = getHistorico().map(getImovel).filter(Boolean)
  const [selToken, setSelToken] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    const ler = () => setFavs(favoritos().map(getImovel).filter(Boolean))
    window.addEventListener('vg-fav', ler)
    return () => window.removeEventListener('vg-fav', ler)
  }, [])
  // garante uma página /cliente salva com a seleção do visitante (favoritos), que ele pode compartilhar
  useEffect(() => {
    if (!conta?.token || !conta?.fone) return
    fetch('/api/minha-selecao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: conta.token, favoritos: favoritos() }) })
      .then((r) => r.json()).then((j) => { if (j && j.token) setSelToken(j.token) }).catch(() => {})
  }, [conta?.token, favs.length])
  const linkSel = selToken ? `${window.location.origin}/cliente/${selToken}` : ''
  // seleção do perfil: tenta casar pela faixa/bairro; cai pros mais premium
  const perfil = IMOVEIS.filter((i) => {
    if (conta.bairros && i.bairro && conta.bairros.toLowerCase().includes(i.bairro.toLowerCase())) return true
    return false
  })
  const selecao = (perfil.length ? perfil : [...IMOVEIS].sort((a, b) => (b.preco || 0) - (a.preco || 0))).slice(0, 3)
  const primeiro = (conta.nome || '').trim().split(' ')[0]

  const Bloco = ({ titulo, lista, vazio }) => (
    <section className="conta-bloco">
      <h2 className="det-rel-titulo">{titulo}</h2>
      {lista.length ? (
        <div className="im-grid" style={{ perspective: '1400px' }}>{lista.map((im) => <CardImovel key={im.codigo} im={im} />)}</div>
      ) : <p className="section-sub">{vazio}</p>}
    </section>
  )

  return (
    <div className="conta-painel">
      <header className="conta-hero">
        <div>
          <span className="eyebrow">Minha área</span>
          <h1 className="section-title">Olá, <em>{primeiro || 'cliente'}</em></h1>
          <p className="section-sub" style={{ marginTop: 10 }}>
            Que bom te ver por aqui. Aqui ficam seus favoritos, seu histórico e a seleção que eu preparei pra você.
          </p>
        </div>
        <div className="conta-hero-acoes">
          <a className="btn btn-gold" href={`https://wa.me/5534991570494?text=${encodeURIComponent(`Olá Vinícius! Sou ${conta.nome || ''} e quero atendimento prioritário.`)}`} target="_blank" rel="noopener noreferrer"><IconWhats /> Atendimento prioritário</a>
          <button className="btn btn-ghost" onClick={onSair}>Sair</button>
        </div>
      </header>

      {linkSel && (
        <div className="conta-selo-link">
          <div>
            <b>Sua página de seleção</b>
            <span>Seus favoritos viram uma página só sua, com link salvo. Compartilhe com quem quiser - e o que você curtir aqui me ajuda a acertar ainda mais.</span>
          </div>
          <div className="conta-selo-acoes">
            <a className="btn btn-gold" href={linkSel}>Ver minha seleção <IconArrow /></a>
            <button type="button" className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(linkSel); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}>{copiado ? '✓ link copiado' : 'Copiar link'}</button>
          </div>
        </div>
      )}

      <Bloco titulo="Seleção que separei pra você" lista={selecao} vazio="Em breve, opções sob medida." />
      <Bloco titulo="Seus favoritos" lista={favs} vazio="Toque no coração dos imóveis que gostar para guardá-los aqui." />
      <Bloco titulo="Você visitou recentemente" lista={hist} vazio="Os imóveis que você abrir aparecem aqui para retomar de onde parou." />

      {!favs.length && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Link className="btn btn-gold" to="/imoveis">Explorar imóveis <IconArrow /></Link>
        </div>
      )}
    </div>
  )
}

export default function Conta() {
  useSEO({
    title: 'Minha área - área do cliente | Vinícius Graton',
    description: 'Crie sua conta grátis: favoritos salvos, histórico, seleção exclusiva de imóveis e atendimento prioritário com o consultor Vinícius Graton em Uberlândia.',
    path: '/conta',
    noindex: true,
  })
  const [logado, setLogado] = useState(estaLogado())
  const [conta, setConta] = useState(getConta())
  useEffect(() => {
    const ler = () => { setLogado(estaLogado()); setConta(getConta()) }
    window.addEventListener('vg-conta', ler)
    return () => window.removeEventListener('vg-conta', ler)
  }, [])

  return (
    <main className="pagina section--light det conta-pg">
      <div className="container">
        {logado && conta
          ? <PainelView conta={conta} onSair={() => { logout() }} />
          : <CadastroView onPronto={() => { setLogado(true); setConta(getConta()) }} />}
      </div>
    </main>
  )
}
