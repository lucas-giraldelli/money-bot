import type { CommandContext } from "./types";
import { getActiveBills, updateBillAmount } from "../db/index";
import { formatBRL } from "../lib/format";

export async function addvalor({ args, send }: CommandContext): Promise<void> {
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await send("Uso: !addvalor <número> <valor>\nEx: !addvalor 5 25\n\nUse !contas para ver a lista numerada.");
    return;
  }

  const index = parseInt(parts[0], 10);
  const rawValue = parts[1].replace(",", ".");
  const extra = parseFloat(rawValue);

  if (isNaN(index) || index < 1) {
    await send(`Número inválido: "${parts[0]}".`);
    return;
  }
  if (isNaN(extra) || extra <= 0) {
    await send(`Valor inválido: "${parts[1]}".`);
    return;
  }

  const bills = getActiveBills();
  const bill = bills[index - 1];

  if (!bill) {
    await send(`Não existe conta número ${index}. Use !contas para ver a lista.`);
    return;
  }

  const newAmount = bill.amount + extra;
  updateBillAmount(bill.id, newAmount);
  await send(`➕ *${bill.name}*: ${formatBRL(bill.amount)} + ${formatBRL(extra)} = *${formatBRL(newAmount)}*`);
}
