import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { IMOVEIS, getImovel, FAIXAS_PRECO, BAIRROS_IMOVEL } from '../data'
import { favoritos, registrarLead } from '../engajamento'
import { getConta, salvarConta, logout, getHistorico, estaLogado } from '../conta'
import { useSEO } from '../useSEO'
import { IconArrow, IconHeart, IconShield, IconWhats } from '../components/icons'

const BENEFICIOS = [
  ['❤️', 'Favoritos salvos', 'Seus imóveis preferidos guardados e sincronizados.'],
  ['🕑', 'Histórico inteligente', 'Tudo que você visitou, curtiu e compartilhou em um só lugar.'],
  ['✨', 'Seleção exclusiva', 'Uma curadoria de imóveis que eu separo pensando no seu perfil.'],
  ['🔔', 'Avisos personalizados', 'Eu te chamo primeiro quando entrar um imóvel com a sua cara.'],
  ['⚡', 'Atendimento prioritário', 'Linha direta comigo, com o seu perfil já na mão.'],
  ['📂', 'Material exclusivo', 'Guias de compra, financiamento e bairros de Uberlândia.'],
]

function CadastroView({ onPronto }) {
  const [f, setF] = useState({ nome: '', email: '', fone: '', idade: '', sexo: '', objetivo: 'Comprar para morar', bairros: '', faixa: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const enviar = (e) => {
    e.preventDefault()
    if (!f.nome.trim() || !f.email.trim() || !f.fone.trim()) return
    salvarConta({ ...f })
    registrarLead({ cod: 'cadastro', nome: f.nome.trim(), fone: f.fone.trim(), bairro: `cadastro · ${f.objetivo} · ${f.bairros || 'sem bairro'} · ${f.faixa || 'faixa livre'}` })
    onPronto()
  }
  return (
    <div className="conta-cadastro">
      <div className="conta-pitch">
        <span className="eyebrow">Área do cliente · grátis</span>
        <h1 className="section-title">Crie sua conta e <em>desbloqueie vantagens</em></h1>
        <p className="section-sub" style={{ margin: '14px 0 26px' }}>
          Não é obrigatório — mas faz toda a diferença. Em 30 segundos você passa a ter uma experiência feita pra você.
        </p>
        <ul className="conta-beneficios">
          {BENEFICIOS.map(([ico, t, d]) => (
            <li key={t}><span className="conta-bene-ico" aria-hidden="true">{ico}</span><div><b>{t}</b><span>{d}</span></div></li>
          ))}
        </ul>
      </div>

      <form className="lead-form conta-form" onSubmit={enviar}>
        <h3>Criar minha conta</h3>
        <label><span>Nome completo *</span><input value={f.nome} onChange={set('nome')} required /></label>
        <label><span>E-mail *</span><input type="email" value={f.email} onChange={set('email')} required /></label>
        <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={f.fone} onChange={set('fone')} placeholder="(34) 9____-____" required /></label>
        <div className="conta-form-row">
          <label><span>Idade <i>(opcional)</i></span><input inputMode="numeric" value={f.idade} onChange={set('idade')} /></label>
          <label><span>Sexo <i>(opcional)</i></span>
            <select value={f.sexo} onChange={set('sexo')}><option value="">Prefiro não dizer</option><option>Masculino</option><option>Feminino</option><option>Outro</option></select>
          </label>
        </div>
        <label><span>O que você busca?</span>
          <select value={f.objetivo} onChange={set('objetivo')}>
            <option>Comprar para morar</option><option>Comprar para investir</option><option>Alugar</option><option>Vender meu imóvel</option>
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
        <p className="lead-note">Sem custo, sem spam. Você pode sair ou apagar sua conta quando quiser.</p>
      </form>
    </div>
  )
}

function PainelView({ conta, onSair }) {
  const favs = favoritos().map(getImovel).filter(Boolean)
  const hist = getHistorico().map(getImovel).filter(Boolean)
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
          <h1 className="section-title">Olá, <em>{primeiro || 'cliente'}</em> 👋</h1>
          <p className="section-sub" style={{ marginTop: 10 }}>
            Que bom te ver por aqui. Aqui ficam seus favoritos, seu histórico e a seleção que eu preparei pra você.
          </p>
        </div>
        <div className="conta-hero-acoes">
          <a className="btn btn-gold" href={`https://wa.me/5534991570494?text=${encodeURIComponent(`Olá Vinícius! Sou ${conta.nome || ''} e quero atendimento prioritário.`)}`} target="_blank" rel="noopener"><IconWhats /> Atendimento prioritário</a>
          <button className="btn btn-ghost" onClick={onSair}>Sair</button>
        </div>
      </header>

      <Bloco titulo="✨ Seleção que separei pra você" lista={selecao} vazio="Em breve, opções sob medida." />
      <Bloco titulo="❤️ Seus favoritos" lista={favs} vazio="Toque no coração dos imóveis que gostar para guardá-los aqui." />
      <Bloco titulo="🕑 Você visitou recentemente" lista={hist} vazio="Os imóveis que você abrir aparecem aqui para retomar de onde parou." />

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
    title: 'Minha área — área do cliente | Vinícius Graton',
    description: 'Crie sua conta grátis: favoritos salvos, histórico, seleção exclusiva de imóveis e atendimento prioritário com o consultor Vinícius Graton em Uberlândia.',
    path: '/conta',
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
