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
  const [consent, setConsent] = useState(false)
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
    }
    try {
      const r = await fetch('/api/anuncio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error('falha')
      setEstado('ok')
      const resumo = `${f.tipo} para ${f.finalidade.toLowerCase()} em ${f.bairro || 'Uberlândia'}${f.preco ? ` — ${formatBRL(f.preco)}` : ''}`
      const msg = `Olá Vinícius! Acabei de cadastrar meu imóvel no site para avaliação: ${resumo}. Enviei ${fotos.length} foto(s) e os detalhes completos. Meu nome é ${f.nome.trim()}, WhatsApp ${f.fone.trim()}.`
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
          <h1 className="section-title">Recebido, {f.nome.trim().split(' ')[0]}! 🎉</h1>
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
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Quero vender / alugar</span>
            <h1 className="section-title">Anuncie seu <em>imóvel</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Preencha os dados, suba as fotos e envie. Eu recebo tudo, avalio com calma e, se for um imóvel de qualidade,
              faço a curadoria e cuido da divulgação e da venda com segurança. Sem custo para cadastrar.
            </p>
          </div>
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
