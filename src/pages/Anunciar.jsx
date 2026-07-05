import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CampoMoeda from '../components/CampoMoeda'
import { CONFIG } from '../data'
import { formatBRL } from '../extenso'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconShield, IconClose } from '../components/icons'
import '../styles/converter.css'
import '../styles/detalhe.css'
import '../styles/anunciar.css'
import '../styles/lead.css'
import '../styles/aviseme.css'

const FINALIDADES = ['Vender', 'Alugar']
const TIPOS = ['Casa', 'Apartamento', 'Casa em condomínio', 'Terreno / lote', 'Comercial', 'Rural / chácara', 'Outro']

// comprime a imagem no navegador (máx 1600px, JPEG 0.85) — alta resolução, porém leve
const comprimir = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const max = 1600
      let { width, height } = img
      if (width > max || height > max) {
        if (width >= height) { height = Math.round((height * max) / width); width = max }
        else { width = Math.round((width * max) / height); height = max }
      }
      const cv = document.createElement('canvas')
      cv.width = width; cv.height = height
      cv.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(cv.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(null)
    img.src = reader.result
  }
  reader.onerror = () => resolve(null)
  reader.readAsDataURL(file)
})

const FONE_PLACA = '(34) 99157-0494'
const PLACA_MODELOS = [
  { id: 'classica', nome: 'Clássica', desc: 'Branca, leitura fácil de longe.' },
  { id: 'premium', nome: 'Premium dourada', desc: 'Sofisticada, ar de alto padrão.' },
  { id: 'minimal', nome: 'Minimalista', desc: 'Clean e moderna.' },
]
const PLACA_TAMANHOS = [
  { id: 'p', nome: 'Pequena', dim: '40 × 30 cm' },
  { id: 'media', nome: 'Média', dim: '60 × 40 cm' },
  { id: 'g', nome: 'Grande', dim: '80 × 60 cm' },
]
const PlacaPreview = ({ modelo }) => {
  if (modelo === 'premium') return (
    <svg viewBox="0 0 200 130" className="placa-svg" aria-hidden="true">
      <rect x="3" y="3" width="194" height="124" rx="8" fill="#212b3d" stroke="#b8862f" strokeWidth="2" />
      <rect x="13" y="13" width="174" height="104" rx="5" fill="none" stroke="#3a3322" />
      <text x="100" y="50" textAnchor="middle" fontFamily="Arial" fontSize="30" fontWeight="800" fill="#e0b556" letterSpacing="1">VENDE-SE</text>
      <line x1="55" y1="64" x2="145" y2="64" stroke="#b8862f" strokeWidth="1.5" />
      <text x="100" y="86" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15" fill="#f4f1e8">Vinícius Graton</text>
      <text x="100" y="106" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="#aab2c0">WhatsApp {FONE_PLACA}</text>
    </svg>
  )
  if (modelo === 'minimal') return (
    <svg viewBox="0 0 200 130" className="placa-svg" aria-hidden="true">
      <rect x="3" y="3" width="194" height="124" rx="8" fill="#f4f1e8" stroke="#d9c9a0" strokeWidth="2" />
      <text x="100" y="60" textAnchor="middle" fontFamily="Arial" fontSize="33" fontWeight="800" fill="#212b3d" letterSpacing="1">VENDE-SE</text>
      <line x1="70" y1="72" x2="130" y2="72" stroke="#b8862f" strokeWidth="3" />
      <text x="100" y="99" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="#3a4150">Vinícius Graton · {FONE_PLACA}</text>
    </svg>
  )
  return (
    <svg viewBox="0 0 200 130" className="placa-svg" aria-hidden="true">
      <rect x="3" y="3" width="194" height="124" rx="8" fill="#fff" stroke="#b8862f" strokeWidth="2" />
      <path d="M3 11a8 8 0 0 1 8-8h178a8 8 0 0 1 8 8v26H3z" fill="#b8862f" />
      <text x="100" y="28" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="800" fill="#fff" letterSpacing="1">VENDE-SE</text>
      <text x="100" y="68" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="16" fill="#212b3d">Vinícius Graton</text>
      <text x="100" y="86" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#5a616e" letterSpacing="1">CONSULTOR DE IMÓVEIS · UBERLÂNDIA</text>
      <text x="100" y="110" textAnchor="middle" fontFamily="Arial" fontSize="14" fontWeight="700" fill="#b8862f">WhatsApp {FONE_PLACA}</text>
    </svg>
  )
}

// imagem do hero (casa de alto padrão) e ícones dos passos
const ANU_HERO = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop'
const PASSOS = [
  { d: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z', titulo: 'Cadastre em 2 minutos', txt: 'Preencha os dados e mande as fotos aqui mesmo. Sem custo e sem compromisso.' },
  { d: 'M4 20V4M4 20h16M8 20v-7M13 20V9M18 20v-4', titulo: 'Eu avalio o valor justo', txt: 'Faço a avaliação real pelo mercado do seu bairro - preço certo pra vender no tempo certo.' },
  { d: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14', titulo: 'Divulgo pra vender', txt: 'No site, nas redes e direto pros clientes que já procuram um imóvel como o seu.' },
  { d: 'M12 2l8 4v5c0 5-3.5 9-8 11-4.5-2-8-6-8-11V6l8-4zM9 12l2 2 4-4', titulo: 'Cuido até as chaves', txt: 'Negociação e documentação conferidas, com a estrutura da Rotina Imobiliária.' },
]
const STATS = [
  { n: 'Grátis', l: 'cadastrar e avaliar' },
  { n: 'Fotos', l: 'e divulgação inclusas' },
  { n: 'Placa', l: 'VENDE-SE sem custo' },
  { n: 'Direto', l: 'atendimento comigo' },
]
const PIco = ({ d }) => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

export default function Anunciar() {
  useSEO({
    title: 'Anuncie seu imóvel em Uberlândia - cadastre com o Vinícius Graton',
    description: 'Quer vender ou alugar seu imóvel em Uberlândia? Cadastre aqui com fotos e detalhes. Eu avalio, faço a curadoria e cuido da divulgação e da venda com segurança.',
    path: '/anunciar',
  })

  const [f, setF] = useState({
    nome: '', fone: '', email: '', finalidade: 'Vender', tipo: 'Casa', bairro: '', endereco: '',
    preco: 0, quartos: '', suites: '', vagas: '', area: '', condominio: 0, iptu: '', descricao: '',
  })
  const [fotos, setFotos] = useState([])
  const [placa, setPlaca] = useState({ quer: true })
  const [consent, setConsent] = useState(false)
  const placaTxt = placa.quer ? 'Sim, quero a placa VENDE-SE (grátis)' : 'Não, por enquanto'
  const [estado, setEstado] = useState('idle') // idle | enviando | ok | erro
  const [validMsg, setValidMsg] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setNum = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const addFotos = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    const novas = []
    for (const file of files) {
      if (fotos.length + novas.length >= 15) break
      const d = await comprimir(file)
      if (d) novas.push(d)
    }
    setFotos((prev) => [...prev, ...novas].slice(0, 15))
  }
  const removeFoto = (i) => setFotos((prev) => prev.filter((_, n) => n !== i))

  const enviar = async (e) => {
    e.preventDefault()
    if (!f.nome.trim() || !f.fone.trim()) { setValidMsg('Preencha seu nome e WhatsApp para eu te enviar a avaliação.'); return }
    if (!f.bairro.trim()) { setValidMsg('Informe ao menos o bairro do imóvel - preciso dele para avaliar.'); return }
    if (!consent) { setValidMsg('Marque o consentimento para eu poder entrar em contato.'); return }
    setValidMsg('')
    setEstado('enviando')
    const payload = {
      ...f,
      preco: f.preco ? formatBRL(f.preco) : '',
      condominio: f.condominio ? formatBRL(f.condominio) : '',
      fotos,
      placa: placaTxt,
    }
    try {
      const r = await fetch('/api/anuncio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error('falha')
      setEstado('ok')
      const resumo = `${f.tipo} para ${f.finalidade.toLowerCase()} em ${f.bairro || 'Uberlândia'}${f.preco ? ` - ${formatBRL(f.preco)}` : ''}`
      const msg = `Olá Vinícius! Acabei de cadastrar meu imóvel no site para avaliação: ${resumo}. Enviei ${fotos.length} foto(s) e os detalhes completos. Placa VENDE-SE: ${placaTxt}. Meu nome é ${f.nome.trim()}, WhatsApp ${f.fone.trim()}.`
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    } catch {
      setEstado('erro')
    }
  }

  if (estado === 'ok') {
    return (
      <main className="pagina section--light det">
        <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
          <span className="aviseme-ico" style={{ margin: '0 auto 18px' }}><IconWhats width={28} height={28} /></span>
          <h1 className="section-title">Recebido, {f.nome.trim().split(' ')[0]}!</h1>
          <p className="section-sub" style={{ margin: '16px auto 20px' }}>
            Seu imóvel entrou para <b>avaliação</b>. Eu analiso as informações e as fotos com cuidado e, se for um imóvel
            com o padrão de qualidade que entrego aos meus clientes, faço a curadoria e cuido da divulgação. Já abri o
            WhatsApp pra gente conversar.
          </p>
          <p className="section-sub" style={{ margin: '0 auto 28px' }}>
            Aprovado, seu imóvel também <b>pode ser cadastrado e divulgado no site da Rotina Imobiliária</b> -
            mais de 30 anos de mercado em Uberlândia - e em portais parceiros, ampliando o alcance e a credibilidade do seu anúncio.
          </p>
          <Link className="btn btn-gold" to="/">Voltar ao início <IconArrow /></Link>
          <div className="anu-parceria">
            <span>Consultor na</span>
            <img src="/rotina-logo.png" alt="Rotina Imobiliária" loading="lazy" />
          </div>
        </div>
      </main>
    )
  }

  const check = <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>

  return (
    <main className="anunciar-pg2 section--light">
      <div className="container anunciar-corpo">
        {/* FORMULÁRIO — em destaque, logo no topo */}
        <div id="cadastrar" className="anu-form-wrap">
          <Reveal>
            <div className="anu-sec-head">
              <span className="eyebrow" style={{ justifyContent: 'center' }}>É rápido</span>
              <h2 className="section-title">Cadastre seu imóvel</h2>
              <p className="section-sub" style={{ marginTop: 12 }}>Preencha os dados e mande as fotos. <b>Cadastrar é grátis e sem compromisso.</b></p>
              <p className="section-sub" style={{ marginTop: 10 }}>Além daqui, imóveis selecionados também <b>podem ser publicados</b> no <b>site da Rotina Imobiliária</b> e em portais parceiros como <b>Chaves na Mão</b> e <b>Grupo OLX</b>, com <b>possibilidade de impulsionamento</b> para alcançar mais compradores.</p>
            </div>
          </Reveal>

        <form className="lead-form anunciar-form" onSubmit={enviar}>
          <fieldset className="anu-grupo">
            <legend className="anu-grupo-tit"><span className="anu-grupo-n">1</span> Seus dados <i>- pra eu te retornar</i></legend>
            <div className="anunciar-grid">
              <label><span>Seu nome *</span><input value={f.nome} onChange={set('nome')} required /></label>
              <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={f.fone} onChange={set('fone')} placeholder="(34) 9____-____" required /></label>
              <label className="anunciar-full"><span>E-mail <i>(opcional)</i></span><input type="email" value={f.email} onChange={set('email')} placeholder="voce@email.com" /></label>
            </div>
          </fieldset>

          <fieldset className="anu-grupo">
            <legend className="anu-grupo-tit"><span className="anu-grupo-n">2</span> Sobre o imóvel</legend>
            <div className="anunciar-grid">
              <label><span>Finalidade</span><select value={f.finalidade} onChange={set('finalidade')}>{FINALIDADES.map((o) => <option key={o}>{o}</option>)}</select></label>
              <label><span>Tipo de imóvel</span><select value={f.tipo} onChange={set('tipo')}>{TIPOS.map((o) => <option key={o}>{o}</option>)}</select></label>
              <label><span>Bairro</span><input value={f.bairro} onChange={set('bairro')} placeholder="Ex.: Santa Mônica" /></label>
              <label><span>Área (m²)</span><input inputMode="numeric" value={f.area} onChange={set('area')} placeholder="Ex.: 120" /></label>
              <label className="anunciar-full"><span>Endereço <i>(rua e número - fica só comigo)</i></span><input value={f.endereco} onChange={set('endereco')} /></label>
            </div>
            <div className="anu-mini-grid">
              <label><span>Quartos</span><input inputMode="numeric" value={f.quartos} onChange={set('quartos')} placeholder="0" /></label>
              <label><span>Suítes</span><input inputMode="numeric" value={f.suites} onChange={set('suites')} placeholder="0" /></label>
              <label><span>Vagas</span><input inputMode="numeric" value={f.vagas} onChange={set('vagas')} placeholder="0" /></label>
            </div>
          </fieldset>

          <fieldset className="anu-grupo">
            <legend className="anu-grupo-tit"><span className="anu-grupo-n">3</span> Valores</legend>
            <div className="anunciar-grid">
              <CampoMoeda label="Valor pretendido" valor={f.preco} onChange={setNum('preco')} />
              <CampoMoeda label="Condomínio (se houver)" valor={f.condominio} onChange={setNum('condominio')} />
              <label className="anunciar-full"><span>IPTU <i>(anual, opcional)</i></span><input value={f.iptu} onChange={set('iptu')} placeholder="Ex.: R$1.200/ano" /></label>
            </div>
          </fieldset>

          <fieldset className="anu-grupo">
            <legend className="anu-grupo-tit"><span className="anu-grupo-n">4</span> Conte os diferenciais</legend>
            <div className="anunciar-grid">
              <label className="anunciar-full"><span>Descrição <i>(reforma, sol da manhã, andar alto, vista...)</i></span><textarea rows="3" value={f.descricao} onChange={set('descricao')} placeholder="O que faz seu imóvel valer a pena? Escreva à vontade." /></label>
            </div>
          </fieldset>

          <fieldset className="anu-grupo">
          <legend className="anu-grupo-tit"><span className="anu-grupo-n">5</span> Fotos do imóvel <i>({fotos.length}/15 - quanto mais, melhor)</i></legend>
          <div className="anunciar-fotos">
            <div className="anunciar-thumbs">
              {fotos.map((src, i) => (
                <div className="anunciar-thumb" key={i}>
                  <img src={src} alt={`Foto ${i + 1}`} />
                  <button type="button" onClick={() => removeFoto(i)} aria-label="Remover foto"><IconClose width={14} height={14} /></button>
                </div>
              ))}
              {fotos.length < 15 && (
                <label className="anunciar-add">
                  <input type="file" accept="image/*" multiple onChange={addFotos} hidden />
                  <span>+ Adicionar fotos</span>
                </label>
              )}
            </div>
          </div>
          </fieldset>

          <fieldset className="anu-grupo placa-bloco">
            <legend className="anu-grupo-tit"><span className="anu-grupo-n">6</span> Placa “VENDE-SE” no seu imóvel <i>(grátis e opcional)</i></legend>
            <p className="placa-pitch">
              Placa <b>vende</b>. Quem passa na rua, o vizinho, o porteiro - muita gente compra (ou indica alguém) ao ver uma placa profissional no imóvel. Ela transmite <b>credibilidade</b> e <b>autoridade</b>, mostra que o imóvel está <b>seriamente à venda</b> com um consultor de confiança e gera contatos diretos, somando à divulgação online. <b>A colocação é por minha conta - sem nenhum custo pra você.</b>
            </p>
            <div className="placa-opt">
              <button type="button" className={`placa-toggle ${placa.quer ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, quer: true }))}>Quero a placa (grátis)</button>
              <button type="button" className={`placa-toggle ${!placa.quer ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, quer: false }))}>Agora não</button>
            </div>
          </fieldset>

          <label className="lead-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span>Declaro ser o proprietário ou estar autorizado a anunciar este imóvel e concordo com a <Link to="/privacidade" target="_blank">Política de Privacidade e Termos de Uso</Link>.</span>
          </label>

          <div className="det-trust" style={{ margin: '4px 0 0' }}>
            <IconShield width={20} height={20} />
            <p><b>Fica tudo comigo, com segurança.</b> Seus dados e fotos vão direto para a minha avaliação - não são publicados automaticamente. Eu seleciono a dedo os imóveis que represento para garantir qualidade e excelência aos meus clientes.</p>
          </div>

          {validMsg && <p className="anunciar-erro">{validMsg}</p>}
          {estado === 'erro' && <p className="anunciar-erro">Ops, algo falhou no envio. Tente de novo ou me chame direto no WhatsApp {CONFIG.telefone || ''}.</p>}

          <button type="submit" className="btn btn-gold lead-submit" disabled={estado === 'enviando' || !consent}>
            <IconWhats /> {estado === 'enviando' ? 'Enviando…' : 'Enviar para avaliação'} <IconArrow />
          </button>
        </form>
        </div>
      </div>
    </main>
  )
}
