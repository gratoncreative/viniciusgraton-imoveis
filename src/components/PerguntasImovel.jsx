import { useState, useEffect } from 'react'
import { linkWhatsApp } from '../data'
import { IconWhats } from './icons'

// Monta as perguntas + respostas a partir dos dados REAIS do imóvel.
// `im` = dados do site; `ex` = dados vivos da Rotina/Imoview (aceita financiamento/permuta, situação, vídeo).
function montarPerguntas(im, ex) {
  const ehApto = /apart|kit|studio|stúdio|loft|flat|cobertura/i.test(im.tipo || '')
  const nFotos = Array.isArray(im.fotos) ? im.fotos.length : 0
  const temVideo = !!(ex && ex.video)
  const andarRaw = im.andar
  const temAndar = andarRaw !== undefined && andarRaw !== null && andarRaw !== ''
  const terreo = andarRaw === 0 || andarRaw === '0' || /t[eé]rreo/i.test(String(andarRaw))
  const elevador = typeof im.elevador === 'boolean' ? im.elevador : (ex && typeof ex.elevador === 'boolean' ? ex.elevador : null)
  const fin = ex ? ex.aceitaFinanciamento : null
  const permuta = ex ? ex.aceitaPermuta : null
  const situ = (ex && ex.situacao) || ''

  const lista = []
  lista.push({
    q: 'Posso agendar uma visita?',
    a: 'Pode sim! Tenho horários essa semana e, na maioria das vezes, consigo encaixar até no mesmo dia. Me chama no WhatsApp que eu já confirmo o melhor horário pra você.',
  })
  lista.push({
    q: 'Esse imóvel ainda está disponível?',
    a: `Sim, está ${/vago|dispon/i.test(situ) || /vago|dispon/i.test(im.descricao || '') ? 'vago e disponível' : 'disponível'}${im.conferido ? ` (conferi em ${new Date(im.conferido).toLocaleDateString('pt-BR')})` : ''}. Como a carteira muda rápido, eu reconfirmo com você na hora de agendar.`,
  })
  lista.push({
    q: 'Aceita financiamento e uso de FGTS?',
    a: fin === true
      ? 'Sim! Aceita financiamento bancário e uso do FGTS (atendendo às regras do banco). Eu te ajudo na simulação, do começo ao fim.'
      : fin === false
        ? 'O proprietário priorizou a venda à vista, mas posso consultar condições de financiamento pra você — às vezes dá pra negociar.'
        : 'É um imóvel residencial financiável — na prática dá pra usar financiamento bancário e FGTS conforme as regras. Confirmo as condições exatas com você.',
  })
  lista.push({
    q: 'Aceita permuta?',
    a: permuta === true
      ? 'Sim, o proprietário aceita permuta. Me conta o que você tem pra oferecer que eu levo a proposta pra ele.'
      : permuta === false
        ? 'Esse não está aberto a permuta. Mas se você tem um imóvel pra entrar na negociação, eu consulto o proprietário mesmo assim.'
        : 'Posso consultar o proprietário sobre permuta — me conta o que você teria pra oferecer.',
  })
  if (ehApto) lista.push({
    q: 'Qual é o andar?',
    a: temAndar
      ? `${terreo ? 'Fica no térreo' : `Fica no ${andarRaw}º andar`}${elevador === true ? ', e o prédio tem elevador' : elevador === false ? ', e o prédio não tem elevador' : ''}.`
      : 'Vou confirmar o andar certinho com você — me chama no WhatsApp que já te respondo.',
  })
  lista.push({
    q: 'Consegue me mandar mais fotos e vídeo?',
    a: `${nFotos ? `Tenho ${nFotos} fotos do imóvel` : 'Tenho mais fotos do imóvel'}${temVideo ? ' e um vídeo completo' : ''}. Te mando tudo agora no WhatsApp, é só pedir.`,
  })
  return lista
}

export default function PerguntasImovel({ im }) {
  const [ex, setEx] = useState(null)
  const [aberta, setAberta] = useState(-1)

  useEffect(() => {
    let vivo = true
    fetch(`/api/rotina-imovel?codigo=${encodeURIComponent(im.codigo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j && j.imovel) setEx(j.imovel) })
      .catch(() => {})
    return () => { vivo = false }
  }, [im.codigo])

  const perguntas = montarPerguntas(im, ex)

  return (
    <div className="det-perguntas">
      <span className="det-perguntas-tit">Perguntas rápidas</span>
      <p className="qa-dica">Passe o mouse (ou toque) numa pergunta pra ver a resposta na hora.</p>
      <div className="qa-lista">
        {perguntas.map((item, i) => (
          <div key={i} className={`qa-item ${aberta === i ? 'aberta' : ''}`}>
            <button type="button" className="qa-q" onClick={() => setAberta(aberta === i ? -1 : i)} aria-expanded={aberta === i}>
              <span className="qa-dot" aria-hidden="true" />
              <span className="qa-txt">{item.q}</span>
              <span className="qa-seta" aria-hidden="true">⌄</span>
            </button>
            <div className="qa-a">
              <div className="qa-a-in">
                <p>{item.a}</p>
                <a className="qa-wa" href={linkWhatsApp(`Olá Vinícius! Sobre o ${im.tipo} no ${im.bairro} (cód. ${im.codigo}).. ${item.q}`)} target="_blank" rel="noopener noreferrer">
                  <IconWhats width={15} height={15} /> Falar disso no WhatsApp
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
