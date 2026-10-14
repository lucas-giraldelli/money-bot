import type { CommandContext } from "./types";

export async function ajuda({ send }: CommandContext): Promise<void> {
  const lines = [
    "💰 *Money Bot - Comandos*",
    "",
    "📋 *Visão geral*",
    "• `!contas` - lista do mês: contas + gastos avulsos",
    "• `!saldo` - renda - contas - gastos = sobra",
    "• `!historico` - resumo dos últimos 3 meses",
    "",
    "✅ *Pagamentos*",
    "• `!pago <conta> [, conta2]...` - marca como paga (ex: `!pago luz, carro`)",
    "• `!unpago <conta>` - desmarca pagamento",
    "",
    "🛒 *Gastos avulsos*",
    "• `!gasto <valor> <descrição>` - lança compra avulsa",
    "   Ex: `!gasto 150 Mercado`",
    "",
    "⚙️ *Contas recorrentes*",
    "• `!valor <número> <valor>` - define valor de uma conta",
    "• `!addvalor <número> <valor>` - soma ao valor existente",
    "• `!addconta <nome> <valor>` - adiciona nova conta (padrão: mensal)",
    "• `!rmconta <nome>` - remove conta",
    "• `!renda <valor>` - define renda mensal",
    "• `!resetmes` - desmarca todos os pagamentos do mês",
    "",
    "🔁 *Contas semanais*",
    "• `!addconta <nome> <valor> semanal [dia]` - vence toda semana (padrão: sexta)",
    "   Ex: `!addconta Nice 500 semanal` · `!addconta Nice 500 semanal quarta`",
    "• Todo vencimento soma +valor no pendente, mesmo se esquecerem",
    "• `!pago <conta>` - quita todas as semanas acumuladas de uma vez",
    "• `!unpago <conta>` - desfaz o último pagamento",
    "• Para mudar o dia: `!addconta <nome> <valor> semanal <dia>` de novo",
  ];

  await send(lines.join("\n"));
}
