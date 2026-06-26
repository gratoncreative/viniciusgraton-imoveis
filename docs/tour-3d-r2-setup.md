# Tour 3D self-service — configurar o armazenamento (R2)

A ferramenta "Crie seu Tour 3D" (`/ferramentas/criar-tour`) deixa os corretores
cadastrados subirem a cena 3D e ganharem um link hospedado no domínio. Os arquivos
(10–50 MB) ficam no **Cloudflare R2** (grátis até 10 GB e **sem custo de banda**).

Enquanto o R2 não estiver ligado, a ferramenta funciona mas o upload responde
"armazenamento ainda não configurado" — nada quebra. Para ativar (uma vez só):

## Passo a passo (painel da Cloudflare)

1. **Cloudflare Dashboard → R2 → Create bucket.**
   - Nome sugerido: `vg-tours` (região automática).
2. **Pages → (projeto do site) → Settings → Functions → R2 bucket bindings → Add binding.**
   - **Variable name:** `TOURS`  ← exatamente assim (o código procura `env.TOURS`).
   - **R2 bucket:** `vg-tours`.
   - Salve e faça um novo deploy (ou aguarde o próximo push).
3. Pronto. O upload passa a gravar no bucket e o link `/tour/<id>` serve o arquivo.

> Observação: o arquivo é servido **pela própria função** (`/api/tour3d-file/<id>.<ext>`),
> na mesma origem do site. Não precisa tornar o bucket público nem mexer no CSP.

## Como funciona o "grátis" (Fase 1)
- 1 tour ativo por corretor, com **marca d'água** no viewer e link no domínio do site.
- Expira em **30 dias** (limpeza automática na próxima vez que o corretor sobe/lista).
- Quando chegar a Fase 2 (pagamento via MercadoPago), o tier pago tira marca d'água,
  expiração e o limite de 1 tour.

## Chaves usadas no storage (KV/D1 via facade)
- `tour:meta:<id>` — metadado do tour (dono, título, r2key, expira, etc.).
- `tour:owner:<fone>` — lista de ids do corretor (para listar/checar quota).
- Arquivo no R2: `tours/<fone>/<id>.<ext>`.
