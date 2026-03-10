import type { CommandContext } from "./types";
import { getActiveBills, updateBillAmount } from "../db/index";
import { formatBRL } from "../lib/format";

export async function valor({ args, send }: CommandContext): Promise<void> {
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await send("Uso: !valor <número> <valor>\nEx: !valor 3 280\n\nUse !contas para ver a lista numerada.");
    return;
  }

  const index = parseInt(parts[0], 10);
  const rawValue = parts[1].replace(",", ".");
  const amount = parseFloat(rawValue);

  if (isNaN(index) || index < 1) {
    await send(`Número inválido: "${parts[0]}". Use !contas para ver a lista.`);
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    await send(`Valor inválido: "${parts[1]}".`);
    return;
  }

  const bills = getActiveBills();
  const bill = bills[index - 1];

  if (!bill) {
    await send(`Não existe conta número ${index}. Use !contas para ver a lista.`);
    return;
  }

  updateBillAmount(bill.id, amount);
  await send(`✏️ *${bill.name}* atualizada: ${formatBRL(amount)}`);
}
