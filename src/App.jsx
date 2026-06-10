import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import ScrollProgress from './components/ScrollProgress'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import ExitIntent from './components/ExitIntent'
import CadastroGate from './components/CadastroGate'
import Home from './pages/Home'
import { CONFIG, linkWhatsApp, WA, aplicarOverridesImoveis } from './data'
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
const Conta = lazy(() => import('./pages/Conta'))
const Avaliacao = lazy(() => import('./pages/Avaliacao'))
const Comparar = lazy(() => import('./pages/Comparar'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Painel = lazy(() => import('./pages/Painel'))
const Admin = lazy(() => import('./pages/Admin'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const CondominioDetalhe = lazy(() => import('./pages/CondominioDetalhe'))
const ConstrutorasPage = lazy(() => import('./pages/Construtoras'))
const ConstrutoraDetalhe = lazy(() => import('./pages/ConstrutoraDetalhe'))
const EmpreendimentoDetalhe = lazy(() => import('./pages/EmpreendimentoDetalhe'))
const Bairro = lazy(() => import('./pages/Bairro'))
const Favoritos = lazy(() => import('./pages/Favoritos'))
const Cliente = lazy(() => import('./pages/Cliente'))
const EncontrarImovel = lazy(() => import('./pages/EncontrarImovel'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const Diferenciais = lazy(() => import('./pages/Diferenciais'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  const { pathname } = useLocation()
  const [ovKey, setOvKey] = useState('base')

  // Busca os overrides do painel (edições / ocultar) e aplica nos imóveis publicados.
  // Só campos do anúncio — dados do proprietário nunca trafegam aqui.
  useEffect(() => {
    let vivo = true
    fetch('/api/imoveis-pub')
      .then((r) => r.json())
      .then((d) => { if (!vivo) return; const ov = d && d.ov ? d.ov : d; aplicarOverridesImoveis(ov, d && d.ap); setOvKey('ov') })
      .catch(() => { if (vivo) setOvKey('ov') })
    return () => { vivo = false }
  }, [])

  // (Google Analytics é carregado em src/analytics.js — com filtro do dono e anonimização)

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
      <div id="conteudo" tabIndex={-1} key={ovKey}>
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
              <Route path="/avaliacao" element={<Avaliacao />} />
              <Route path="/comparar" element={<Comparar />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/painel" element={<Painel />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/conta" element={<Conta />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/contato" element={<FaleComigo />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/cliente/:token" element={<Cliente />} />
              <Route path="/encontrar-imovel" element={<EncontrarImovel />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/diferenciais" element={<Diferenciais />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />

      <a className="wa-float" href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
        <IconWhats />
      </a>

      <BackToTop />
      <ExitIntent />
      <CadastroGate />
    </>
  )
}
