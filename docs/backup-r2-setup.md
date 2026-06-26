# Backup geral do cadastro — configurar o armazenamento (R2)

A aba **/admin → 💾 Backup geral** salva TODO o catálogo (≈3.400 imóveis) num backup
de segurança no **Cloudflare R2** (grátis até 10 GB e **sem custo de banda**), no seu
próprio Cloudflare. Fica organizado por bairro, com **1 arquivo `.zip` por imóvel**
contendo `dados.txt` (dados públicos + descrição + **proprietário já captado**) e a
pasta `/fotos` com todas as imagens. Na raiz ficam `catalogo.json` e `imoveis.csv`.

Enquanto o R2 não estiver ligado, a aba funciona mas mostra "armazenamento ainda não
configurado" e nada quebra. Para ativar (uma vez só):

## Passo a passo (painel da Cloudflare)

1. **Cloudflare Dashboard → R2 → Create bucket.**
   - Nome: `vg-backups` (região automática).
2. **Pages → (projeto do site) → Settings → Functions → R2 bucket bindings → Add binding.**
   - **Variable name:** `BACKUPS`  ← exatamente assim (o código procura `env.BACKUPS`).
   - **R2 bucket:** `vg-backups`.
   - Salve e faça um novo deploy (ou aguarde o próximo push).
3. Pronto. Abra **/admin → 💾 Backup geral**, clique em **Iniciar backup completo** e
   acompanhe a barra. Dá pra **pausar e continuar** quando quiser (é resumível).

## Como é gravado (organização)

```
backup/
  atual/
    catalogo.json        ← snapshot do catálogo inteiro (todos os imóveis, dados públicos)
    imoveis.csv          ← planilha de todos os imóveis (abre no Excel)
    _lista.json          ← lista de trabalho (uso interno do backup)
  imoveis/
    <bairro>/<código>.zip  ← 1 zip por imóvel: dados.txt + /fotos/01.jpg, 02.jpg…
```

- **Proprietário:** entra apenas o que **já foi captado** (cache `imovel:<cod>`). O backup
  **nunca** faz login em massa no Imoview (3.400 logins bloqueariam a conta). Imóveis ainda
  não captados entram com os dados públicos e uma nota no `dados.txt`. Para enriquecer,
  basta abrir o imóvel no painel e captar o proprietário — o próximo backup já o inclui.
- **Fotos:** baixadas direto do CDN público (até 45 por imóvel). Não passam pelo Imoview.

## Privacidade (LGPD)

O backup pode conter **dados pessoais de proprietários** (nome, telefone, e-mail, endereço).
Por isso ele é **protegido pelo token de admin** (só você dispara e baixa), fica no **seu
próprio R2** (não é serviço de terceiros) e **não** é exposto publicamente. Trate o bucket
`vg-backups` como confidencial — não torne público nem compartilhe o binding.

## Espaço (10 GB grátis)

O backup grava as fotos em caminho **fixo** (`backup/imoveis/<bairro>/<cod>.zip`), então
rodar de novo **sobrescreve** em vez de duplicar — o tamanho fica estável (~5–7 GB para o
catálogo todo). Se um dia passar de 10 GB, o R2 cobra centavos por GB extra.
