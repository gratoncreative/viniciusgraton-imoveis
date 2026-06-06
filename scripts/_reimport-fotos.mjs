/* Reimporta TODAS as fotos (alta resolução) dos 6 imóveis de moderação.
   Hospeda em public/imoveis/{cod}.jpg (capa) e public/imoveis/{cod}/{n}.jpg (galeria).
   O download confirma cada URL — falhas são listadas no fim. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMG = resolve(ROOT, 'public/imoveis')
const JSON_PATH = resolve(ROOT, 'src/imoveis-destaque.json')
const BASE = (cod) => `https://cdn.imoview.com.br/rotina/Imoveis/${cod}/`

const GAL = {
  '99549': [
    '71lesj-whatsapp-image-2026-06-03-at-181857-1780522072.jpeg',
    'skfm9-whatsapp-image-2026-06-03-at-181856-2-1780522072.jpeg',
    '135on-whatsapp-image-2026-06-03-at-181857-1-1780522072.jpeg',
    '9ztv6g-whatsapp-image-2026-06-03-at-181856-1-1780522072.jpeg',
    'wkh9v-whatsapp-image-2026-06-03-at-181858-1780522072.jpeg',
    'xny4a-whatsapp-image-2026-06-03-at-181857-2-1780522072.jpeg',
    'q4o0v-whatsapp-image-2026-06-03-at-181858-1-1780522072.jpeg',
    '9gudx-whatsapp-image-2026-06-03-at-181852-1780522072.jpeg',
    'ogz8g-whatsapp-image-2026-06-03-at-181852-1-1780522072.jpeg',
    'sqypn-whatsapp-image-2026-06-03-at-181854-1-1780522072.jpeg',
    'ep95e-whatsapp-image-2026-06-03-at-181854-2-1780522072.jpeg',
    '2mzi7-whatsapp-image-2026-06-03-at-181852-2-1780522073.jpeg',
    'qa9px-whatsapp-image-2026-06-03-at-181853-1780522073.jpeg',
    '3962g-whatsapp-image-2026-06-03-at-181856-1780522073.jpeg',
    '0tw6h-whatsapp-image-2026-06-03-at-181854-1780522073.jpeg',
    '5sorb-whatsapp-image-2026-06-03-at-181853-2-1780522073.jpeg',
    'nfys2-whatsapp-image-2026-06-03-at-181853-1-1780522073.jpeg',
    'h8k1s-whatsapp-image-2026-06-03-at-181857-3-1780522072.jpeg',
    '9lfyy-whatsapp-image-2026-06-03-at-181858-2-1780522073.jpeg',
  ],
  '99629': [
    '07hpo-a15cbb79-e07e-4058-8bff-236c73c744c8-1780529816.jpg',
    'etudl-b3d329ac-4ca2-4ede-a7d7-b8fb8d7034dc-1780529816.jpg',
    'kxx4i-5148824a-f33f-4718-8888-4d3ca0408190-1780529816.jpg',
    'rhevd-c53f085d-1879-40c3-8426-12858103fd48-1780529816.jpg',
    'ar4oc-a148fdbe-74f7-446f-aee6-f1d7127f7f2e-1780529816.jpg',
    '3e2mlg-f1d0cd5d-6b44-4a15-90cc-65ca53019607-1780529816.jpg',
    'vzbd2-6d08bba5-e12a-4793-973f-72861ede5f29-1780529816.jpg',
    '1mf1m-eaa22e58-96ec-4230-89a7-069245695d75-1780531134.jpg',
    '2c9qj-89af7a3b-f5cc-48c6-8e7b-d8805d9326fa-1780529816.jpg',
    'nrxwf-0ec30113-37e9-49c5-9257-c0acda92229e-1780531134.jpg',
    '1v6nq-f7a18193-6e3c-494a-a3d4-6ce3da9d31a3-1780529816.jpg',
    'rgsyki-148bc956-1900-42c2-8ff8-fb76fe4acb5e-1780529816.jpg',
    'gfzql-a6e951c9-d3e9-4f74-b83b-4c377455359c-1780531134.jpg',
    '2xxohf-2bff892c-dfab-479c-98b4-21b48c5f8965-1780531134.jpg',
    'rma8pl-e64581b2-2a22-4292-91b4-62609d53ab62-1780531134.jpg',
    'wkdbs-815bc35a-6c0e-4c97-977c-262a5da4b9f8-1780529816.jpg',
    'roth8h-a2348bc9-cb51-4a05-902b-8e7ad0146ef3-1780531134.jpg',
    'sf8tq-a537b765-1ee1-4c6b-aa1e-fea10fb4f58a-1780531134.jpg',
    '5t5im-85221556-1ce0-4d78-831b-d95721d51f9e-1780529816.jpg',
    'w21un-02603375-5c86-4b07-92c2-0c18396718ce-1780529816.jpg',
    'y6onv-505f5e47-75c8-44b9-9200-b7af1e7917ff-1780529816.jpg',
    'cyrbej-67afc90c-785c-45ff-9bd5-260189deec05-1780529816.jpg',
    '3go3t-4ba0a814-eba1-4059-8612-28f3d43a3ce5-1780529816.jpg',
    'zprti-7d71d825-7f1c-43d0-b2b9-e3b08dd8f5b9-1780531134.jpg',
    'qsgf4-692f7504-40dd-4e91-980a-c309819a0bb3-1780529816.jpg',
    '83ep2-6649a642-05eb-4266-b437-b1821d811b0f-1-1780529816.jpg',
    'vsw4g-f2f84fc8-0a19-4bf0-bf26-66099011d23c-1780529816.jpg',
  ],
  '99474': [
    's0ndv-whatsapp-image-2026-06-03-at-160139-1780513572.jpeg',
    'hgsjsl-whatsapp-image-2026-06-03-at-160139-4-1780513572.jpeg',
    'aivai-whatsapp-image-2026-06-03-at-160143-3-1780513572.jpeg',
    'a2mo5-whatsapp-image-2026-06-03-at-160142-2-1780513572.jpeg',
    'ry9rr-whatsapp-image-2026-06-03-at-160142-3-1780513572.jpeg',
    '0tsx7f-whatsapp-image-2026-06-03-at-160141-2-1780513572.jpeg',
    '7dmdo-whatsapp-image-2026-06-03-at-160140-4-1780513572.jpeg',
    'av5er-whatsapp-image-2026-06-03-at-160144-1780513572.jpeg',
    'jfz4n-whatsapp-image-2026-06-03-at-160140-1780513572.jpeg',
    'lutoa-whatsapp-image-2026-06-03-at-160141-1-1780513572.jpeg',
    '9g32s-whatsapp-image-2026-06-03-at-160144-1-1780513572.jpeg',
    'nbn8l-whatsapp-image-2026-06-03-at-160141-3-1780513572.jpeg',
    'cq2p2-whatsapp-image-2026-06-03-at-160140-3-1780513572.jpeg',
    'lh3tt-whatsapp-image-2026-06-03-at-160143-1-1780513572.jpeg',
    '3bxfw-whatsapp-image-2026-06-03-at-160144-3-1780513572.jpeg',
    '72ypu-whatsapp-image-2026-06-03-at-160143-4-1780513572.jpeg',
    '1dvtv-whatsapp-image-2026-06-03-at-160142-1780513572.jpeg',
    'sopbek-whatsapp-image-2026-06-03-at-160143-2-1780513572.jpeg',
    '8j26p-whatsapp-image-2026-06-03-at-160139-1-1780513572.jpeg',
    'xutd1-whatsapp-image-2026-06-03-at-160140-1-1780513572.jpeg',
    'bzasi-whatsapp-image-2026-06-03-at-160143-1780513572.jpeg',
    'bkdt6-whatsapp-image-2026-06-03-at-160140-2-1780513572.jpeg',
    'xse43-whatsapp-image-2026-06-03-at-160139-3-1780513572.jpeg',
    'cfskv-whatsapp-image-2026-06-03-at-160144-2-1780513572.jpeg',
    'ejqge-whatsapp-image-2026-06-03-at-160142-1-1780513572.jpeg',
    'no9oe-whatsapp-image-2026-06-03-at-160142-4-1780513572.jpeg',
    '5fv2bi-whatsapp-image-2026-06-03-at-160141-4-1780513572.jpeg',
  ],
  '99660': [
    '24mao-whatsapp-image-2026-06-04-at-131908-1780595235.jpeg',
    '4h10z-whatsapp-image-2026-06-04-at-131906-1780595235.jpeg',
    '26xe9-whatsapp-image-2026-06-04-at-131905-1780595235.jpeg',
    'vtzku-whatsapp-image-2026-06-04-at-131903-1780595235.jpeg',
    'c4di9-whatsapp-image-2026-06-04-at-131902-1780595235.jpeg',
    'wbw33g-whatsapp-image-2026-06-04-at-131856-1780595235.jpeg',
    'k28ah-whatsapp-image-2026-06-04-at-131849-1780595235.jpeg',
    'qqobw-whatsapp-image-2026-06-04-at-131847-1780595235.jpeg',
    'ah30i-whatsapp-image-2026-06-04-at-131844-1780595235.jpeg',
    'tul45-whatsapp-image-2026-06-04-at-131842-1780595235.jpeg',
    'ysk6gg-whatsapp-image-2026-06-04-at-131814-1780595235.jpeg',
    '65k99-whatsapp-image-2026-06-04-at-131806-1780595235.jpeg',
    'sjii7-whatsapp-image-2026-06-04-at-131758-1780595235.jpeg',
    'adnpr-whatsapp-image-2026-06-04-at-131901-1780595235.jpeg',
  ],
  '99661': [
    'siws9-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    '8fkw4-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'evil1-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    '3b149-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'fqyz8-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'fyvdg-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    '7nzexg-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas--1780614408.jpeg',
    '51uu7-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'z9t8g-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'gic41-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'aknuh-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'lxq9g-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'vgzpl-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'yys9l-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'mb31q-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'dmrvm-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'chk5p-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'sxvtb-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'uwt17-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'ksyykj-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas--1780614408.jpeg',
    '2g1r9-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'c3rxy-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    '4tywvf-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas--1780614408.jpeg',
    'crate-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'y4az6-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'bx321-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    'vgtarh-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas--1780614408.jpeg',
    'oq6zp-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
    '7zi7q-uberlandia-apto-planejado-3-quartos-1-suite-banh-social-sala-em-dois-ambientes-cozinha-e-area-de-servico-com-armarios-2-vagas-2-1780614408.jpeg',
  ],
  '99658': [
    '1tz4l-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    'zy3ur-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    'ydhjd-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    '2vsuuj-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubali-1780584859.jpeg',
    'bvjkc-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    'y72n9-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    '66274-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    'u1gp2-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
    'byfws-uberlandia-apto-3-quartos-1-suite-banheiro-social-cozinha-e-area-de-servico-conjugada-1-vaga-port-24-hs-bairro-chacaras-tubalin-1780584859.jpeg',
  ],
}

function jpegSize(buf) {
  try {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
    let o = 2
    while (o < buf.length - 8) {
      if (buf[o] !== 0xff) { o++; continue }
      const m = buf[o + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) }
      o += 2 + buf.readUInt16BE(o + 2)
    }
  } catch {}
  return null
}

function baixar(url, dest) {
  return new Promise((res) => {
    https.get(url, (r) => {
      if (r.statusCode !== 200) { r.resume(); return res({ ok: false, status: r.statusCode }) }
      const b = []
      r.on('data', (d) => b.push(d))
      r.on('end', () => { const o = Buffer.concat(b); writeFileSync(dest, o); res({ ok: true, dim: jpegSize(o), kb: Math.round(o.length / 1024) }) })
    }).on('error', (e) => res({ ok: false, erro: e.message }))
  })
}

const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
const falhas = []
for (const [cod, nomes] of Object.entries(GAL)) {
  mkdirSync(resolve(IMG, cod), { recursive: true })
  const fotos = []
  for (let i = 0; i < nomes.length; i++) {
    const url = BASE(cod) + nomes[i]
    const dest = i === 0 ? resolve(IMG, `${cod}.jpg`) : resolve(IMG, cod, `${i + 1}.jpg`)
    const rel = i === 0 ? `/imoveis/${cod}.jpg` : `/imoveis/${cod}/${i + 1}.jpg`
    const r = await baixar(url, dest)
    if (r.ok) { fotos.push(rel); if (i === 0) console.log(`  capa ${cod}: ${r.dim ? r.dim.w + 'x' + r.dim.h : '?'} ${r.kb}KB`) }
    else { falhas.push(`${cod}#${i + 1} (${r.status || r.erro}) ${nomes[i].slice(0, 30)}`) }
  }
  const im = data.imoveis.find((x) => x.codigo === cod)
  if (im) { im.img = fotos[0]; im.fotos = fotos }
  console.log(`✓ ${cod}: ${fotos.length}/${nomes.length} fotos hospedadas`)
}
writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n')
console.log(`\n${falhas.length ? '⚠ FALHAS:\n  ' + falhas.join('\n  ') : '✓ Sem falhas — todas as fotos baixadas.'}`)
