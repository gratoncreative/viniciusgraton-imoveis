import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CardImovel from '../components/CardImovel'
import { getImovel } from '../data'
import { favoritos } from '../engajamento'
import { useSEO } from '../useSEO'
import { IconArrow, IconHeart } from '../components/icons'

export default function Favoritos() {
  useSEO({
    title: 'Meus imóveis favoritos',
    description: 'Os imóveis que você salvou no site do Vinícius Graton, consultor de imóveis em Uberlândia.',
    path: '/favoritos',
  })

  const [codes, setCodes] = useState([])
  useEffect(() => {
    const ler = () => setCodes(favoritos())
    ler()
    window.addEventListener('vg-fav', ler)
    window.addEventListener('storage', ler)
    return () => {
      window.removeEventListener('vg-fav', ler)
      window.removeEventListener('storage', ler)
    }
  }, [])

  const lista = codes.map(getImovel).filter(Boolean)

  return (
    <main className="pagina section--light catalogo">
      <div className="container">
        <div className="cat-head">
          <span className="eyebrow">Meus favoritos</span>
          <h1 className="section-title">Imóveis que você <em>salvou</em></h1>
          <p className="section-sub" style={{ marginTop: 12 }}>
            Toque no coração de qualquer imóvel para guardar aqui. Fica salvo no seu navegador para você comparar com calma.
          </p>
        </div>

        {lista.length ? (
          <>
            <p className="cat-count">{lista.length} {lista.length === 1 ? 'imóvel salvo' : 'imóveis salvos'}</p>
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {lista.map((im) => <CardImovel key={im.codigo} im={im} />)}
            </div>
          </>
        ) : (
          <div className="cat-vazio">
            <p><IconHeart width={20} height={20} style={{ verticalAlign: '-4px', color: '#ff5a7a' }} /> Você ainda não salvou nenhum imóvel. Toque no coração dos imóveis que gostar para guardá-los aqui.</p>
            <Link className="btn btn-gold" to="/imoveis">Ver imóveis disponíveis <IconArrow /></Link>
          </div>
        )}
      </div>
    </main>
  )
}
