# Backup automático dos dados do site — configurar (uma vez)

O site faz, **sozinho todo dia**, um backup dos dados que **só existem nele** (e não na
Rotina nem no GitHub): CRM, leads, clientes, **proprietários captados**, conversões, config
e um snapshot do catálogo. Vai pro **Cloudflare R2** (bucket `vg-backups`), versionado por dia
(`backup/dados/AAAA-MM-DD.json`) + uma cópia `backup/dados/atual.json`.

> Por que isso é o "seguro de verdade": o **código** já está no GitHub e as **fotos/dados dos
> imóveis** já vivem na Rotina/Imoview. O único dado insubstituível é o do CRM/proprietários —
> e é ele que este backup protege, automaticamente, sem ninguém precisar lembrar de rodar.

## Passo a passo (uma vez só)

1. **Gere um segredo** (uma senha aleatória qualquer, ex.: 32 caracteres). Pode ser
   `openssl rand -hex 24` ou qualquer gerador. Guarde esse valor.

2. **Cloudflare** → Pages → projeto do site → **Settings → Environment variables** →
   adicione **`BACKUP_CRON_KEY`** = o segredo. (E confirme que o binding **R2 `BACKUPS`** →
   bucket `vg-backups` já existe; se não, ver `docs/backup-r2-setup.md`.) Salve e faça um deploy.

3. **GitHub** → repositório `gratoncreative/viniciusgraton-imoveis` → **Settings → Secrets and
   variables → Actions → New repository secret** → nome **`BACKUP_CRON_KEY`**, valor = **o MESMO
   segredo** do passo 1.

4. Pronto. O backup roda **todo dia às 03:00 (Brasília)**. Para testar agora: GitHub →
   aba **Actions** → "Backup diário do site" → **Run workflow**. Deve responder `HTTP 200` com a
   contagem (leads, clientes, proprietários, etc.).

## Como baixar / restaurar

- No **/admin → 💾 Backup geral** dá pra baixar o `backup/dados/atual.json` (botão).
- Ou direto no painel da Cloudflare → R2 → `vg-backups` → `backup/dados/`.
- O `.json` tem tudo estruturado por tipo (crm, leads, clientes, imoveis com proprietário…),
  pronto pra reimportar se algum dia precisar.

## Camadas (visão geral)

- **Diário (este):** dados insubstituíveis + snapshot do catálogo. Leve, automático. ← o seguro.
- **Sob demanda (já existe):** "Subir bairro pro Google Drive" / "Backup geral" no /admin.
- **Fotos (pesado, opcional):** as imagens já estão na Rotina/CDN; um arquivo completo das
  fotos pode ser feito à parte (server-side em lote), mas não é o crítico.

## Captação automática de proprietários (3ª etapa)

A mesma chave `BACKUP_CRON_KEY` liga também o `/api/captar-cron` (GitHub Actions
"Captar proprietários (gradual)"), que vai captando o proprietário de cada imóvel **aos
poucos** (≈4 por chamada, algumas vezes por dia) e salvando no cache — sem login em massa
no Imoview. Em ~1-2 semanas o cache fica completo e os backups passam a incluir os donos.
**Não precisa de setup novo**: usa a MESMA `BACKUP_CRON_KEY` (Cloudflare + GitHub) do backup.
Se o Imoview recusar um login, o cron para na hora (protege a conta) e tenta de novo depois.
Acompanhe o progresso em /admin → 💾 Backup geral (linha "Captação automática de proprietários").

## Segurança

O endpoint `/api/backup-cron` exige a chave secreta `BACKUP_CRON_KEY` (header `x-backup-key`),
nunca o token de admin. O backup contém **dados pessoais** (LGPD) — fica no **seu** R2 privado,
nunca exposto. Trate o bucket `vg-backups` e o segredo como confidenciais.
