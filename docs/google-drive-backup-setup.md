# Subir o backup do bairro pro Google Drive — configurar (1 passo)

O botão **"☁ Subir bairro pro Google Drive"** (no painel do Proprietário, dentro de cada
imóvel quando você está logado como admin) gera o mesmo `.zip` do bairro inteiro e o envia
**direto pro seu Google Drive**, sem baixar no PC e sem passar por servidor nosso.

Ele reaproveita o **mesmo Client ID do Google** do "Entrar com Google" (já configurado em
`CONFIG.googleClientId`). Falta só **ativar a API do Drive** no mesmo projeto:

## Passo único (Google Cloud Console)

1. Acesse <https://console.cloud.google.com/> com a sua conta Google (a dona do site).
2. Selecione o **mesmo projeto** do login do site (o do Client ID `522410029650-…`,
   projeto **gen-lang-client**).
3. Menu **APIs e serviços → Biblioteca** → procure **"Google Drive API"** → **Ativar**.
4. Pronto. Recarregue o site (Ctrl+Shift+R) e use o botão.

> Não precisa criar Client ID novo, nem chave, nem mexer em domínios — o site
> `viniciusgraton.com.br` já é origem autorizada (o login do Google já funciona).

## O que acontece quando você clica

1. Abre a janela do Google pedindo permissão. O escopo é o **mínimo `drive.file`**:
   o app só consegue **ver e gravar os arquivos/pastas que ELE cria** — não enxerga o
   resto do seu Drive. Você autoriza uma vez (vale ~1h por sessão).
2. O app cria (ou reusa) a pasta **"Rotina Imóveis — Backups"** no seu Drive e sobe o
   `.zip` do bairro lá, com barra de progresso real do envio.
3. Aparece o link **"Abrir a pasta no Google Drive →"**.

## Quer que fique dentro de ROTINA › ROTINA IMOVEIS?

Como o escopo é o seguro `drive.file`, o app não consegue escrever numa pasta que **você**
criou à mão. Solução simples: depois do primeiro envio, **arraste a pasta
"Rotina Imóveis — Backups" pra dentro de `ROTINA › ROTINA IMOVEIS`** no seu Drive. O app
continua acessando normalmente (a permissão é por pasta, não por local) e os próximos
envios caem lá dentro.

> Se um dia você quiser que ele grave direto numa pasta SUA já existente (sem arrastar),
> dá pra trocar pelo escopo amplo `drive` — aí o app precisa de verificação/aviso do Google.
> Por padrão deixamos no `drive.file` (mais seguro e sem fricção).

## Trocar o nome da pasta

Edite `CONFIG.googleDriveFolderName` em `src/data.js` (padrão: `Rotina Imóveis — Backups`).
