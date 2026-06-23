import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import ScrollProgress from './components/ScrollProgress'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import AppTabBar from './components/AppTabBar'
import CadastroGate from './components/CadastroGate'
import LancGate from './components/LancGate'
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
const ConverterFotos = lazy(() => import('./pages/ConverterFotos'))
const EstudioFotos = lazy(() => import('./pages/EstudioFotos'))
const EditarFotoPage = lazy(() => import('./pages/EditarFotoPage'))
const PdfParaJpg = lazy(() => import('./pages/PdfParaJpgPage'))
const SimuladorFinanciamento = lazy(() => import('./pages/SimuladorFinanciamento'))
const TranscreverPage = lazy(() => import('./pages/TranscreverPage'))
const Corretor = lazy(() => import('./pages/Corretor'))
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
const BlowEmpreendimentoDetalhe = lazy(() => import('./pages/BlowEmpreendimentoDetalhe'))
const PortalLancamentosHome = lazy(() => import('./pages/PortalLancamentosHome'))
const LancamentoLouis = lazy(() => import('./pages/LancamentoLouis'))
const CatalogoLancamentos = lazy(() => import('./pages/CatalogoLancamentos'))
const LancamentoGuia = lazy(() => import('./pages/LancamentoGuia'))
const LancamentoBairro = lazy(() => import('./pages/LancamentoBairro'))
const Bairro = lazy(() => import('./pages/Bairro'))
const BairroTipo = lazy(() => import('./pages/BairroTipo'))
const Favoritos = lazy(() => import('./pages/Favoritos'))
const Cliente = lazy(() => import('./pages/Cliente'))
const EncontrarImovel = lazy(() => import('./pages/EncontrarImovel'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const Diferenciais = lazy(() => import('./pages/Diferenciais'))
const Impulsionar = lazy(() => import('./pages/Impulsionar'))
const LaudoPage = lazy(() => import('./pages/LaudoPage'))
const EstudoM2Page = lazy(() => import('./pages/EstudoM2Page'))
const EstudoAvulso = lazy(() => import('./pages/EstudoAvulso'))
const Mercado = lazy(() => import('./pages/Mercado'))
const Investir = lazy(() => import('./pages/Investir'))
const AppCorretor = lazy(() => import('./pages/AppCorretor'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  const { pathname } = useLocation()
  // Modo app: rodando como PWA instalado (standalone) OU tendo entrado pelo /app
  // nesta sessão. Aí o site vira "app" — sem navbar/rodapé e com barra de abas.
  // Não afeta quem abre /admin direto no navegador (desktop): sem flag, sem app.
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone)
  const flagApp = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('vg_appmode') === '1'
  const modoApp = standalone || flagApp || pathname === '/app' || pathname.startsWith('/app/')
  // Overrides dos imóveis: ao carregar, mutam IMOVEIS no lugar e disparam UM re-render.
  // NÃO usamos isso como `key` da árvore (remontar fechava modais/ferramentas no meio do uso).
  const [, aplicarOvRender] = useState(0)
  const lenisRef = useRef(null)

  // Busca os overrides do painel (edições / ocultar) e aplica nos imóveis publicados.
  // Só campos do anúncio — dados do proprietário nunca trafegam aqui.
  useEffect(() => {
    let vivo = true
    fetch('/api/imoveis-pub')
      .then((r) => r.json())
      .then((d) => { if (!vivo) return; const ov = d && d.ov ? d.ov : d; aplicarOverridesImoveis(ov, d && d.ap); aplicarOvRender((n) => n + 1) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  // Se o app ficou saudável alguns segundos, limpa o flag de "já recarregei por chunk velho"
  // (ErrorBoundary) — assim um PRÓXIMO deploy ainda pode recarregar 1x automaticamente.
  useEffect(() => {
    const t = setTimeout(() => { try { sessionStorage.removeItem('vg_erro_reload') } catch {} }, 8000)
    return () => clearTimeout(t)
  }, [])

  // (Google Analytics é carregado em src/analytics.js — com filtro do dono e anonimização)

  // sobe ao topo e registra a visualização de página
  useEffect(() => {
    // sobe ao topo na troca de página (o Lenis controla a rolagem, então usamos o método dele)
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
    if (CONFIG.gaId && window.gtag) {
      window.gtag('event', 'page_view', { page_path: pathname + window.location.search })
    }
  }, [pathname])

  // catálogo (/imoveis) usa layout de "duas colunas que rolam sozinhas" — no desktop a
  // página não rola e o rodapé não aparece (estilo Chaves na Mão). Marca o body p/ o CSS.
  useEffect(() => {
    // normaliza barra final (o Cloudflare Pages pode servir /imoveis/) p/ a classe
    // do catálogo sempre valer e o rodapé nunca aparecer nessa tela.
    const rota = pathname.replace(/\/+$/, '') || '/'
    document.body.classList.toggle('rota-catalogo', rota === '/imoveis')
    return () => document.body.classList.remove('rota-catalogo')
  }, [pathname])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    // No modo app (/app) não usamos scroll suave — é um cockpit, não uma landing.
    if (modoApp) { lenisRef.current = null; return }

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenisRef.current = lenis
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
  }, [modoApp])

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      {!modoApp && <ScrollProgress />}
      {!modoApp && <Navbar />}
      <div id="conteudo" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<div className="rota-load" aria-busy="true"><span className="rota-spinner" /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/imoveis" element={<Catalogo />} />
              <Route path="/imoveis/uberlandia/:bairro" element={<Bairro />} />
              <Route path="/imoveis/uberlandia/:bairro/:tipo" element={<BairroTipo />} />
              <Route path="/imovel/:codigo" element={<ImovelDetalhe />} />
              <Route path="/como-funciona" element={<ComoAjudo />} />
              <Route path="/sobre" element={<QuemSou />} />
              <Route path="/regioes" element={<Regioes />} />
              <Route path="/lancamentos" element={<PortalLancamentosHome />} />
              <Route path="/lancamentos/louis-studios-umuarama" element={<LancamentoLouis />} />
              <Route path="/louis" element={<Navigate to="/lancamentos/louis-studios-umuarama" replace />} />
              <Route path="/lancamentos/catalogo" element={<CatalogoLancamentos />} />
              <Route path="/lancamentos/guia" element={<LancamentoGuia />} />
              <Route path="/lancamentos/bairros/:slug" element={<LancamentoBairro />} />
              <Route path="/construtoras" element={<Navigate to="/lancamentos" replace />} />
              <Route path="/construtoras/:slug" element={<ConstrutoraDetalhe />} />
              <Route path="/construtoras/:slug/:projeto" element={<EmpreendimentoDetalhe />} />
              <Route path="/lancamentos/empreendimento/blow/:slug" element={<BlowEmpreendimentoDetalhe />} />
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/ferramentas/converter" element={<ConverterFotos />} />
              <Route path="/ferramentas/estudio-de-fotos" element={<EstudioFotos />} />
              <Route path="/ferramentas/editar-foto" element={<EditarFotoPage />} />
              <Route path="/ferramentas/pdf-para-jpg" element={<PdfParaJpg />} />
              <Route path="/simulador-financiamento" element={<SimuladorFinanciamento />} />
              <Route path="/ferramentas/transcrever" element={<TranscreverPage />} />
              <Route path="/corretor" element={<Corretor />} />
              <Route path="/corretor/:toolId" element={<Corretor />} />
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
              <Route path="/impulsionar" element={<Impulsionar />} />
              <Route path="/laudo/:id" element={<LaudoPage />} />
              <Route path="/estudo/:codigo" element={<EstudoM2Page />} />
              <Route path="/avaliar" element={<EstudoAvulso />} />
              <Route path="/mercado" element={<Mercado />} />
              <Route path="/investir" element={<Investir />} />
              <Route path="/app" element={<AppCorretor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!modoApp && <Footer />}

      {!modoApp && (
        <a className="wa-float" href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
          <IconWhats />
        </a>
      )}

      {modoApp && <AppTabBar />}

      {!modoApp && <BackToTop />}
      {!modoApp && <CadastroGate />}
      {!modoApp && <LancGate />}
    </>
  )
}
