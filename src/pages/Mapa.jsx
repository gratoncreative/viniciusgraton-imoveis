import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Reveal from '../components/Reveal'
import CardImovel from '../components/CardImovel'
import { IMOVEIS } from '../data'
import { useSEO } from '../useSEO'
import { IconArrow } from '../components/icons'

// Coordenadas aproximadas [lng, lat] dos principais bairros de Uberlândia
const BAIRROS_GEO = {
  'Alphaville': [-48.222, -18.878],
  'Alphaville I': [-48.220, -18.875],
  'Alphaville II': [-48.218, -18.872],
  'Mansões Aeroporto': [-48.222, -18.880],
  'City Uberlândia': [-48.226, -18.873],
  'Aeroporto': [-48.218, -18.882],
  'Taiaman': [-48.258, -18.877],
  'Marta Helena': [-48.248, -18.878],
  'Vigilato Pereira': [-48.264, -18.884],
  'Morada dos Pássaros': [-48.277, -18.878],
  'Morumbi': [-48.303, -18.876],
  'Alvorada': [-48.306, -18.882],
  'Tibery': [-48.243, -18.892],
  'Belvedere': [-48.233, -18.884],
  'Leopoldino de Oliveira': [-48.270, -18.878],
  'Canaã': [-48.239, -18.887],
  'Jardim Canaã': [-48.239, -18.887],
  'Cazeca': [-48.290, -18.887],
  'Irmãos Fernandes': [-48.296, -18.887],
  'Tambor': [-48.242, -18.878],
  'Novo Mundo': [-48.279, -18.895],
  'Centro': [-48.276, -18.914],
  'Tabajaras': [-48.268, -18.903],
  'Saraiva': [-48.259, -18.905],
  'Brasil': [-48.282, -18.900],
  'Lagoinha': [-48.261, -18.892],
  'São Pedro': [-48.291, -18.900],
  'Planalto': [-48.300, -18.892],
  'Tubalina': [-48.286, -18.905],
  'Bom Jesus': [-48.301, -18.907],
  'Jaraguá': [-48.295, -18.906],
  'Dona Zulmira': [-48.296, -18.903],
  'Presidente Roosevelt': [-48.255, -18.908],
  'Martins': [-48.273, -18.913],
  'Fundinho': [-48.278, -18.911],
  'Patrimônio': [-48.265, -18.910],
  'Lídice': [-48.298, -18.912],
  'Cruzeiro do Sul': [-48.288, -18.908],
  'Chácaras Tubalina e Quartel': [-48.308, -18.913],
  'Morada Nova': [-48.302, -18.916],
  'Minas Gerais': [-48.282, -18.907],
  'Pacaembu': [-48.295, -18.913],
  'Luizote de Freitas': [-48.318, -18.905],
  'Tocantins': [-48.290, -18.896],
  'São Jorge': [-48.313, -18.899],
  'Chácaras Eldorado': [-48.318, -18.888],
  'Chácaras Oliveiras': [-48.330, -18.895],
  'Gávea': [-48.237, -18.904],
  'Gávea Sul': [-48.237, -18.910],
  'Custódio Pereira': [-48.241, -18.913],
  'Pampulha': [-48.220, -18.915],
  'Guarani': [-48.246, -18.907],
  'Jardim América': [-48.233, -18.916],
  'Aclimação': [-48.243, -18.901],
  'Santa Luzia': [-48.252, -18.895],
  'Shopping Park': [-48.221, -18.929],
  'Buritis': [-48.215, -18.912],
  'Umuarama': [-48.234, -18.924],
  'Alto Umuarama': [-48.228, -18.930],
  'Jardim Holanda': [-48.220, -18.920],
  'Jardim Botânico': [-48.225, -18.918],
  'Jardim Europa': [-48.238, -18.910],
  'Residencial Integração': [-48.232, -18.908],
  'Nova Uberlândia': [-48.246, -18.918],
  'Santa Mônica': [-48.258, -18.921],
  'Segismundo Pereira': [-48.274, -18.920],
  'Osvaldo Rezende': [-48.267, -18.917],
  'Nossa Senhora das Graças': [-48.260, -18.925],
  'Nossa Senhora Aparecida': [-48.268, -18.922],
  'Daniel Fonseca': [-48.281, -18.919],
  'Mansour': [-48.255, -18.917],
  'Laranjeiras': [-48.287, -18.926],
  'Jardim das Palmeiras': [-48.293, -18.929],
  'Jardim Brasília': [-48.297, -18.901],
  'Ipanema': [-48.268, -18.926],
  'Jardim Ipanema': [-48.258, -18.927],
  'Cidade Jardim': [-48.262, -18.940],
  'Carajás': [-48.283, -18.944],
  'Bosque dos Buritis': [-48.295, -18.940],
  'Jardim Karaíba': [-48.313, -18.944],
  'Altamira': [-48.262, -18.946],
  'Bem Viver': [-48.300, -18.948],
  'Bem Viver Sul': [-48.298, -18.950],
  'Portal do Vale': [-48.248, -18.938],
  'Santa Maria': [-48.270, -18.933],
  'Jardim Sul': [-48.293, -18.937],
  'Jardim Finotti': [-48.290, -18.935],
  'Granja Marileusa': [-48.216, -18.930],
  'Jardim Califórnia': [-48.240, -18.926],
  'Jardim Colina': [-48.231, -18.926],
  'Jardim Inconfidência': [-48.284, -18.930],
  'Jardim Patrícia': [-48.253, -18.930],
  'Panorama': [-48.270, -18.928],
  'Maravilha': [-48.262, -18.937],
  'Granada': [-48.310, -18.917],
  'Santa Rosa': [-48.305, -18.922],
  'Jardim das Hortênsias': [-48.305, -18.929],
  'Jóquei Camping': [-48.250, -18.932],
  'GSP Arts': [-48.275, -18.940],
  'Vida Nova': [-48.290, -18.952],
  'Residencial Gramado': [-48.301, -18.937],
  'Residencial Fruta do Conde': [-48.308, -18.943],
  'Residencial Reserva dos Ipês': [-48.303, -18.941],
  'Cond. Alphaville I': [-48.222, -18.875],
  'Cond. Gávea Hill I': [-48.237, -18.904],
  'Cond. Gávea Hill II': [-48.237, -18.906],
  'Cond. Gávea Paradiso': [-48.235, -18.909],
  'Cond. GSP Arts': [-48.275, -18.940],
  'Cond. Jardins Barcelona': [-48.296, -18.930],
  'Cond. Jardins Gênova': [-48.298, -18.932],
  'Cond. Jardins Roma': [-48.300, -18.934],
  'Cond. Jardim Versailles': [-48.293, -18.938],
  'Cond. Cyrela Buritis': [-48.218, -18.912],
  'Cond. Cyrela Ipês': [-48.220, -18.910],
  'Cond. Golden Village': [-48.260, -18.945],
  'Cond. Mirante do Lago': [-48.288, -18.940],
  'Cond. Paradiso Ecológico': [-48.315, -18.940],
  'Cond. Terra Nova II': [-48.295, -18.955],
  'Cond. Terras Alpha': [-48.230, -18.873],
  'Cond. Varanda Sul': [-48.285, -18.947],
  'Cond. Reserva do Vale': [-48.295, -18.942],
  'Cond. Raros': [-48.308, -18.946],
  'Tambore': [-48.242, -18.878],
  'Zona Rural': [-48.250, -18.960],
  'Área Rural de Uberlândia': [-48.250, -18.960],
}

const CENTRO_UDI = [-48.2772, -18.9186]
const ZOOM_INICIAL = 12

function coordBairro(nome) {
  if (!nome) return CENTRO_UDI
  if (BAIRROS_GEO[nome]) return BAIRROS_GEO[nome]
  const n = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  for (const [k, v] of Object.entries(BAIRROS_GEO)) {
    if (k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === n) return v
  }
  return CENTRO_UDI
}

const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/" target="_blank">CARTO</a>',
      maxzoom: 20,
    },
  },
  layers: [{ id: 'bg', type: 'raster', source: 'carto' }],
}

export default function Mapa() {
  useSEO({
    title: 'Imóveis no mapa de Uberlândia',
    description: 'Explore os imóveis à venda por bairro no mapa de Uberlândia. Clique em qualquer região para ver as opções disponíveis.',
    path: '/mapa',
  })

  const mapEl = useRef(null)
  const mapaRef = useRef(null)
  const listaRef = useRef(null)

  const porBairro = useMemo(() => {
    const m = {}
    for (const im of IMOVEIS) { if (im.bairro) (m[im.bairro] = m[im.bairro] || []).push(im) }
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length)
  }, [])

  const [bairroSel, setBairroSel] = useState(null)
  const lista = useMemo(() => porBairro.find(([b]) => b === bairroSel)?.[1] || [], [porBairro, bairroSel])

  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: porBairro.map(([b, ims]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coordBairro(b) },
      properties: { bairro: b, count: ims.length },
    })),
  }), [porBairro])

  const selecionarBairro = useCallback((nome) => {
    setBairroSel(nome)
    requestAnimationFrame(() => {
      listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  // Inicializa o mapa
  useEffect(() => {
    if (!mapEl.current || mapaRef.current) return

    const map = new maplibregl.Map({
      container: mapEl.current,
      style: MAP_STYLE,
      center: CENTRO_UDI,
      zoom: ZOOM_INICIAL,
      attributionControl: { compact: true },
    })
    mapaRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource('bairros', { type: 'geojson', data: geojson })

      // Halo de seleção (anel dourado ao redor do marcador selecionado)
      map.addLayer({
        id: 'bairros-halo',
        type: 'circle',
        source: 'bairros',
        filter: ['==', ['get', 'bairro'], ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 18, 20, 26, 100, 36],
          'circle-color': 'rgba(224,181,86,0)',
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255,220,100,0.9)',
        },
      })

      // Círculo principal de cada bairro
      map.addLayer({
        id: 'bairros-circle',
        type: 'circle',
        source: 'bairros',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 10, 10, 16, 50, 22, 200, 30],
          'circle-color': ['case',
            ['==', ['get', 'bairro'], bairroSel || ''], '#e0b556',
            '#b8862f',
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['case',
            ['==', ['get', 'bairro'], bairroSel || ''], 'rgba(255,220,100,0.8)',
            'rgba(184,134,47,0.5)',
          ],
        },
      })

      // Contagem de imóveis dentro do círculo
      map.addLayer({
        id: 'bairros-label',
        type: 'symbol',
        source: 'bairros',
        layout: {
          'text-field': ['to-string', ['get', 'count']],
          'text-size': 11,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#1a1000',
          'text-halo-width': 0.5,
          'text-halo-color': 'rgba(0,0,0,0.15)',
        },
      })

      map.on('click', 'bairros-circle', (e) => {
        const feat = e.features?.[0]
        if (!feat) return
        const nome = feat.properties.bairro
        selecionarBairro(nome)
        map.flyTo({ center: feat.geometry.coordinates, zoom: Math.max(map.getZoom(), 13.5), duration: 700 })
        map.setFilter('bairros-halo', ['==', ['get', 'bairro'], nome])
        map.setPaintProperty('bairros-circle', 'circle-color', ['case',
          ['==', ['get', 'bairro'], nome], '#e0b556', '#b8862f',
        ])
        map.setPaintProperty('bairros-circle', 'circle-stroke-color', ['case',
          ['==', ['get', 'bairro'], nome], 'rgba(255,220,100,0.8)', 'rgba(184,134,47,0.5)',
        ])
      })
      map.on('mouseenter', 'bairros-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'bairros-circle', () => { map.getCanvas().style.cursor = '' })
    })

    return () => { mapaRef.current = null; map.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="pagina section--light det mapa-pg">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 10px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Busca por mapa</span>
            <h1 className="section-title">Imóveis no <em>mapa de Uberlândia</em></h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Cada ponto é um bairro — o tamanho representa a concentração de imóveis.
              Clique para explorar. Por privacidade, o endereço exato eu passo no atendimento.
            </p>
          </div>
        </Reveal>

        <div className="mapa-frame-ml" ref={mapEl} />

        {!bairroSel && (
          <p className="mapa-dica">
            ↑ Clique em qualquer bairro no mapa para ver os imóveis disponíveis
          </p>
        )}

        <div ref={listaRef} style={{ scrollMarginTop: 80 }}>
          {bairroSel && (
            <h2 className="det-rel-titulo" style={{ marginTop: 36 }}>
              {lista.length} {lista.length === 1 ? 'imóvel disponível' : 'imóveis disponíveis'} em <strong>{bairroSel}</strong>
            </h2>
          )}
          {lista.length > 0 && (
            <div className="im-grid" style={{ perspective: '1400px' }}>
              {lista.map((im) => <CardImovel key={im.codigo} im={im} />)}
            </div>
          )}
        </div>

        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <Link className="btn btn-ghost" to="/imoveis">Ver catálogo completo <IconArrow /></Link>
        </div>
      </div>
    </main>
  )
}
