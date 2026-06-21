import { Suspense, lazy, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { IconArrow, IconWhats } from '../components/icons'
import { linkWhatsApp } from '../data'

// Estúdio de fotos de imóvel — página pública (própria URL + HTML).
// O editor completo (MelhorarFotos) roda 100% no navegador; nada é enviado a servidor.
const MelhorarFotos = lazy(() => import('../components/MelhorarFotos'))

const SITE = 'https://viniciusgraton.com.br'
const URL = `${SITE}/ferramentas/estudio-de-fotos`

const FAQ = [
  {
    q: 'Como deixar uma foto de imóvel tirada em pé na horizontal?',
    a: "Suba a foto no estúdio, abra Ajustes → Formato e escolha 16:9 (deitado). As laterais são preenchidas com um fundo desfocado da própria foto (padrão dos portais), branco, na cor da marca ou cortando as bordas. Dá pra aplicar em todas as fotos de uma vez.",
  },
  {
    q: 'Preciso instalar algum programa ou pagar?',
    a: 'Não. É grátis e roda 100% no navegador, no computador ou no celular. Não precisa criar conta nem instalar nada.',
  },
  {
    q: 'As fotos são enviadas para algum servidor?',
    a: 'Não. Todo o processamento acontece no seu próprio aparelho — as imagens não saem dele.',
  },
  {
    q: 'Dá para editar várias fotos de uma vez?',
    a: "Sim. Você sobe o álbum inteiro, ajusta uma foto e usa “Aplicar a todas” para repetir o mesmo tratamento (luz, cor, formato e marca d'água) em todas, e depois baixa tudo de uma vez.",
  },
  {
    q: 'O que dá para fazer com as fotos do imóvel?',
    a: "Endireitar a inclinação, melhorar luz, cor e nitidez automaticamente, converter foto vertical em horizontal, aplicar marca d'água (texto ou logo), redimensionar e exportar em JPG, PNG ou WebP.",
  },
  {
    q: 'Serve para foto de celular, para anúncio e WhatsApp?',
    a: 'Sim. É feito para fotos de imóvel — deixa o anúncio mais profissional e padronizado para portais, Instagram e WhatsApp.',
  },
]

export default function EstudioFotos() {
  useSEO({
    title: 'Estúdio de fotos de imóvel — melhorar, endireitar e deixar na horizontal',
    description: "Ferramenta grátis para melhorar fotos de imóvel: endireitar, ajustar luz e cor, converter foto vertical em horizontal, marca d'água em lote e exportar em JPG, PNG ou WebP. Roda no navegador, sem instalar nada e sem enviar suas fotos.",
    path: '/ferramentas/estudio-de-fotos',
    image: '/vinicius-graton.jpg',
  })

  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'estudio-schema'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': `${URL}#app`,
          name: 'Estúdio de fotos de imóvel',
          url: URL,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web',
          browserRequirements: 'Requer um navegador moderno (Chrome, Edge, Safari ou Firefox).',
          inLanguage: 'pt-BR',
          description: "Edite fotos de imóvel direto no navegador: endireitar, ajustar luz e cor, converter vertical em horizontal, marca d'água em lote e exportar em JPG, PNG ou WebP.",
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
          featureList: [
            'Endireitar e corrigir inclinação',
            'Melhorar luz, cor e nitidez automaticamente',
            'Converter foto vertical em horizontal (16:9, 4:3, 1:1)',
            "Marca d'água (texto ou logo) em lote",
            'Redimensionar e exportar em JPG, PNG ou WebP',
          ],
          provider: { '@type': 'Person', name: 'Vinícius Graton', url: SITE },
        },
        {
          '@type': 'FAQPage',
          '@id': `${URL}#faq`,
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: 'Ferramentas', item: `${SITE}/ferramentas` },
            { '@type': 'ListItem', position: 3, name: 'Estúdio de fotos de imóvel', item: URL },
          ],
        },
      ],
    })
    document.head.appendChild(el)
    return () => { document.getElementById('estudio-schema')?.remove() }
  }, [])

  return (
    <main className="pagina section--light estudio-pg">
      <div className="container">
        <div className="cat-head" style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 8px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Ferramenta gratuita</span>
          <h1 className="section-title">Estúdio de <em>fotos de imóvel</em></h1>
          <p className="section-sub" style={{ marginTop: 12 }}>
            Melhore, endireite e padronize as fotos do seu imóvel direto no navegador — de graça.
            Deixe fotos verticais na horizontal, ajuste luz e cor, aplique sua marca d'água e exporte tudo em lote.
            As imagens <b>não saem do seu aparelho</b>.
          </p>
        </div>
      </div>

      <div className="estudio-editor-wrap">
        <Suspense fallback={<p className="section-sub" style={{ textAlign: 'center' }}>Carregando o estúdio…</p>}>
          <MelhorarFotos />
        </Suspense>
      </div>

      <div className="container">
        <section className="estudio-faq">
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Perguntas frequentes</h2>
          <div className="estudio-faq-lista">
            {FAQ.map((f) => (
              <div className="estudio-faq-item" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 28, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" to="/ferramentas">Outras ferramentas <IconArrow /></Link>
          <a className="btn btn-gold" href={linkWhatsApp('Olá! Usei o estúdio de fotos no site e tenho uma dúvida.')} target="_blank" rel="noopener noreferrer"><IconWhats /> Falar pelo WhatsApp</a>
        </div>
      </div>
    </main>
  )
}
