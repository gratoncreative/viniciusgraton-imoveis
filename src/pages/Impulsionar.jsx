import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { linkWhatsApp, getImovel, formatPreco } from '../data'
import { useSEO } from '../useSEO'
import { IconWhats, IconArrow, IconShield } from '../components/icons'

const PLANOS = [
  { id: 'p7', nome: 'Destaque 7 dias', preco: 'R$ 29,90', desc: 'Seu anúncio sobe nas listagens e ganha selo de destaque por 7 dias.' },
  { id: 'p15', nome: 'Destaque 15 dias', preco: 'R$ 49,90', desc: '15 dias com prioridade nas buscas. O mais escolhido.', popular: true },
  { id: 'p30', nome: 'Super Destaque 30 dias', preco: 'R$ 89,90', desc: '30 dias no topo — visibilidade máxima pro seu imóvel.' },
]

export default function Impulsionar() {
  const [params] = useSearchParams()
  useSEO({ title: 'Impulsionar anúncio — destaque seu imóvel', description: 'Coloque seu imóvel em destaque no site e venda mais rápido. Pagamento único via PIX ou cartão.', path: '/impulsionar' })
  const status = params.get('status')
  const [codigo, setCodigo] = useState(params.get('cod') || '')
  const [plano, setPlano] = useState('p15')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [waFallback, setWaFallback] = useState(false)

  const pagar = async (e) => {
    e && e.preventDefault()
    if (!codigo.trim()) { setErro('Informe o código do imóvel que você quer destacar.'); return }
    setErro(''); setCarregando(true)
    try {
      const r = await fetch('/api/impulsionar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'criar', codigo: codigo.trim(), plano }) })
      const j = await r.json()
      if (j.naoConfigurado) { setWaFallback(true); setCarregando(false); return }
      if (j.ok && j.url) { window.location.href = j.url; return }
      setErro(j.msg || j.erro || 'Não consegui iniciar o pagamento. Tente de novo.')
    } catch { setErro('Falha de conexão. Tente de novo.') }
    setCarregando(false)
  }

  const planoSel = PLANOS.find((p) => p.id === plano)
  const waMsg = `Olá Vinícius! Quero IMPULSIONAR o anúncio do imóvel ${codigo ? `(cód. ${codigo.trim()}) ` : ''}— plano ${planoSel?.nome || ''}. Como faço o pagamento?`
  const imovelPreview = useMemo(() => getImovel(codigo.trim()), [codigo])

  if (status === 'sucesso') {
    return (
      <main className="pagina section--light det" style={{ minHeight: '60vh' }}>
        <div className="container" style={{ maxWidth: 600, textAlign: 'center' }}>
          <span className="aviseme-ico" style={{ margin: '0 auto 16px' }}><IconShield width={28} height={28} /></span>
          <h1 className="section-title">Pagamento recebido!</h1>
          <p className="section-sub" style={{ margin: '16px auto 28px' }}>Seu anúncio já está sendo <b>destacado</b>. Em instantes ele sobe nas listagens com o selo de destaque. Qualquer dúvida, é só me chamar.</p>
          <Link className="btn btn-gold" to="/imoveis">Ver os imóveis <IconArrow /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina section--light det imp-pg">
      <div className="container" style={{ maxWidth: 900 }}>
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Impulsionar anúncio</span>
            <h1 className="section-title">Coloque seu imóvel <em>em destaque</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Anúncio em destaque aparece <b>primeiro</b> nas buscas e ganha mais visualizações — vende mais rápido. Pagamento único via <b>PIX ou cartão</b>, sem mensalidade.
            </p>
          </div>
        </Reveal>

        {(status === 'pendente' || status === 'falha') && (
          <p className="anunciar-erro" style={{ textAlign: 'center' }}>{status === 'pendente' ? 'Seu pagamento está em análise — assim que aprovar, o destaque entra automaticamente.' : 'O pagamento não foi concluído. Você pode tentar de novo abaixo.'}</p>
        )}

        <div className="imp-planos">
          {PLANOS.map((p) => (
            <button type="button" key={p.id} className={`imp-plano ${plano === p.id ? 'on' : ''}`} onClick={() => setPlano(p.id)}>
              {p.popular && <span className="imp-pop">Mais escolhido</span>}
              <b className="imp-plano-nome">{p.nome}</b>
              <span className="imp-plano-preco">{p.preco}</span>
              <span className="imp-plano-desc">{p.desc}</span>
              <span className={`imp-check ${plano === p.id ? 'on' : ''}`} aria-hidden="true" />
            </button>
          ))}
        </div>

        <form className="imp-form" onSubmit={pagar}>
          <label className="calc-campo">
            <span>Código do imóvel a destacar</span>
            <div className="calc-input"><input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 29144" inputMode="numeric" /></div>
          </label>
          {imovelPreview && (
            <div className="imp-preview">
              {imovelPreview.img && <img src={imovelPreview.img} alt={imovelPreview.tipo} className="imp-preview-img" loading="lazy" />}
              <div className="imp-preview-info">
                <span className="imp-preview-label">Você está destacando:</span>
                <b className="imp-preview-nome">{imovelPreview.tipo} no {imovelPreview.bairro}</b>
                <span className="imp-preview-preco">{formatPreco(imovelPreview.preco)}</span>
              </div>
            </div>
          )}
          {erro && <p className="rt-erro">{erro}</p>}
          {waFallback ? (
            <>
              <a className="btn btn-gold imp-btn" href={linkWhatsApp(waMsg)} target="_blank" rel="noopener noreferrer"><IconWhats /> Quero impulsionar (falar no WhatsApp)</a>
              <p className="imp-nota">O pagamento online está sendo ativado. Por enquanto, clique acima que eu organizo o impulsionamento com você na hora.</p>
            </>
          ) : (
            <>
              <button type="submit" className="btn btn-gold imp-btn" disabled={carregando}>{carregando ? 'Abrindo pagamento…' : `Pagar e destacar — ${planoSel?.preco}`}</button>
              <p className="imp-nota"><IconShield width={15} height={15} /> Pagamento seguro pelo Mercado Pago (PIX ou cartão). O destaque entra automaticamente após a confirmação.</p>
            </>
          )}
        </form>
      </div>
    </main>
  )
}
