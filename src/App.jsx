import { useEffect } from 'react'
import Lenis from 'lenis'
import ScrollProgress from './components/ScrollProgress'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Dores from './components/Dores'
import Imoveis from './components/Imoveis'
import Destaque from './components/Destaque'
import Sobre from './components/Sobre'
import ComoFunciona from './components/ComoFunciona'
import Bairros from './components/Bairros'
import Compromisso from './components/Compromisso'
import Faq from './components/Faq'
import Contato from './components/Contato'
import Footer from './components/Footer'
import ParallaxBand from './components/ParallaxBand'
import { linkWhatsApp, WA, BANDS } from './data'
import { IconWhats } from './components/icons'

export default function App() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // âncoras com scroll suave
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')
      if (id.length > 1) {
        const el = document.querySelector(id)
        if (el) {
          e.preventDefault()
          lenis.scrollTo(el, { offset: -70 })
        }
      }
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      document.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <>
      <ScrollProgress />
      <Navbar />
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
      <Footer />

      <a className="wa-float" href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
        <IconWhats />
      </a>
    </>
  )
}
