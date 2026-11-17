#!/usr/bin/env bash
# Mostra o QR code para relogar o bot no WhatsApp.
# Para o serviço launchd, arquiva a sessão atual, roda em foreground
# (o QR sai no terminal) e religa o serviço ao sair.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.moneybot.plist"
AUTH="$ROOT/data/auth"

# Mesma versão de Node do plist: os binários nativos (better-sqlite3) são
# compilados para essa ABI e quebram em outra major. Chamamos o tsx direto
# em vez de `pnpm start` porque o pnpm 11 exige Node >= 22.
NODE_BIN="$HOME/.nvm/versions/node/v20.15.1/bin"
if [ ! -x "$NODE_BIN/node" ]; then
  echo "❌ Node v20.15.1 não encontrado em $NODE_BIN" >&2
  exit 1
fi
export PATH="$NODE_BIN:$PATH"

DOMAIN="gui/$(id -u)"
LABEL="com.moneybot"

is_loaded() { launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; }

# load/unload estão obsoletos e falhavam em silêncio, deixando o bot fora do ar
restore_service() {
  echo ""
  echo "▶️  Religando o serviço em background..."
  is_loaded || launchctl bootstrap "$DOMAIN" "$PLIST" || true
  if is_loaded; then
    echo "   ✅ Serviço ativo. Logs: tail -f ~/Library/Logs/moneybot.log"
  else
    echo "   ❌ O serviço NÃO voltou. Rode manualmente:" >&2
    echo "      launchctl bootstrap $DOMAIN $PLIST" >&2
    exit 1
  fi
}
trap restore_service EXIT
# Fechar a aba do terminal (HUP) também tem que religar o serviço
trap 'exit 129' HUP
trap 'exit 143' TERM

echo "⏸️  Parando o serviço launchd..."
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
# Duas instâncias com a mesma sessão derrubam uma à outra: espera o serviço sair de vez
for _ in $(seq 1 20); do is_loaded || break; sleep 0.5; done
if is_loaded; then
  echo "❌ O serviço não parou, abortando para não rodar duas instâncias" >&2
  exit 1
fi

if [ -d "$AUTH" ]; then
  BAK="$AUTH.bak.$(date +%Y%m%d-%H%M%S)"
  echo "📦 Arquivando sessão atual em $(basename "$BAK")"
  mv "$AUTH" "$BAK"
fi

echo "📱 Aguardando o QR (WhatsApp > Aparelhos conectados > Conectar aparelho)"
echo "   Depois de ver '✅ Money Bot conectado', pressione Ctrl+C."
echo ""
cd "$ROOT"
./node_modules/.bin/tsx --env-file=.env src/index.ts
