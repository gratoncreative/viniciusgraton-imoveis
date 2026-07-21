import { useEffect, useState, useRef, Suspense } from 'react'
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
import HomeVG from './pages/HomeVG'
import { CONFIG, linkWhatsApp, WA, aplicarOverridesImoveis } from './data'
import { IconWhats } from './components/icons'
import { lazyRetry } from './lazyRetry'

// páginas internas carregadas sob demanda (home fica mais leve e rápida)
const Catalogo = lazyRetry(() => import('./pages/Catalogo'))
const ImovelDetalhe = lazyRetry(() => import('./pages/ImovelDetalhe'))
const ImovelVG = lazyRetry(() => import('./pages/ImovelVG'))
const CatalogoVG = lazyRetry(() => import('./pages/CatalogoVG'))
const LancamentosVG = lazyRetry(() => import('./pages/LancamentosVG'))
const MercadoVG = lazyRetry(() => import('./pages/MercadoVG'))
const SobreVG = lazyRetry(() => import('./pages/SobreVG'))
const ContatoVG = lazyRetry(() => import('./pages/ContatoVG'))
const ComoAjudo = lazyRetry(() => import('./pages/ComoAjudo'))
const QuemSou = lazyRetry(() => import('./pages/QuemSou'))
const Regioes = lazyRetry(() => import('./pages/Regioes'))
const FaleComigo = lazyRetry(() => import('./pages/FaleComigo'))
const Ferramentas = lazyRetry(() => import('./pages/Ferramentas'))
const ConverterFotos = lazyRetry(() => import('./pages/ConverterFotos'))
const Alugar = lazyRetry(() => import('./pages/Alugar'))
const AlugarDetalhe = lazyRetry(() => import('./pages/AlugarDetalhe'))
const LeitorArea = lazyRetry(() => import('./pages/LeitorArea'))
const LevantamentoFotos = lazyRetry(() => import('./pages/LevantamentoFotos'))
const EstudioFotos = lazyRetry(() => import('./pages/EstudioFotos'))
const EditarFotoPage = lazyRetry(() => import('./pages/EditarFotoPage'))
const PdfParaJpg = lazyRetry(() => import('./pages/PdfParaJpgPage'))
const ImagemParaPdf = lazyRetry(() => import('./pages/ImagemParaPdfPage'))
const JuntarPdf = lazyRetry(() => import('./pages/JuntarPdfPage'))
const DividirPdf = lazyRetry(() => import('./pages/DividirPdfPage'))
const ComprimirPdf = lazyRetry(() => import('./pages/ComprimirPdfPage'))
const PdfHub = lazyRetry(() => import('./pages/PdfHub'))
const RodarPdf = lazyRetry(() => import('./pages/RodarPdfPage'))
const MarcaDagua = lazyRetry(() => import('./pages/MarcaDaguaPage'))
const NumerosPagina = lazyRetry(() => import('./pages/NumerosPaginaPage'))
const SimuladorFinanciamento = lazyRetry(() => import('./pages/SimuladorFinanciamento'))
const TranscreverPage = lazyRetry(() => import('./pages/TranscreverPage'))
const Corretor = lazyRetry(() => import('./pages/Corretor'))
const Condominios = lazyRetry(() => import('./pages/Condominios'))
const Anunciar = lazyRetry(() => import('./pages/Anunciar'))
const Conta = lazyRetry(() => import('./pages/Conta'))
const Avaliacao = lazyRetry(() => import('./pages/Avaliacao'))
const Comparar = lazyRetry(() => import('./pages/Comparar'))
const Mapa = lazyRetry(() => import('./pages/Mapa'))
const Painel = lazyRetry(() => import('./pages/Painel'))
const Admin = lazyRetry(() => import('./pages/Admin'))
const Blog = lazyRetry(() => import('./pages/BlogVG'))
const BlogPost = lazyRetry(() => import('./pages/BlogPostVG'))
const CondominioDetalhe = lazyRetry(() => import('./pages/CondominioDetalhe'))
const ConstrutorasPage = lazyRetry(() => import('./pages/Construtoras'))
const ConstrutoraDetalhe = lazyRetry(() => import('./pages/ConstrutoraDetalhe'))
const EmpreendimentoDetalhe = lazyRetry(() => import('./pages/EmpreendimentoDetalhe'))
const BlowEmpreendimentoDetalhe = lazyRetry(() => import('./pages/BlowEmpreendimentoDetalhe'))
const PortalLancamentosHome = lazyRetry(() => import('./pages/PortalLancamentosHome'))
const LancamentoLouis = lazyRetry(() => import('./pages/LancamentoLouis'))
const CatalogoLancamentos = lazyRetry(() => import('./pages/CatalogoLancamentos'))
const LancamentoGuia = lazyRetry(() => import('./pages/LancamentoGuia'))
const LancamentoBairro = lazyRetry(() => import('./pages/LancamentoBairro'))
const Bairro = lazyRetry(() => import('./pages/Bairro'))
const BairroTipo = lazyRetry(() => import('./pages/BairroTipo'))
const Favoritos = lazyRetry(() => import('./pages/Favoritos'))
const Cliente = lazyRetry(() => import('./pages/Cliente'))
const EncontrarImovel = lazyRetry(() => import('./pages/EncontrarImovel'))
const Privacidade = lazyRetry(() => import('./pages/Privacidade'))
const Diferenciais = lazyRetry(() => import('./pages/Diferenciais'))
const Impulsionar = lazyRetry(() => import('./pages/Impulsionar'))
const LaudoPage = lazyRetry(() => import('./pages/LaudoPage'))
const EstudoM2Page = lazyRetry(() => import('./pages/EstudoM2Page'))
const EstudoAvulso = lazyRetry(() => import('./pages/EstudoAvulso'))
const Mercado = lazyRetry(() => import('./pages/Mercado'))
const Investir = lazyRetry(() => import('./pages/Investir'))
const AppCorretor = lazyRetry(() => import('./pages/AppCorretor'))
const CriarTour = lazyRetry(() => import('./pages/CriarTour'))
const TourPage = lazyRetry(() => import('./pages/TourPage'))
const Tour360Page = lazyRetry(() => import('./pages/Tour360Page'))
const NotFound = lazyRetry(() => import('./pages/NotFound'))

export default function App() {
  const { pathname } = useLocation()
  // Modo app: rodando como PWA instalado (standalone) OU tendo entrado pelo /app
  // nesta sessão. Aí o site vira "app" — sem navbar/rodapé e com barra de abas.
  // Não afeta quem abre /admin direto no navegador (desktop): sem flag, sem app.
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone)
  const flagApp = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('vg_appmode') === '1'
  const modoApp = standalone || flagApp || pathname === '/app' || pathname.startsWith('/app/')
  // Modo Estúdio: a ferramenta de fotos abre como APP de tela cheia — sem navbar, rodapé,
  // barra de abas ou qualquer chrome do site. Só o editor, ocupando a tela toda.
  const modoEstudio = pathname.replace(/\/+$/, '') === '/ferramentas/estudio-de-fotos'
  const semChrome = modoApp || modoEstudio
  // Páginas já no redesign (.vgx) trazem o próprio chrome (navbar/rodapé/WhatsApp),
  // então nelas suprimimos o chrome global para não duplicar. Conforme cada página
  // for redesenhada, entra nesta lista; no fim o chrome novo vira global.
  const rotaVgx = ['/imoveis', '/lancamentos', '/mercado', '/sobre', '/contato', '/blog'].includes(pathname.replace(/\/+$/, ''))
    || pathname.startsWith('/blog/')
  const rotaHome = pathname === '/' || pathname.startsWith('/imovel/') || rotaVgx
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
    // mede conversão: clique em WhatsApp/telefone/e-mail → beacon (saber o que converte)
    import('./track').then((m) => m.initConvTracking()).catch(() => {})
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
    // O /imoveis agora usa o design novo (.vgx), que rola normalmente. A classe
    // antiga forçava o layout de duas colunas travadas e quebraria a página.
    document.body.classList.remove('rota-catalogo')
    return () => document.body.classList.remove('rota-catalogo')
  }, [pathname])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    // No modo app (/app) não usamos scroll suave — é um cockpit, não uma landing.
    if (semChrome) { lenisRef.current = null; return }

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
  }, [semChrome])

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      {!semChrome && <ScrollProgress />}
      {!semChrome && !rotaHome && <Navbar />}
      <div id="conteudo" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<div className="rota-load" aria-busy="true"><span className="rota-spinner" /></div>}>
            <Routes>
              <Route path="/" element={<HomeVG />} />
              <Route path="/imoveis" element={<CatalogoVG />} />
              <Route path="/alugar" element={CONFIG.alugarAtivo ? <Alugar /> : <Navigate to="/imoveis" replace />} />
              <Route path="/alugar/imovel/:codigo" element={CONFIG.alugarAtivo ? <AlugarDetalhe /> : <Navigate to="/imoveis" replace />} />
              <Route path="/alugar/uberlandia/:bairro" element={CONFIG.alugarAtivo ? <Alugar /> : <Navigate to="/imoveis" replace />} />
              <Route path="/imoveis/uberlandia/:bairro" element={<Bairro />} />
              <Route path="/imoveis/uberlandia/:bairro/:tipo" element={<BairroTipo />} />
              <Route path="/imovel/:codigo" element={<ImovelVG />} />
              <Route path="/como-funciona" element={<ComoAjudo />} />
              <Route path="/sobre" element={<SobreVG />} />
              <Route path="/regioes" element={<Regioes />} />
              <Route path="/lancamentos" element={<LancamentosVG />} />
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
              <Route path="/ferramentas/leitor-area" element={<LeitorArea />} />
              <Route path="/ferramentas/levantamento-fotos" element={<LevantamentoFotos />} />
              <Route path="/ferramentas/estudio-de-fotos" element={<EstudioFotos />} />
              <Route path="/ferramentas/editar-foto" element={<EditarFotoPage />} />
              <Route path="/ferramentas/pdf-para-jpg" element={<PdfParaJpg />} />
              <Route path="/ferramentas/imagem-para-pdf" element={<ImagemParaPdf />} />
              <Route path="/ferramentas/juntar-pdf" element={<JuntarPdf />} />
              <Route path="/ferramentas/dividir-pdf" element={<DividirPdf />} />
              <Route path="/ferramentas/comprimir-pdf" element={<ComprimirPdf />} />
              <Route path="/ferramentas/pdf" element={<PdfHub />} />
              <Route path="/ferramentas/rodar-pdf" element={<RodarPdf />} />
              <Route path="/ferramentas/marca-dagua" element={<MarcaDagua />} />
              <Route path="/ferramentas/numeros-pagina" element={<NumerosPagina />} />
              <Route path="/ferramentas/criar-tour" element={<CriarTour />} />
              <Route path="/tour/:id" element={<TourPage />} />
              <Route path="/simulador-financiamento" element={<SimuladorFinanciamento />} />
              <Route path="/ferramentas/transcrever" element={<TranscreverPage />} />
              <Route path="/corretor" element={<Corretor />} />
              <Route path="/corretor/:toolId" element={<Corretor />} />
              <Route path="/condominios" element={<Condominios />} />
              <Route path="/condominios/:slug" element={<CondominioDetalhe />} />
              <Route path="/anunciar" element={<Anunciar />} />
              <Route path="/tour-360" element={<Tour360Page />} />
              <Route path="/avaliacao" element={<Avaliacao />} />
              <Route path="/comparar" element={<Comparar />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/painel" element={<Painel />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/conta" element={<Conta />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/contato" element={<ContatoVG />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/cliente/:token" element={<Cliente />} />
              <Route path="/encontrar-imovel" element={<EncontrarImovel />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/diferenciais" element={<Diferenciais />} />
              <Route path="/impulsionar" element={<Impulsionar />} />
              <Route path="/laudo/:id" element={<LaudoPage />} />
              <Route path="/estudo/:codigo" element={<EstudoM2Page />} />
              <Route path="/avaliar" element={<EstudoAvulso />} />
              <Route path="/mercado" element={<MercadoVG />} />
              <Route path="/investir" element={<Investir />} />
              <Route path="/app" element={<AppCorretor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!semChrome && !rotaHome && <Footer />}

      {!semChrome && !rotaHome && (
        <a className="wa-float" href={linkWhatsApp(WA.flutuante)} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
          <IconWhats />
        </a>
      )}

      {modoApp && <AppTabBar />}

      {!semChrome && <BackToTop />}
      {!semChrome && <CadastroGate />}
      {!semChrome && <LancGate />}
    </>
  )
}
