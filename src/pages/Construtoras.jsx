import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { CONSTRUTORAS } from '../data'

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
import { useSEO } from '../useSEO'
import { onImgError } from '../img'
import { IconArrow, IconBuilding, IconShield, IconSearch } from '../components/icons'

function CardConstrutora({ c }) {
  const projetos = c.projetos || []
  const capa = (projetos.find((p) => p.capa) || {}).capa
  const ativos = projetos.filter((p) => /obras|lançamento|lancamento/i.test(p.status || '')).length
  return (
    <Link className="cns-card" to={`/construtoras/${c.slug}`}>
      <span className="cns-capa">
        {capa ? <img src={capa} alt={`${c.nome} — empreendimentos em Uberlândia`} loading="lazy" referrerPolicy="no-referrer" onError={onImgError} />
          : <span className="cns-capa-vazia"><IconBuilding width={34} height={34} /></span>}
        <span className="cns-capa-grad" />
        <span className="cns-nome">{c.nome}</span>
        {projetos.length > 0 && <span className="cns-count">{projetos.length} {projetos.length === 1 ? 'empreendimento' : 'empreendimentos'}</span>}
      </span>
      <span className="cns-body">
        {c.segmento && <span className="cns-seg">{c.segmento}</span>}
        <span className="cns-projs">
          {projetos.slice(0, 3).map((p) => <span className="cns-proj" key={p.slug}>{p.nome}</span>)}
          {projetos.length > 3 && <span className="cns-proj cns-proj--mais">+{projetos.length - 3}</span>}
        </span>
        <span className="cns-ver">{ativos > 0 ? `${ativos} com obra ativa · ` : ''}Ver lançamentos <IconArrow width={14} height={14} /></span>
      </span>
    </Link>
  )
}

export default function ConstrutorasPage() {
  useSEO({
    title: 'Construtoras de Uberlândia e seus lançamentos',
    description:
      'As principais construtoras e incorporadoras de Uberlândia e seus empreendimentos atuais — Perplan, R. Freitas, Bild, MRV, ZP, ATP, Maxi, Castelo Real e mais. Veja os lançamentos e fale com o Vinícius para visitar.',
    path: '/construtoras',
  })

  const [q, setQ] = useState('')
  const totalEmp = CONSTRUTORAS.reduce((n, c) => n + (c.projetos || []).length, 0)
  // ordena por quantidade de empreendimentos (vitrine mais cheia primeiro)
  const lista = [...CONSTRUTORAS].sort((a, b) => (b.projetos || []).length - (a.projetos || []).length)
  // busca por nome da construtora, segmento OU nome de empreendimento
  const termo = norm(q.trim())
  const filtrada = !termo ? lista : lista.filter((c) =>
    norm(c.nome).includes(termo) || norm(c.segmento).includes(termo) || (c.projetos || []).some((p) => norm(p.nome).includes(termo)))

  return (
    <main className="pagina section--light det construtoras-index">
      <div className="container">
        <Reveal>
          <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 8px' }}>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Lançamentos em Uberlândia</span>
            <h1 className="section-title">As principais <em>construtoras</em> da cidade</h1>
            <p className="section-sub" style={{ marginTop: 14 }}>
              Acompanho os lançamentos das maiores construtoras de Uberlândia e faço a curadoria de cada um. Clique numa marca para ver os empreendimentos com fotos, plantas, vídeos e tudo sobre o projeto — sem precisar sair do meu site.
            </p>
          </div>
        </Reveal>

        <div className="cns-stats">
          <div className="cns-stat"><b>{CONSTRUTORAS.length}</b><span>construtoras</span></div>
          <div className="cns-stat"><b>{totalEmp}</b><span>empreendimentos</span></div>
          <div className="cns-stat"><b>100%</b><span>com curadoria</span></div>
        </div>

        <div className="cns-busca-wrap">
          <IconSearch className="cns-busca-ico" width={19} height={19} />
          <input
            className="cns-busca"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por construtora ou empreendimento (ex.: Perplan, Chronos Tower)"
            aria-label="Buscar construtora ou empreendimento"
          />
          {termo && <span className="cns-busca-res">{filtrada.length} {filtrada.length === 1 ? 'resultado' : 'resultados'}</span>}
        </div>

        {filtrada.length > 0 ? (
          <div className="cns-grid">
            {filtrada.map((c) => <CardConstrutora key={c.slug} c={c} />)}
          </div>
        ) : (
          <p className="section-sub" style={{ textAlign: 'center', margin: '10px auto 0' }}>
            Não achei "<b>{q}</b>". Tenta outro nome — ou me chama no WhatsApp que eu localizo pra você.
          </p>
        )}

        <div className="det-trust" style={{ marginTop: 34, maxWidth: 900 }}>
          <IconShield width={20} height={20} />
          <p><b>Eu faço a curadoria de cada empreendimento.</b> Confiro construtora, documentação, localização e padrão de entrega antes de te indicar — e te acompanho da visita à entrega das chaves. Marcas, imagens e materiais são das respectivas construtoras.</p>
        </div>
      </div>
    </main>
  )
}
