import { useState } from 'react'
import { IconWhats, IconShield } from './icons'
import { getCorretorOuAdmin, salvarCorretor } from '../corretor'
import { registrarLead } from '../engajamento'

const soNum = (s) => String(s || '').replace(/\D/g, '')
const mascaraFone = (s) => {
  const d = soNum(s).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }
const primeiroNome = (s) => (String(s || '').trim().split(/\s+/)[0] || '')

// linha de specs objetiva do imóvel
function specsLinha(im) {
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(im.tipo || '')
  const p = []
  if (im.areaNum) p.push(`${im.area} m²`)
  if (im.quartos) p.push(`${im.quartos} quarto${im.quartos > 1 ? 's' : ''}`)
  if (im.suites) p.push(`${im.suites} suíte${im.suites > 1 ? 's' : ''}`)
  if (im.vagas) p.push(`${im.vagas} vaga${im.vagas > 1 ? 's' : ''}`)
  if (ehApto && im.andar) p.push(`${im.andar}º andar`)
  if (ehApto) p.push(im.elevador ? 'com elevador' : 'sem elevador')
  return p.join(' · ')
}
const specsCurto = (im) => [im.quartos && `${im.quartos} quartos`, im.suites && `${im.suites} suíte${im.suites > 1 ? 's' : ''}`, im.vagas && `${im.vagas} vagas`].filter(Boolean).join(', ')
function destaqueFrase(im) {
  const top = (im.amenidades || []).slice(0, 2)
  if (top.length) return `, com ${top.join(' e ').toLowerCase()}`
  if (im.suites) return `, com ${im.suites} suíte${im.suites > 1 ? 's' : ''}`
  if (im.vagas) return `, com ${im.vagas} vaga${im.vagas > 1 ? 's' : ''} na garagem`
  return ''
}

// 5 ganchos de primeiro contato — tom consultivo (pede a opinião do cliente)
function ganchos(im, nome) {
  const t = (im.tipo || 'imóvel').toLowerCase()
  const b = im.bairro || 'região'
  return [
    { tag: 'Opinião', txt: `Acabou de chegar para nós um imóvel potencial para você. Quero compartilhar com você e saber a sua opinião..` },
    { tag: 'Exclusivo', txt: `Separei esse ${t} no ${b} pensando em você e queria muito ouvir o que você acha..` },
    { tag: 'Oportunidade', txt: `Apareceu uma oportunidade que tem tudo a ver com o que você procura. Dá uma olhada e me conta o que achou..` },
    { tag: 'Seu perfil', txt: `Esse ${t} no ${b} chegou agora e lembrei na hora do seu perfil. Quero a sua opinião sincera..` },
    { tag: 'Prévia', txt: `Antes de divulgar pra mais gente, quis te mostrar primeiro. Vê se faz sentido pra você..` },
  ]
}

// monta a mensagem completa do WhatsApp (gancho + imóvel + LINK + tópicos de benefícios)
function montarMensagem(im, beneficios, nome, gancho) {
  const pn = primeiroNome(nome)
  const ola = pn ? `${saudacao()}, ${pn}! Tudo bem? ` : `${saudacao()}! Tudo bem? `
  const valor = im.valor ? `${im.valor}${im.operacao === 'locação' ? '/mês' : ''}` : ''
  const linhas = [
    `${ola}${gancho}`,
    '',
    `${im.tipo} no ${im.bairro}`,
    specsLinha(im) && `${specsLinha(im)}`,
    valor && `Valor.. ${valor}`,
    im.condominio ? `Condomínio.. R$ ${im.condominio.toLocaleString('pt-BR')}` : '',
    '',
    `Fotos e todos os detalhes.. ${im.link}`,
    '',
    `E olha o melhor, no raio de 1km dele você tem:`,
    ...beneficios.map((x) => `• ${x}`),
    '',
    `Faz sentido marcarmos uma visita essa semana? Estou com a chave em mãos.`,
    '',
    `Vinícius Graton · Consultor de imóveis · Rotina Imobiliária`,
  ].filter((x) => x !== false && x !== undefined && x !== null)
  return linhas.join('\n')
}

// Área restrita: EXCLUSIVA para corretores da Rotina (precisa do código de acesso).
function CadastroCorretor({ onOk }) {
  const [f, setF] = useState({ nome: '', creci: '', fone: '', email: '', codigo: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: k === 'fone' ? mascaraFone(e.target.value) : e.target.value })
  const enviar = async (e) => {
    e.preventDefault()
    const nome = f.nome.trim()
    if (nome.length < 3) { setErro('Informe seu nome completo.'); return }
    if (soNum(f.fone).length < 10) { setErro('Informe um WhatsApp válido com DDD.'); return }
    if (!f.codigo.trim()) { setErro('Digite o código de acesso da Rotina.'); return }
    setErro(''); setEnviando(true)
    let res = { ok: false }
    try {
      const r = await fetch('/api/corretor-acesso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: f.codigo.trim() }) })
      res = await r.json()
    } catch { setErro('Falha de conexão. Tente de novo.'); setEnviando(false); return }
    if (res.naoConfigurado) { setErro('O acesso ainda não foi liberado pela administração. Fale com o Vinícius.'); setEnviando(false); return }
    if (!res.ok) { setErro('Código de acesso inválido. Esta ferramenta é exclusiva para corretores da Rotina Imobiliária.'); setEnviando(false); return }
    const c = salvarCorretor({ nome, creci: f.creci.trim(), imobiliaria: 'Rotina Imobiliária', rotina: true, fone: f.fone.trim(), email: f.email.trim() })
    try {
      registrarLead({
        cod: 'corretor-rotina', nome, fone: f.fone.trim(), email: f.email.trim(),
        bairro: `Corretor Rotina${f.creci.trim() ? ' · CRECI ' + f.creci.trim() : ''}`.slice(0, 120),
      })
    } catch {}
    onOk(c)
  }
  return (
    <div className="rt-tool">
      <div className="rt-gate">
        <span className="rt-gate-ico"><IconShield width={26} height={26} /></span>
        <h4>Exclusivo para corretores da Rotina Imobiliária</h4>
        <p>Esta ferramenta é de uso interno da equipe Rotina. Informe seus dados e o <b>código de acesso</b> que a Rotina forneceu para liberar.</p>
        <form className="rt-gate-form" onSubmit={enviar}>
          <label className="calc-campo cg-destaque"><span>Código de acesso Rotina</span><div className="calc-input"><input value={f.codigo} onChange={set('codigo')} placeholder="Código fornecido pela Rotina" autoComplete="off" /></div></label>
          <label className="calc-campo"><span>Nome completo</span><div className="calc-input"><input value={f.nome} onChange={set('nome')} placeholder="Seu nome" /></div></label>
          <div className="rt-gate-2">
            <label className="calc-campo"><span>CRECI <i style={{ fontWeight: 400, color: '#9a8e78' }}>(se tiver)</i></span><div className="calc-input"><input value={f.creci} onChange={set('creci')} placeholder="MG-00000" /></div></label>
            <label className="calc-campo"><span>WhatsApp</span><div className="calc-input"><input value={f.fone} onChange={set('fone')} placeholder="(34) 99999-9999" inputMode="numeric" /></div></label>
          </div>
          <label className="calc-campo"><span>E-mail <i style={{ fontWeight: 400, color: '#9a8e78' }}>(opcional)</i></span><div className="calc-input"><input value={f.email} onChange={set('email')} placeholder="voce@email.com" /></div></label>
          {erro && <p className="rt-erro">{erro}</p>}
          <button type="submit" className="btn btn-gold rt-buscar" style={{ width: '100%' }} disabled={enviando}>{enviando ? 'Validando…' : 'Liberar a ferramenta'}</button>
          <p className="rt-gate-nota">Acesso restrito à equipe da Rotina Imobiliária. Seus dados ficam só com o Vinícius.</p>
        </form>
      </div>
    </div>
  )
}

export default function FerramentaRotina() {
  const [corretor, setCorretor] = useState(() => getCorretorOuAdmin())
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(-1)

  if (!corretor) return <CadastroCorretor onOk={setCorretor} />

  const buscar = async (e) => {
    e && e.preventDefault()
    const cod = soNum(codigo)
    if (!cod) { setErro('Digite o código do imóvel da Rotina.'); return }
    setErro(''); setCarregando(true); setDados(null)
    try {
      const r = await fetch(`/api/rotina-imovel?codigo=${cod}`)
      const j = await r.json()
      if (!r.ok || j.erro) { setErro(j.erro || 'Não encontrei esse imóvel.'); setCarregando(false); return }
      setDados(j)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    }
    setCarregando(false)
  }

  const im = dados?.imovel
  const beneficios = dados?.beneficios || []
  const gs = im ? ganchos(im, nome) : []
  const foneD = soNum(fone)
  const waBase = foneD.length >= 10 ? `https://wa.me/55${foneD}` : 'https://wa.me/'

  const enviar = (g) => {
    const msg = montarMensagem(im, beneficios, nome, g.txt)
    window.open(`${waBase}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }
  const copiar = (g, i) => {
    const msg = montarMensagem(im, beneficios, nome, g.txt)
    try { navigator.clipboard.writeText(msg); setCopiado(i); setTimeout(() => setCopiado(-1), 1600) } catch {}
  }

  return (
    <div className="rt-tool">
      <p className="rt-intro">Cole o <b>código do imóvel da Rotina</b>, informe o <b>nome</b> e o <b>WhatsApp do cliente</b>. Eu busco o imóvel no site da Rotina, levanto os <b>benefícios reais num raio de 1km</b> e gero 5 mensagens de primeiro contato com gatilhos mentais - é só clicar e enviar.</p>

      <form className="rt-form" onSubmit={buscar}>
        <label className="calc-campo"><span>Nome do cliente</span><div className="calc-input"><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mariana" /></div></label>
        <label className="calc-campo"><span>WhatsApp do cliente</span><div className="calc-input"><input value={fone} onChange={(e) => setFone(mascaraFone(e.target.value))} placeholder="(34) 99999-9999" inputMode="numeric" /></div></label>
        <label className="calc-campo"><span>Código do imóvel</span><div className="calc-input"><input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 1601" inputMode="numeric" /></div></label>
        <button className="btn btn-gold rt-buscar" type="submit" disabled={carregando}>{carregando ? 'Buscando…' : 'Buscar imóvel'}</button>
      </form>

      {erro && <p className="rt-erro">{erro}</p>}

      {im && (
        <div className="rt-result">
          <div className="rt-imovel">
            {im.foto && <img src={im.foto} alt={`${im.tipo} no ${im.bairro}`} loading="lazy" />}
            <div className="rt-imovel-info">
              <span className="rt-cod">Cód. {im.codigo} · {im.operacao === 'locação' ? 'Locação' : 'Venda'}</span>
              <h4>{im.tipo} no {im.bairro}</h4>
              <p className="rt-specs">{specsLinha(im)}</p>
              {im.valor && <p className="rt-valor">{im.valor}{im.operacao === 'locação' ? '/mês' : ''}</p>}
              <a className="rt-link" href={im.link} target="_blank" rel="noopener noreferrer">Abrir no site da Rotina ↗</a>
            </div>
          </div>

          <div className="rt-bloco">
            <h5 className="rt-bloco-tit">📍 Benefícios da região (até 1km - dados reais)</h5>
            <ul className="rt-benef">{beneficios.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>

          <div className="rt-bloco">
            <h5 className="rt-bloco-tit">Escolha a abordagem e envie</h5>
            <p className="rt-dica">Cada opção abre o WhatsApp do cliente já com a mensagem completa (gancho + imóvel + link + benefícios em tópicos). {foneD.length < 10 && <b>Preencha o WhatsApp do cliente pra já abrir na conversa dele.</b>}</p>
            <div className="rt-ganchos">
              {gs.map((g, i) => (
                <div className="rt-gancho" key={i}>
                  <span className="rt-tag">{g.tag}</span>
                  <pre className="rt-msg-preview">{montarMensagem(im, beneficios, nome, g.txt)}</pre>
                  <div className="rt-gancho-acoes">
                    <button className="btn btn-gold rt-envia" type="button" onClick={() => enviar(g)}><IconWhats width={17} height={17} /> Enviar no WhatsApp</button>
                    <button className="btn btn-ghost rt-copia" type="button" onClick={() => copiar(g, i)}>{copiado === i ? 'Copiado!' : 'Copiar texto'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
