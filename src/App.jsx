import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import ScrollProgress from './components/ScrollProgress'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BarraContato from './components/BarraContato'
import Home from './pages/Home'
import { CONFIG, linkWhatsApp, WA } from './data'
import { IconWhats } from './components/icons'

// páginas internas carregadas sob demanda (home fica mais leve e rápida)
const Catalogo = lazy(() => import('./pages/Catalogo'))
const ImovelDetalhe = lazy(() => import('./pages/ImovelDetalhe'))
const ComoAjudo = lazy(() => import('./pages/ComoAjudo'))
const QuemSou = lazy(() => import('./pages/QuemSou'))
const Regioes = lazy(() => import('./pages/Regioes'))
const FaleComigo = lazy(() => import('./pages/FaleComigo'))
const Ferramentas = lazy(() => import('./pages/Ferramentas'))
const Condominios = lazy(() => import('./pages/Condominios'))
const Anunciar = lazy(() => import('./pages/Anunciar'))
const CondominioDetalhe = lazy(() => import('./pages/CondominioDetalhe'))
const ConstrutorasPage = lazy(() => import('./pages/Construtoras'))
const ConstrutoraDetalhe = lazy(() => import('./pages/ConstrutoraDetalhe'))
const EmpreendimentoDetalhe = lazy(() => import('./pages/EmpreendimentoDetalhe'))
const Bairro = lazy(() => import('./pages/Bairro'))
const Favoritos = lazy(() => import('./pages/Favoritos'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  const { pathname } = useLocation()

  // Google Analytics 4 (só ativa se CONFIG.gaId estiver preenchido)
  useEffect(() => {
    if (!CONFIG.gaId || window.gtagLoaded) return
    window.gtagLoaded = true
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', CONFIG.gaId, { send_page_view: false })
  }, [])

  // sobe ao topo e registra a visualização de página
  useEffect(() => {
    window.scrollTo(0, 0)
    if (CONFIG.gaId && window.gtag) {
      window.gtag('event', 'page_view', { page_path: pathname + window.location.search })
    }
  }, [pathname])

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

    // âncoras com scroll suave (somente links que apontam para uma seção da mesma página)
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
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <ScrollProgress />
      <Navbar />
      <div id="conteudo" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<div className="rota-load" aria-busy="true"><span className="rota-spinner" /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/imoveis" element={<Catalogo />} />
              <Route path="/imoveis/uberlandia/:bairro" element={<Bairro />} />
              <Route path="/imovel/:codigo" element={<ImovelDetalhe />} />
              <Route path="/como-funciona" element={<ComoAjudo />} />
              <Route path="/sobre" element={<QuemSou />} />
              <Route path="/regioes" element={<Regioes />} />
              <Route path="/construtoras" element={<ConstrutorasPage />} />
              <Route path="/construtoras/:slug" element={<ConstrutoraDetalhe />} />
              <Route path="/construtoras/:slug/:projeto" element={<EmpreendimentoDetalhe />} />
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/condominios" element={<Condominios />} />
              <Route path="/condominios/:slug" element={<CondominioDetalhe />} />
              <Route path="/anunciar" element={<Anunciar />} />
              <Route path="/contato" element={<FaleComigo />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />

      <a className="wa-float" href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
        <IconWhats />
      </a>

      <BarraContato />
    </>
  )
}
