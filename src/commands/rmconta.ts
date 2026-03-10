import type { CommandContext } from "./types";
import { getActiveBills, deleteBill } from "../db/index";
import { fuzzyFindBills } from "../lib/fuzzy";
import { formatBRL } from "../lib/format";

export async function rmconta({ args, send }: CommandContext): Promise<void> {
  if (!args.trim()) {
    await send("Uso: !rmconta <nome da conta>\nEx: !rmconta luz");
    return;
  }

  const bills = getActiveBills();
  const matches = fuzzyFindBills(args, bills);

  if (matches.length === 0) {
    await send(`Nenhuma conta encontrada para "${args}".`);
    return;
  }

  if (matches.length > 1) {
    const opts = matches.map((b, i) => `${i + 1}. ${b.name} — ${formatBRL(b.amount)}`).join("\n");
    await send(`Qual conta remover?\n${opts}\n\nDigite !rmconta com o nome exato.`);
    return;
  }

  const bill = matches[0];
  deleteBill(bill.id);
  await send(`🗑️ Conta *${bill.name}* removida.`);
}
