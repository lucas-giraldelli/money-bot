import type { CommandContext } from "./types";
import { addBill, updateBillAmount, updateBillInstallment, getActiveBills } from "../db/index";
import { fuzzyFindBills } from "../lib/fuzzy";
import { formatBRL } from "../lib/format";

// Parses "X/Y" suffix from name, e.g. "Malai 7/10" → { baseName: "Malai", current: 7, total: 10 }
function parseInstallment(name: string): {
  baseName: string;
  current: number | null;
  total: number | null;
} {
  const match = name.match(/^(.+?)\s+(\d+)\/(\d+)$/);
  if (!match) return { baseName: name, current: null, total: null };
  return {
    baseName: match[1].trim(),
    current: parseInt(match[2], 10),
    total: parseInt(match[3], 10),
  };
}

export async function addconta({ args, send }: CommandContext): Promise<void> {
  // Expected: !addconta <nome> [X/Y] <valor>
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    await send("Uso: !addconta <nome> <valor>\nEx: !addconta Luz 280\nEx: !addconta Malai 7/10 450");
    return;
  }

  const rawValue = parts[parts.length - 1].replace(",", ".");
  const amount = parseFloat(rawValue);
  if (isNaN(amount) || amount <= 0) {
    await send(`Valor inválido: "${parts[parts.length - 1]}".`);
    return;
  }

  const fullName = parts.slice(0, -1).join(" ").replace(/^["']|["']$/g, "");
  const { baseName, current, total } = parseInstallment(fullName);

  // Check if bill already exists by base name (fuzzy)
  const bills = getActiveBills();
  const existing = fuzzyFindBills(baseName, bills);
  const exactMatch = existing.find(
    (b) => b.name.toLowerCase() === baseName.toLowerCase(),
  );

  if (exactMatch) {
    updateBillAmount(exactMatch.id, amount);
    if (current !== null && total !== null) {
      updateBillInstallment(exactMatch.id, current, total);
      await send(`✏️ *${baseName}* atualizada: ${formatBRL(amount)} — parcela ${current}/${total}`);
    } else {
      await send(`✏️ *${exactMatch.name}* atualizada: ${formatBRL(amount)}`);
    }
    return;
  }

  addBill(baseName, amount, current ?? undefined, total ?? undefined);

  if (current !== null && total !== null) {
    await send(`➕ *${baseName}* adicionada: ${formatBRL(amount)} — parcela ${current}/${total}`);
  } else {
    await send(`➕ *${baseName}* adicionada: ${formatBRL(amount)}`);
  }
}
