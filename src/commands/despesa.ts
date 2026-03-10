import type { CommandContext } from "./types";
import { addExpense } from "../db/index";
import { currentMonth, formatBRL } from "../lib/format";

export async function gasto({ args, name, send }: CommandContext): Promise<void> {
  // Expected: !gasto <valor> <descrição>
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await send("Uso: !gasto <valor> <descrição>\nEx: !gasto 150 Mercado");
    return;
  }

  const rawValue = parts[0].replace(",", ".");
  const amount = parseFloat(rawValue);
  if (isNaN(amount) || amount <= 0) {
    await send(`Valor inválido: "${parts[0]}". Use um número positivo.`);
    return;
  }

  const description = parts.slice(1).join(" ");
  const month = currentMonth();
  addExpense(description, amount, month, name);

  await send(`🛒 Gasto registrado: *${description}* — ${formatBRL(amount)}`);
}
