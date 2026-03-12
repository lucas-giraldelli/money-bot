import type { CommandContext } from "./types";

export async function ajuda({ send }: CommandContext): Promise<void> {
  const lines = [
    "💰 *Money Bot — Comandos*",
    "",
    "📋 *Visão geral*",
    "• `!contas` — lista do mês: contas + gastos avulsos",
    "• `!saldo` — renda - contas - gastos = sobra",
    "• `!historico` — resumo dos últimos 3 meses",
    "",
    "✅ *Pagamentos*",
    "• `!pago <conta> [, conta2]...` — marca como paga (ex: `!pago luz, carro`)",
    "• `!unpago <conta>` — desmarca pagamento",
    "",
    "🛒 *Gastos avulsos*",
    "• `!gasto <valor> <descrição>` — lança compra avulsa",
    "   Ex: `!gasto 150 Mercado`",
    "",
    "⚙️ *Contas recorrentes*",
    "• `!valor <número> <valor>` — define valor de uma conta",
    "• `!addvalor <número> <valor>` — soma ao valor existente",
    "• `!addconta <nome> <valor>` — adiciona nova conta",
    "• `!rmconta <nome>` — remove conta",
    "• `!renda <valor>` — define renda mensal",
    "• `!resetmes` — desmarca todos os pagamentos do mês",
  ];

  await send(lines.join("\n"));
}
