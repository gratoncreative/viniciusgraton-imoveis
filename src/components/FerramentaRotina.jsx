import { useState } from 'react'
import { IconWhats } from './icons'

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

// 5 ganchos de primeiro contato com gatilhos mentais
function ganchos(im, nome) {
  const t = (im.tipo || 'imóvel').toLowerCase()
  const b = im.bairro || 'região'
  const v = im.valor || ''
  return [
    { tag: 'Escassez', txt: `Apareceu um ${t} no ${b} com a sua cara.. e imóvel bom nesse bairro costuma sair rápido. Quis te mostrar antes que esse voe.` },
    { tag: 'Projeção', txt: `Fecha o olho e imagina.. você chegando todo dia num ${t} no ${b}${destaqueFrase(im)}. Esse aqui tem tudo pra ser o seu novo endereço.` },
    { tag: 'Prova social', txt: `${b} é um dos pontos mais procurados de Uberlândia agora, e esse ${t} reúne o que mais pesa na hora de comprar bem.` },
    { tag: 'Custo-benefício', txt: `Olha que oportunidade.. um ${t}${specsCurto(im) ? ` com ${specsCurto(im)}` : ''} no ${b}${v ? ` por ${v}` : ''}. Difícil achar um custo-benefício desses por aqui.` },
    { tag: 'Exclusividade', txt: `Separei esse ${t} no ${b} pensando exatamente no seu perfil. Antes de abrir pra todo mundo, quis te dar a primeira olhada.` },
  ]
}

// monta a mensagem completa do WhatsApp (gancho + imóvel + LINK + tópicos de benefícios)
function montarMensagem(im, beneficios, nome, gancho) {
  const pn = primeiroNome(nome)
  const ola = pn ? `${saudacao()}, ${pn}! ` : `${saudacao()}! `
  const valor = im.valor ? `${im.valor}${im.operacao === 'locação' ? '/mês' : ''}` : ''
  const linhas = [
    `${ola}${gancho}`,
    '',
    `🏠 ${im.tipo} no ${im.bairro}`,
    specsLinha(im) && `${specsLinha(im)}`,
    valor && `💰 ${valor}`,
    im.condominio ? `Condomínio.. R$ ${im.condominio.toLocaleString('pt-BR')}` : '',
    '',
    `📸 Fotos e todos os detalhes.. ${im.link}`,
    '',
    `📍 A até 1km desse imóvel você tem..`,
    ...beneficios.map((x) => `• ${x}`),
    '',
    `Faz sentido marcarmos uma visita essa semana? Me diz o melhor dia e horário que eu organizo tudo pra você.`,
    '',
    `Vinícius Graton · Consultor de imóveis · Rotina Imobiliária`,
  ].filter((x) => x !== false && x !== undefined && x !== null)
  return linhas.join('\n')
}

export default function FerramentaRotina() {
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState(null)
  const [copiado, setCopiado] = useState(-1)

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
      <p className="rt-intro">Cole o <b>código do imóvel da Rotina</b>, informe o <b>nome</b> e o <b>WhatsApp do cliente</b>. Eu busco o imóvel no site da Rotina, levanto os <b>benefícios reais num raio de 1km</b> e gero 5 mensagens de primeiro contato com gatilhos mentais — é só clicar e enviar.</p>

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
              <a className="rt-link" href={im.link} target="_blank" rel="noopener">Abrir no site da Rotina ↗</a>
            </div>
          </div>

          <div className="rt-bloco">
            <h5 className="rt-bloco-tit">📍 Benefícios da região (até 1km — dados reais)</h5>
            <ul className="rt-benef">{beneficios.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>

          <div className="rt-bloco">
            <h5 className="rt-bloco-tit">Escolha a abordagem e envie</h5>
            <p className="rt-dica">Cada opção abre o WhatsApp do cliente já com a mensagem completa (gancho + imóvel + link + benefícios em tópicos). {foneD.length < 10 && <b>Preencha o WhatsApp do cliente pra já abrir na conversa dele.</b>}</p>
            <div className="rt-ganchos">
              {gs.map((g, i) => (
                <div className="rt-gancho" key={i}>
                  <span className="rt-tag">{g.tag}</span>
                  <p>{g.txt}</p>
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
