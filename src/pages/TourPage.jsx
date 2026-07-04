import { useEffect, useState, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSEO } from '../useSEO'
import { lazyRetry } from '../lazyRetry'

// Página PÚBLICA de um tour 3D hospedado (link compartilhável). Reusa o viewer.
const Tour3D = lazyRetry(() => import('../components/Tour3D'))

const Centro = ({ children }) => (
  <main className="pagina section--light" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="container" style={{ textAlign: 'center', padding: '40px 0' }}>{children}</div>
  </main>
)

export default function TourPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('carregando') // carregando | ok | expirado | erro
  const [tour, setTour] = useState(null)

  useSEO({ title: tour?.titulo ? `${tour.titulo} · Tour 3D` : 'Tour 3D', description: 'Tour 3D navegável do imóvel.', path: `/tour/${id || ''}`, noindex: true })

  useEffect(() => {
    let vivo = true
    fetch('/api/tour3d?id=' + encodeURIComponent(id || ''), { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ s: r.status, j })))
      .then(({ s, j }) => {
        if (!vivo) return
        if (j && j.ok) { setTour(j.tour); setEstado('ok') }
        else setEstado(s === 410 || j.expirado ? 'expirado' : 'erro')
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [id])

  if (estado === 'carregando') return <Centro><span className="rota-spinner" /></Centro>

  if (estado !== 'ok') return (
    <Centro>
      <h1 className="section-title" style={{ marginBottom: 8 }}>{estado === 'expirado' ? 'Este tour 3D expirou' : 'Tour 3D não encontrado'}</h1>
      <p className="section-sub" style={{ marginBottom: 20 }}>
        {estado === 'expirado' ? 'O link deste tour não está mais disponível.' : 'O link pode estar errado ou o tour foi removido.'}
      </p>
      <Link to="/" className="btn btn-navy">Voltar ao início</Link>
    </Centro>
  )

  return (
    <Suspense fallback={<Centro><span className="rota-spinner" /></Centro>}>
      <Tour3D url={tour.fileUrl} titulo={tour.titulo} marca={tour.plano !== 'pro'} onClose={() => navigate('/')} />
    </Suspense>
  )
}
