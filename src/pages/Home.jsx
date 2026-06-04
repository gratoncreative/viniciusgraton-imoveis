import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero'
import Dores from '../components/Dores'
import Imoveis from '../components/Imoveis'
import Sobre from '../components/Sobre'
import Destaque from '../components/Destaque'
import ComoFunciona from '../components/ComoFunciona'
import Bairros from '../components/Bairros'
import Compromisso from '../components/Compromisso'
import Faq from '../components/Faq'
import Contato from '../components/Contato'
import ParallaxBand from '../components/ParallaxBand'
import { BANDS } from '../data'

export default function Home() {
  const location = useLocation()

  // rola até a seção quando navegamos de outra página (state.scrollTo)
  useEffect(() => {
    const id = location.state?.scrollTo
    if (id) {
      const tryScroll = () => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
      const t = setTimeout(tryScroll, 120)
      return () => clearTimeout(t)
    }
  }, [location.state])

  return (
    <main>
      <Hero />
      <Dores />
      <Imoveis />
      <Sobre />
      <Destaque />
      <ParallaxBand {...BANDS.b1} />
      <ComoFunciona />
      <ParallaxBand {...BANDS.b2} />
      <Bairros />
      <Compromisso />
      <Faq />
      <Contato />
    </main>
  )
}
