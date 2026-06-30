import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { PDF_CATEGORIAS, pdfPorCategoria, pdfLive } from '../pdfTools'

const SITE = 'https://viniciusgraton.com.br'

function IconePdf({ cor }) {
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={cor} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg>
}

export default function PdfHub() {
  useSEO({
    title: 'Ferramentas de PDF Grátis Online: Juntar, Dividir, Comprimir, Converter',
    description: "Todas as ferramentas de PDF que você precisa, grátis e sem enviar seus arquivos: juntar, dividir, comprimir, PDF para JPG, imagem para PDF, rodar e mais. 100% no navegador, sem cadastro.",
    path: '/ferramentas/pdf',
  })

  // Sistema CLARO (igual ao resto do site)
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'claro')
    return () => { html.setAttribute('data-theme', anterior || 'claro') }
  }, [])

  useEffect(() => {
    const live = pdfLive()
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Ferramentas de PDF grátis',
      itemListElement: live.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.nome, url: `${SITE}/ferramentas/${t.slug}` })),
    }
    let el = document.head.querySelector('#schema-pdfhub')
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'schema-pdfhub'; document.head.appendChild(el) }
    el.textContent = JSON.stringify(ld)
    return () => { document.head.querySelector('#schema-pdfhub')?.remove() }
  }, [])

  return (
    <main className="pagina pdfhub-pg">
      <div className="pdfhub-hero">
        <div className="container">
          <span className="pdfhub-eyebrow">Ferramentas de PDF</span>
          <h1 className="pdfhub-h1">Tudo que você precisa fazer com <span>PDF</span>, grátis</h1>
          <p className="pdfhub-sub">Junte, divida, comprima e converta sem pagar e <strong>sem enviar seus arquivos</strong>. Roda no seu navegador, é só arrastar e pronto.</p>
          <div className="pdfhub-chips">
            <span>100% gratuito</span><span>Sem upload</span><span>Sem cadastro</span><span>Sem marca d'água</span>
          </div>
        </div>
      </div>

      <div className="container pdfhub-body">
        {PDF_CATEGORIAS.map((c) => {
          const tools = pdfPorCategoria(c.id)
          if (!tools.length) return null
          return (
            <section key={c.id} className="pdfhub-cat">
              <div className="pdfhub-cat-hd">
                <h2>{c.nome}</h2>
                <span>{c.sub}</span>
              </div>
              <div className="pdfhub-grid">
                {tools.map((t) => {
                  const inner = (
                    <>
                      <span className="pdfhub-card-ico" style={{ background: `${t.cor}14`, borderColor: `${t.cor}3a` }}><IconePdf cor={t.cor} /></span>
                      <strong className="pdfhub-card-nome">{t.nome}</strong>
                      <span className="pdfhub-card-desc">{t.desc}</span>
                      {t.status === 'breve' && <span className="pdfhub-breve">Em breve</span>}
                    </>
                  )
                  return t.status === 'live'
                    ? <Link key={t.slug} to={`/ferramentas/${t.slug}`} className="pdfhub-card">{inner}</Link>
                    : <div key={t.slug} className="pdfhub-card pdfhub-card--breve" aria-disabled="true">{inner}</div>
                })}
              </div>
            </section>
          )
        })}

        <p className="pdfhub-priv">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Diferente de outros sites, aqui seus arquivos <strong>não são enviados a nenhum servidor</strong>. Tudo acontece no seu próprio aparelho.
        </p>
      </div>
    </main>
  )
}
