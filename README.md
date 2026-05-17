# Money Bot

Bot de WhatsApp para controle financeiro doméstico. Rodando em uma sessão própria do WhatsApp (Baileys), responde a comandos de chat para registrar contas recorrentes, marcar pagamentos, lançar gastos avulsos e mostrar o saldo do mês.

Persistência em SQLite local. Sem dependências externas além do próprio WhatsApp.

## Stack

- Node.js 20+ / TypeScript (executado via `tsx`)
- [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) para a conexão com o WhatsApp
- `better-sqlite3` para persistência
- `node-cron` e `pino` para tarefas auxiliares e logs

## Setup

```bash
pnpm install
cp .env.example .env   # ou crie o .env manualmente (ver abaixo)
pnpm start
```

Na primeira execução, um QR Code aparece no terminal — escaneie em **WhatsApp > Aparelhos conectados**. As credenciais ficam em `data/auth/` e o banco em `data/money.db`.

### Variáveis de ambiente

| Variável          | Descrição                                                             |
| ----------------- | --------------------------------------------------------------------- |
| `ALLOWED_NUMBERS` | Lista separada por vírgula dos números autorizados a usar o bot       |
| `ADMIN_NUMBER`    | Número do admin (único que pode usar comandos administrativos)        |
| `TIMEZONE`        | Fuso para o rollover mensal (ex.: `America/Manaus`)                   |
| `DB_PATH`         | Caminho do SQLite (default `./data/money.db`)                         |
| `AUTH_DIR`        | Diretório das credenciais Baileys (default `./data/auth`)             |

### Scripts

- `pnpm start` — produção (sem watch)
- `pnpm dev` — watch via `tsx watch`

## Comandos

Todos os comandos começam com `!`. Funcionam em DM com o bot ou em grupos previamente cadastrados via `!defgrupo`.

### Visão geral
- `!contas` — lista do mês: contas + gastos avulsos
- `!saldo` — `renda − contas − gastos = sobra`
- `!historico` — resumo dos últimos 3 meses

### Pagamentos
- `!pago <conta>[, conta2, ...]` — marca como paga (aceita nome ou índice da `!contas`)
- `!unpago <conta>` — desmarca pagamento

### Gastos avulsos
- `!gasto <valor> <descrição>` — lança compra avulsa (ex.: `!gasto 150 Mercado`)

### Contas recorrentes
- `!addconta <nome> <valor>` — cadastra nova conta
- `!rmconta <nome>` — remove conta (match exato pula desambiguação)
- `!valor <número> <valor>` — define valor da conta
- `!addvalor <número> <valor>` — soma ao valor atual
- `!renda <valor>` — define renda mensal
- `!resetmes` — desmarca todos os pagamentos do mês

### Grupos
- `!defgrupo` — registra o grupo atual como autorizado (responde com o JID para debug)

### Ajuda
- `!ajuda` — lista os comandos disponíveis

## Estrutura

```
src/
├── index.ts        # entrypoint: conexão Baileys + dispatcher de mensagens
├── config.ts       # leitura de env
├── constants.ts    # janelas de tempo, thresholds
├── commands/       # um arquivo por comando + registry
├── db/             # schema, conexão e queries (bills/payments/expenses/settings)
└── lib/            # format (BRL/mês), fuzzy match, humanize (typing)
```

O rollover mensal é lazy: verificado no startup e a cada comando, comparando o mês corrente com o último mês conhecido em `settings`.

## Auto-start no macOS

Há um plist do `launchd` em `infra/com.moneybot.plist`. Para instalar:

```bash
cp infra/com.moneybot.plist ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.moneybot.plist
```

Logs em `~/Library/Logs/moneybot.log` e `~/Library/Logs/moneybot-err.log`.

## Notas

- Mensagens mais antigas que 30s no boot são ignoradas (evita reprocessar histórico).
- Newsletters e contatos não autorizados são descartados antes do dispatch.
- O bot só responde a comandos prefixados com `!` — chat livre é ignorado.
