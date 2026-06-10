// Setores (zonas) de Uberlândia — agrupa os bairros por região no seletor.
// Primeira versão: bairros conhecidos classificados; o resto cai em "Outros".
// Ajuste fácil: é só mover o nome do bairro para o setor certo abaixo.
const _n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

const MAPA = {
  'Central': ['Centro', 'Fundinho', 'Nossa Senhora Aparecida', 'Aparecida', 'Tabajaras', 'Lídice', 'Martins', 'Cazeca', 'Bom Jesus', 'Brasil', 'Daniel Fonseca', 'Osvaldo Rezende', 'Saraiva'],
  'Zona Sul': ['Morada da Colina', 'Jardim Karaíba', 'Cidade Jardim', 'Gávea', 'Patrimônio', 'Vigilato Pereira', 'Carajás', 'Tubalina', 'Jardim Inconfidência', 'Laranjeiras', 'Granada', 'Lagoinha', 'Shopping Park', 'Nova Uberlândia', 'Jardim Finotti', 'Mansões Aeroporto', 'Granja Marileusa', 'Jardim Holanda'],
  'Zona Leste': ['Santa Mônica', 'Tibery', 'Aclimação', 'Custódio Pereira', 'Morumbi', 'Alto Umuarama', 'Umuarama', 'Segismundo Pereira', 'Jardim Ipanema', 'Dona Zulmira', 'São Jorge', 'Residencial Integração'],
  'Zona Norte': ['Presidente Roosevelt', 'Maravilha', 'Marta Helena', 'Nossa Senhora das Graças', 'Santa Rosa', 'Minas Gerais', 'Pacaembu', 'Jardim Brasília', 'Distrito Industrial'],
  'Zona Oeste': ['Luizote de Freitas', 'Tocantins', 'Jardim das Palmeiras', 'Mansour', 'Guarani', 'Jardim Europa', 'Taiaman', 'Chácaras Tubalina', 'Jardim Canaã', 'Morada Nova'],
}

const LOOKUP = {}
for (const [setor, lista] of Object.entries(MAPA)) for (const b of lista) LOOKUP[_n(b)] = setor

export const ORDEM_SETORES = ['Central', 'Zona Sul', 'Zona Leste', 'Zona Norte', 'Zona Oeste', 'Outros']
export const setorDoBairro = (nome) => LOOKUP[_n(nome)] || 'Outros'

// recebe a lista de bairros e devolve [{ setor, bairros: [...] }] na ordem das zonas
export function agruparPorSetor(bairros) {
  const grupos = {}
  for (const b of bairros) { const s = setorDoBairro(b); (grupos[s] = grupos[s] || []).push(b) }
  return ORDEM_SETORES
    .filter((s) => grupos[s] && grupos[s].length)
    .map((s) => ({ setor: s, bairros: grupos[s].sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
}
