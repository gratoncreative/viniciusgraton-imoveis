import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CampoMoeda from '../components/CampoMoeda'
import { CONFIG } from '../data'
import { formatBRL } from '../extenso'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconShield, IconClose } from '../components/icons'

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
      <rect x="3" y="3" width="194" height="124" rx="8" fill="#11151d" stroke="#b8862f" strokeWidth="2" />
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
      <text x="100" y="60" textAnchor="middle" fontFamily="Arial" fontSize="33" fontWeight="800" fill="#11151d" letterSpacing="1">VENDE-SE</text>
      <line x1="70" y1="72" x2="130" y2="72" stroke="#b8862f" strokeWidth="3" />
      <text x="100" y="99" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="#3a4150">Vinícius Graton · {FONE_PLACA}</text>
    </svg>
  )
  return (
    <svg viewBox="0 0 200 130" className="placa-svg" aria-hidden="true">
      <rect x="3" y="3" width="194" height="124" rx="8" fill="#fff" stroke="#b8862f" strokeWidth="2" />
      <path d="M3 11a8 8 0 0 1 8-8h178a8 8 0 0 1 8 8v26H3z" fill="#b8862f" />
      <text x="100" y="28" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="800" fill="#fff" letterSpacing="1">VENDE-SE</text>
      <text x="100" y="68" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="16" fill="#11151d">Vinícius Graton</text>
      <text x="100" y="86" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#5a616e" letterSpacing="1">CONSULTOR DE IMÓVEIS · UBERLÂNDIA</text>
      <text x="100" y="110" textAnchor="middle" fontFamily="Arial" fontSize="14" fontWeight="700" fill="#b8862f">WhatsApp {FONE_PLACA}</text>
    </svg>
  )
}

export default function Anunciar() {
  useSEO({
    title: 'Anuncie seu imóvel em Uberlândia — cadastre com o Vinícius Graton',
    description: 'Quer vender ou alugar seu imóvel em Uberlândia? Cadastre aqui com fotos e detalhes. Eu avalio, faço a curadoria e cuido da divulgação e da venda com segurança.',
    path: '/anunciar',
  })

  const [f, setF] = useState({
    nome: '', fone: '', email: '', finalidade: 'Vender', tipo: 'Casa', bairro: '', endereco: '',
    preco: 0, quartos: '', suites: '', vagas: '', area: '', condominio: 0, iptu: '', descricao: '',
  })
  const [fotos, setFotos] = useState([])
  const [placa, setPlaca] = useState({ quer: true, modelo: 'premium', tamanho: 'media' })
  const [consent, setConsent] = useState(false)
  const placaTxt = placa.quer
    ? `Sim — modelo ${PLACA_MODELOS.find((m) => m.id === placa.modelo)?.nome}, tamanho ${PLACA_TAMANHOS.find((t) => t.id === placa.tamanho)?.nome} (${PLACA_TAMANHOS.find((t) => t.id === placa.tamanho)?.dim})`
    : 'Não, por enquanto'
  const [estado, setEstado] = useState('idle') // idle | enviando | ok | erro
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
    if (!f.nome.trim() || !f.fone.trim() || !consent) return
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
      const resumo = `${f.tipo} para ${f.finalidade.toLowerCase()} em ${f.bairro || 'Uberlândia'}${f.preco ? ` — ${formatBRL(f.preco)}` : ''}`
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
          <p className="section-sub" style={{ margin: '16px auto 28px' }}>
            Seu imóvel entrou para <b>avaliação</b>. Eu analiso as informações e as fotos com cuidado e, se for um imóvel
            com o padrão de qualidade que entrego aos meus clientes, faço a curadoria e cuido da divulgação. Já abri o
            WhatsApp pra gente conversar.
          </p>
          <Link className="btn btn-gold" to="/">Voltar ao início <IconArrow /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina section--light det anunciar-pg">
      <div className="container" style={{ maxWidth: 920 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Quero vender / alugar</span>
            <h1 className="section-title">Venda seu imóvel <em>sem dor de cabeça</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Eu cuido de tudo: avalio pelo valor justo, faço a curadoria e as fotos, divulgo pra minha base de clientes e conduzo a negociação com segurança — você acompanha de perto, do anúncio à entrega das chaves. <b>Cadastrar é grátis e sem compromisso.</b>
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <ul className="anunciar-beneficios">
            <li><span>✓</span><div><b>Avaliação justa e grátis</b><i>Preço de mercado de verdade, sem chute — pra vender no tempo certo.</i></div></li>
            <li><span>✓</span><div><b>Curadoria + fotos que vendem</b><i>Seu imóvel apresentado do jeito que valoriza e atrai comprador.</i></div></li>
            <li><span>✓</span><div><b>Divulgação ativa</b><i>No site, nas redes e direto pra clientes que já procuram algo assim.</i></div></li>
            <li><span>✓</span><div><b>Segurança em cada etapa</b><i>Documentação conferida e negociação com a estrutura da Rotina.</i></div></li>
            <li><span>✓</span><div><b>Placa "VENDE-SE" grátis</b><i>Se quiser, uma placa profissional no seu imóvel, sem custo.</i></div></li>
            <li><span>✓</span><div><b>Você no controle</b><i>Acompanha tudo de perto, sem enrolação. Cadastrar não tem compromisso.</i></div></li>
          </ul>
        </Reveal>

        <form className="lead-form anunciar-form" onSubmit={enviar}>
          <div className="anunciar-grid">
            <label><span>Seu nome *</span><input value={f.nome} onChange={set('nome')} required /></label>
            <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={f.fone} onChange={set('fone')} placeholder="(34) 9____-____" required /></label>
            <label><span>E-mail <i>(opcional)</i></span><input type="email" value={f.email} onChange={set('email')} /></label>
            <label><span>Finalidade</span><select value={f.finalidade} onChange={set('finalidade')}>{FINALIDADES.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label><span>Tipo de imóvel</span><select value={f.tipo} onChange={set('tipo')}>{TIPOS.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label><span>Bairro</span><input value={f.bairro} onChange={set('bairro')} placeholder="Ex.: Santa Mônica" /></label>
            <label className="anunciar-full"><span>Endereço <i>(rua e número — fica só comigo)</i></span><input value={f.endereco} onChange={set('endereco')} /></label>
            <CampoMoeda label="Valor pretendido" valor={f.preco} onChange={setNum('preco')} />
            <CampoMoeda label="Condomínio (se houver)" valor={f.condominio} onChange={setNum('condominio')} />
            <label><span>IPTU <i>(anual, opcional)</i></span><input value={f.iptu} onChange={set('iptu')} placeholder="Ex.: R$1.200/ano" /></label>
            <label><span>Quartos</span><input inputMode="numeric" value={f.quartos} onChange={set('quartos')} /></label>
            <label><span>Suítes</span><input inputMode="numeric" value={f.suites} onChange={set('suites')} /></label>
            <label><span>Vagas</span><input inputMode="numeric" value={f.vagas} onChange={set('vagas')} /></label>
            <label><span>Área (m²)</span><input inputMode="numeric" value={f.area} onChange={set('area')} placeholder="Ex.: 120" /></label>
            <label className="anunciar-full"><span>Descrição <i>(diferenciais, reforma, sol da manhã, andar...)</i></span><textarea rows="3" value={f.descricao} onChange={set('descricao')} /></label>
          </div>

          <div className="anunciar-fotos">
            <span className="anunciar-fotos-tit">Fotos do imóvel <i>({fotos.length}/15 — quanto mais, melhor)</i></span>
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

          <div className="placa-bloco">
            <span className="anunciar-fotos-tit">Placa “VENDE-SE” no seu imóvel <i>(grátis e opcional)</i></span>
            <p className="placa-pitch">
              Placa <b>vende</b>. Quem passa na rua, o vizinho, o porteiro — muita gente compra (ou indica alguém) ao ver uma placa profissional no imóvel. Ela transmite <b>credibilidade</b> e <b>autoridade</b>, mostra que o imóvel está <b>seriamente à venda</b> com um consultor de confiança e gera contatos diretos, somando à divulgação online. <b>A colocação é por minha conta — sem nenhum custo pra você.</b>
            </p>
            <div className="placa-opt">
              <button type="button" className={`placa-toggle ${placa.quer ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, quer: true }))}>Quero a placa (grátis)</button>
              <button type="button" className={`placa-toggle ${!placa.quer ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, quer: false }))}>Agora não</button>
            </div>
            {placa.quer && (
              <>
                <span className="placa-label">Escolha o modelo</span>
                <div className="placa-modelos">
                  {PLACA_MODELOS.map((m) => (
                    <button type="button" key={m.id} className={`placa-card ${placa.modelo === m.id ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, modelo: m.id }))}>
                      <PlacaPreview modelo={m.id} />
                      <b>{m.nome}</b><i>{m.desc}</i>
                    </button>
                  ))}
                </div>
                <span className="placa-label">Tamanho</span>
                <div className="condo-chips">
                  {PLACA_TAMANHOS.map((t) => (
                    <button type="button" key={t.id} className={`condo-chip ${placa.tamanho === t.id ? 'on' : ''}`} onClick={() => setPlaca((s) => ({ ...s, tamanho: t.id }))}>{t.nome} · {t.dim}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <label className="lead-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span>Declaro ser o proprietário ou estar autorizado a anunciar este imóvel e concordo com a <Link to="/privacidade" target="_blank">Política de Privacidade e Termos de Uso</Link>.</span>
          </label>

          <div className="det-trust" style={{ margin: '4px 0 0' }}>
            <IconShield width={20} height={20} />
            <p><b>Fica tudo comigo, com segurança.</b> Seus dados e fotos vão direto para a minha avaliação — não são publicados automaticamente. Eu seleciono a dedo os imóveis que represento para garantir qualidade e excelência aos meus clientes.</p>
          </div>

          {estado === 'erro' && <p className="anunciar-erro">Ops, algo falhou no envio. Tente de novo ou me chame direto no WhatsApp {CONFIG.telefone || ''}.</p>}

          <button type="submit" className="btn btn-gold lead-submit" disabled={estado === 'enviando' || !consent}>
            <IconWhats /> {estado === 'enviando' ? 'Enviando…' : 'Enviar para avaliação'} <IconArrow />
          </button>
        </form>
      </div>
    </main>
  )
}
