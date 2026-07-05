import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import CampoMoeda from '../components/CampoMoeda'
import { CONFIG, BAIRROS_IMOVEL } from '../data'
import { formatBRL } from '../extenso'
import { registrarLead } from '../engajamento'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconShield } from '../components/icons'
import Tour360Pitch from '../components/Tour360Pitch'
import '../styles/detalhe.css'
import '../styles/anunciar.css'
import '../styles/lead.css'
import '../styles/aviseme.css'

const TIPOS = ['Casa', 'Apartamento', 'Casa em condomínio', 'Terreno / lote', 'Comercial', 'Rural / chácara']
const ESTADOS = ['Novo / nunca usado', 'Seminovo / bem conservado', 'Usado / precisa de reforma']

export default function Avaliacao() {
  useSEO({
    title: 'Quanto vale meu imóvel? Avaliação gratuita em Uberlândia',
    description: 'Descubra quanto vale o seu imóvel em Uberlândia com uma avaliação gratuita e sem compromisso do consultor Vinícius Graton. Preencha os dados e receba uma análise de preço de mercado.',
    path: '/avaliacao',
  })
  const [f, setF] = useState({ nome: '', fone: '', tipo: 'Apartamento', bairro: '', area: '', quartos: '', suites: '', vagas: '', estado: ESTADOS[1], imagina: 0, obs: '' })
  const [enviado, setEnviado] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setNum = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  const enviar = (e) => {
    e.preventDefault()
    if (!f.nome.trim() || !f.fone.trim()) return
    const resumo = `${f.tipo}${f.area ? ` ${f.area}m²` : ''} no ${f.bairro || 'Uberlândia'}, ${f.quartos || '?'} quartos`
    registrarLead({ cod: 'avaliacao', nome: f.nome.trim(), fone: f.fone.trim(), bairro: `AVALIAÇÃO · ${resumo} · ${f.estado}${f.imagina ? ` · imagina ${formatBRL(f.imagina)}` : ''}` })
    setEnviado(true)
    const msg = `Olá Vinícius! Quero uma avaliação do meu imóvel: ${resumo}, ${f.estado}.${f.imagina ? ` Imagino que valha ${formatBRL(f.imagina)}.` : ''}${f.obs ? ` ${f.obs}` : ''} Meu nome é ${f.nome.trim()}, WhatsApp ${f.fone.trim()}.`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  if (enviado) {
    return (
      <main className="pagina section--light det">
        <div className="container" style={{ maxWidth: 620, textAlign: 'center' }}>
          <span className="aviseme-ico" style={{ margin: '0 auto 18px' }}><IconWhats width={28} height={28} /></span>
          <h1 className="section-title">Recebido, {f.nome.trim().split(' ')[0]}!</h1>
          <p className="section-sub" style={{ margin: '16px auto 28px' }}>
            Vou analisar o seu imóvel e o preço praticado na região e te retorno com uma avaliação realista - sem compromisso. Já abri o WhatsApp pra gente conversar.
          </p>
          <Link className="btn btn-gold" to="/">Voltar ao início <IconArrow /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina section--light det avaliacao-pg">
      <div className="container" style={{ maxWidth: 920 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Avaliação gratuita</span>
            <h1 className="section-title">Quanto vale o <em>seu imóvel?</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Preço de menos você perde dinheiro; de mais, o imóvel encalha. Me conta os dados que eu faço uma avaliação realista, com base no mercado de Uberlândia - de graça e sem compromisso.
            </p>
          </div>
        </Reveal>

        <form className="lead-form avaliacao-form" onSubmit={enviar}>
          <div className="anunciar-grid">
            <label><span>Seu nome *</span><input value={f.nome} onChange={set('nome')} required /></label>
            <label><span>WhatsApp (com DDD) *</span><input type="tel" inputMode="tel" value={f.fone} onChange={set('fone')} placeholder="(34) 9____-____" required /></label>
            <label><span>Tipo de imóvel</span><select value={f.tipo} onChange={set('tipo')}>{TIPOS.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label><span>Bairro</span><input list="bairros-av" value={f.bairro} onChange={set('bairro')} placeholder="Ex.: Santa Mônica" /><datalist id="bairros-av">{BAIRROS_IMOVEL.map((b) => <option key={b} value={b} />)}</datalist></label>
            <label><span>Área (m²)</span><input inputMode="numeric" value={f.area} onChange={set('area')} placeholder="Ex.: 90" /></label>
            <label><span>Estado de conservação</span><select value={f.estado} onChange={set('estado')}>{ESTADOS.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label><span>Quartos</span><input inputMode="numeric" value={f.quartos} onChange={set('quartos')} /></label>
            <label><span>Suítes</span><input inputMode="numeric" value={f.suites} onChange={set('suites')} /></label>
            <label><span>Vagas</span><input inputMode="numeric" value={f.vagas} onChange={set('vagas')} /></label>
            <CampoMoeda label="Quanto você imagina que vale? (opcional)" valor={f.imagina} onChange={setNum('imagina')} />
            <label className="anunciar-full"><span>Algo que valoriza? <i>(reforma, sol da manhã, andar alto, vista...)</i></span><textarea rows="2" value={f.obs} onChange={set('obs')} /></label>
          </div>

          <label className="lead-consent">
            <input type="checkbox" required />
            <span>Concordo em ser contatado e com o tratamento dos meus dados conforme a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
          </label>

          <div className="det-trust" style={{ margin: '4px 0 0' }}>
            <IconShield width={20} height={20} />
            <p><b>Avaliação honesta, não chute.</b> Analiso seu imóvel e os preços reais praticados na região para te dar um número que faça o imóvel vender - sem inflar para te agradar nem desvalorizar.</p>
          </div>

          <button type="submit" className="btn btn-gold lead-submit"><IconWhats /> Quero minha avaliação grátis <IconArrow /></button>
        </form>

        <Tour360Pitch variante="bloco" />
      </div>
    </main>
  )
}
