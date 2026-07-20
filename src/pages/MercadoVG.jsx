import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { linkWhatsApp } from '../data'
import bairrosM2 from '../bairros-m2.json'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'

const fmtM2 = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'

export default function MercadoVG() {
  useSEO({
    title: 'Preço do m² por bairro em Uberlândia',
    description:
      'Referência do preço do metro quadrado por bairro em Uberlândia, calculada sobre anúncios ativos. Ponto de partida para comprar, vender ou avaliar seu imóvel.',
    path: '/mercado',
  })

  const linhas = useMemo(() => {
    const lista = (Array.isArray(bairrosM2) ? bairrosM2 : []).filter((b) => b && b.bairro && Number(b.m2) > 0)
    const max = Math.max(...lista.map((b) => b.m2), 1)
    return [...lista]
      .sort((a, b) => b.m2 - a.m2)
      .map((b) => ({
        bairro: b.bairro,
        m2Fmt: fmtM2(b.m2),
        barra: `${Math.round((b.m2 / max) * 100)}%`,
        fonte: [b.fonte, b.ref].filter(Boolean).join(' · '),
        href: `/imoveis?bairro=${encodeURIComponent(b.bairro)}`,
      }))
  }, [])

  const waAvaliar = linkWhatsApp('Olá Vinícius! Quero uma avaliação gratuita do meu imóvel em Uberlândia.')

  return (
    <div className="vgx">
      <NavbarVG ativo="mercado" />

      <section className="vgx-merc-hero">
        <div className="vgx-goldgrid" />
        <div className="vgx-merc-hero-in">
          <span className="vgx-kicker vgx-kicker--gold">Mercado · Uberlândia</span>
          <h1>Preço do m² por bairro</h1>
          <p>
            Referência calculada sobre os anúncios ativos da curadoria e da carteira da Rotina Imobiliária.
            Use como ponto de partida; para avaliar um imóvel específico, fale com o Vinícius.
          </p>
        </div>
      </section>

      <section className="vgx-merc vgx-reveal">
        <div className="vgx-tabela">
          <div className="vgx-tab-head">
            <span>Bairro</span>
            <span>Referência</span>
            <span>Médio</span>
            <span>Fonte</span>
          </div>
          {linhas.map((l) => (
            <Link key={l.bairro} to={l.href} className="vgx-tab-linha">
              <span className="vgx-tab-bairro">{l.bairro}</span>
              <span className="vgx-tab-barra"><i style={{ width: l.barra }} /></span>
              <span className="vgx-tab-m2">{l.m2Fmt}</span>
              <span className="vgx-tab-fonte">{l.fonte}</span>
            </Link>
          ))}
        </div>
        <p className="vgx-merc-nota">
          Valores por m² de área privativa (terrenos: área total), calculados sobre anúncios ativos. Não
          substituem uma avaliação individual: padrão de acabamento, posição e estado de conservação mudam
          o valor real.
        </p>
      </section>

      <section className="vgx-merc-ctas vgx-reveal">
        <div className="vgx-merc-cta vgx-merc-cta--navy">
          <h2>Quanto vale o seu imóvel?</h2>
          <p>Avaliação criteriosa e gratuita, com base no mercado real do seu bairro e no padrão do seu imóvel.</p>
          <a href={waAvaliar} target="_blank" rel="noopener noreferrer" className="vgx-btn-red">
            Pedir avaliação gratuita
          </a>
        </div>
        <div className="vgx-merc-cta vgx-merc-cta--claro">
          <h2>Simule o financiamento</h2>
          <p>Descubra a parcela e a renda necessária para o imóvel que você tem em mente, em menos de um minuto.</p>
          <Link to="/simulador-financiamento" className="vgx-btn-ouro">Abrir simulador</Link>
        </div>
      </section>

      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
