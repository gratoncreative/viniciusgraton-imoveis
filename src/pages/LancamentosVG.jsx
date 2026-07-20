import { useMemo } from 'react'
import { useSEO } from '../useSEO'
import { linkWhatsApp, formatArea } from '../data'
import { BLOW_EMPREENDIMENTOS, todosEmpreendimentosBlow } from '../empreendimentos'

// O módulo exporta ora lista, ora função — normaliza para lista.
const listaBlow = () => {
  const f = todosEmpreendimentosBlow
  const v = typeof f === 'function' ? f() : f
  if (Array.isArray(v)) return v
  const b = BLOW_EMPREENDIMENTOS
  if (Array.isArray(b)) return b
  if (b && typeof b === 'object') return Object.values(b).find(Array.isArray) || []
  return []
}
import { precoCompacto } from '../components/vg/vgData'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import { onImgError } from '../img'

// Lançamento primeiro, depois obra, depois pronto (é a ordem de interesse de quem compra na planta).
const PESO = { 'Lançamento': 0, 'Em obras': 1, 'Pronto': 2 }

// "A partir de": só o menor valor, nunca a tabela unidade a unidade
// (essa tabela é informação comercial da construtora e não vai para o site).
function precoDe(e) {
  const un = Array.isArray(e?.unidadesDetalhes) ? e.unidadesDetalhes : []
  const valores = un.map((u) => Number(u?.valor) || 0).filter((v) => v > 0)
  return valores.length ? Math.min(...valores) : 0
}

function tipologiasDe(e) {
  const t = Array.isArray(e?.tipologias) ? e.tipologias.filter(Boolean) : []
  const area = e?.areaMin > 0
    ? (e.areaMax > e.areaMin ? `${formatArea(e.areaMin)} a ${formatArea(e.areaMax)}` : formatArea(e.areaMin))
    : ''
  return [t.join(' · '), area].filter(Boolean).join(' · ')
}

function resumoDe(e) {
  const txt = String(e?.descricao || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (txt) return txt.length > 260 ? txt.slice(0, 259).replace(/\s+\S*$/, '') + '…' : txt
  const partes = [
    e?.construtoraNome && `Empreendimento da ${e.construtoraNome}`,
    e?.bairro && `no ${e.bairro}`,
    e?.dataEntrega && `com entrega prevista para ${e.dataEntrega}`,
  ].filter(Boolean)
  return partes.length ? partes.join(' ') + '.' : 'Fale com o Vinícius para receber a tabela e as plantas atualizadas.'
}

export default function LancamentosVG() {
  useSEO({
    title: 'Lançamentos em Uberlândia',
    description:
      'Lançamentos e imóveis na planta em Uberlândia com o acompanhamento do consultor Vinícius Graton: tabela real, análise do fluxo de pagamento e parecer sobre valorização.',
    path: '/lancamentos',
  })

  const lancamentos = useMemo(() => {
    const lista = listaBlow().filter((e) => e && e.nome && (e.capa || (e.fotos || []).length))
    return [...lista].sort((a, b) => (PESO[a.status] ?? 3) - (PESO[b.status] ?? 3) || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [])

  const waCond = linkWhatsApp('Olá Vinícius! Procuro casa em condomínio fechado em Uberlândia.')

  return (
    <div className="vgx">
      <NavbarVG ativo="lancamentos" />

      <section className="vgx-lanc-hero vgx-reveal">
        <div className="vgx-lanc-hero-in">
          <span className="vgx-kicker vgx-kicker--gold">Lançamentos e condomínios</span>
          <h1>Compre na planta com segurança</h1>
          <p>
            O Vinícius acompanha os principais lançamentos de Uberlândia desde a mesa de negociação com a
            incorporadora. Você recebe a tabela real, a análise do fluxo de pagamento e um parecer honesto
            sobre valorização.
          </p>
        </div>
      </section>

      <section className="vgx-lanc-lista">
        {lancamentos.map((e) => {
          const p = precoDe(e)
          const tip = tipologiasDe(e)
          const wa = linkWhatsApp(`Olá Vinícius! Quero receber a tabela e as plantas do ${e.nome}.`)
          return (
            <article className="vgx-lanc vgx-reveal" key={e.slug || e.blowId}>
              <div className="vgx-lanc-foto">
                <img src={e.capa || (e.fotos || [])[0]} alt={e.nome} loading="lazy" onError={onImgError} />
                {e.status && <span className="vgx-lanc-status">{e.status}</span>}
              </div>
              <div className="vgx-lanc-body">
                <span className="vgx-kicker vgx-kicker--golddark">{e.bairro || 'Uberlândia'} · {e.cidade || 'Uberlândia'}</span>
                <h2>{e.nome}</h2>
                {tip && <span className="vgx-lanc-tipo">{tip}</span>}
                <p className="vgx-lanc-resumo">{resumoDe(e)}</p>
                <div className="vgx-lanc-rodape">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="vgx-lanc-de">A partir de</span>
                    <span className="vgx-lanc-preco">{p > 0 ? precoCompacto(p) : 'Sob consulta'}</span>
                  </span>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">
                    Receber tabela e plantas
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section className="vgx-cond vgx-reveal">
        <div className="vgx-cond-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 620 }}>
            <h2>Procura casa em condomínio fechado?</h2>
            <p>
              Gávea Hill, Gávea Paradiso, Jardins Barcelona, Splendido: o Vinícius acompanha as
              oportunidades dos principais condomínios de Uberlândia, inclusive as que não chegam aos portais.
            </p>
          </div>
          <a href={waCond} target="_blank" rel="noopener noreferrer" className="vgx-btn-navy">
            Falar sobre condomínios
          </a>
        </div>
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
