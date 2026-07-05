import { useEffect } from 'react'
import { useSEO } from '../useSEO'
import { IMOVEIS } from '../data'
import { selecaoHome } from '../components/vg/vgData'
import { NavbarVG, FooterVG, WhatsFloatVG } from '../components/vg/ChromeVG'
import {
  HeroVG, ColecaoVG, DestaquesVG, ComoFuncionaVG,
  QuemAtendeVG, DepoimentosVG, QuerVenderVG, BlogVG,
} from '../components/vg/SecoesVG'
import SimuladorVG from '../components/vg/SimuladorVG'

export default function HomeVG() {
  useSEO({
    title: 'Consultor de Imóveis em Uberlândia',
    description:
      'Imóveis à venda em Uberlândia com Vinícius Graton: casas, apartamentos, alto padrão e investimento. Compre seu imóvel sem medo de errar, com curadoria e segurança em cada etapa.',
    path: '/',
  })

  // A Home nova é um mundo próprio (marinho/ivory sob .vgx). Garante o tema claro
  // no <html> (index.html já aplica antes da pintura) e a cor da barra do navegador.
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    const meta = document.querySelector('meta[name="theme-color"]')
    const corAnterior = meta?.getAttribute('content')
    if (meta) meta.setAttribute('content', '#212b3d')
    return () => {
      html.setAttribute('data-theme', anterior || 'dark')
      if (meta && corAnterior) meta.setAttribute('content', corAnterior)
    }
  }, [])

  const { feature, mini, destaques } = selecaoHome(IMOVEIS)

  return (
    <div className="vgx">
      <NavbarVG />
      <HeroVG />
      <ColecaoVG feature={feature} mini={mini} />
      <DestaquesVG destaques={destaques} />
      <ComoFuncionaVG />
      <QuemAtendeVG />
      <DepoimentosVG />
      <SimuladorVG />
      <QuerVenderVG />
      <BlogVG />
      <FooterVG />
      <WhatsFloatVG />
    </div>
  )
}
