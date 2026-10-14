import type { CommandContext } from "./types";
import {
  addBill,
  addWeeklyBill,
  updateBillAmount,
  updateBillInstallment,
  updateBillWeekday,
  retireBill,
  getActiveBills,
} from "../db/index";
import { fuzzyFindBills } from "../lib/fuzzy";
import { formatBRL } from "../lib/format";
import {
  DEFAULT_WEEKDAY,
  WEEKDAY_NAMES,
  parseWeekday,
  today,
  lastWeekdayOnOrBefore,
} from "../lib/weekly";

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

// Splits "<nome> <valor> semanal [dia]" → weekly part, or null when monthly
function parseWeekly(parts: string[]): { parts: string[]; weekday: number | null } | "invalid" | null {
  const idx = parts.findIndex((p) => p.toLowerCase() === "semanal");
  if (idx === -1) return null;
  const rest = parts.slice(idx + 1);
  if (rest.length > 1) return "invalid";
  if (rest.length === 0) return { parts: parts.slice(0, idx), weekday: null };
  const weekday = parseWeekday(rest[0]);
  return weekday === null ? "invalid" : { parts: parts.slice(0, idx), weekday };
}

export async function addconta({ args, send }: CommandContext): Promise<void> {
  // Expected: !addconta <nome> [X/Y] <valor> [semanal [dia]]
  let parts = args.trim().split(/\s+/);
  const weekly = parseWeekly(parts);
  if (weekly === "invalid") {
    await send(`Dia inválido. Use: ${WEEKDAY_NAMES.join(", ")}\nEx: !addconta Nice 500 semanal quarta`);
    return;
  }
  if (weekly) parts = weekly.parts;

  if (parts.length < 2) {
    await send(
      "Uso: !addconta <nome> <valor>\nEx: !addconta Luz 280\nEx: !addconta Malai 7/10 450\nEx: !addconta Nice 500 semanal",
    );
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

  if (weekly) {
    if (current !== null) {
      await send("Conta semanal não pode ter parcelas.");
      return;
    }
    await addOrUpdateWeekly(baseName, amount, weekly.weekday, send);
    return;
  }

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

async function addOrUpdateWeekly(
  name: string,
  amount: number,
  weekdayArg: number | null,
  send: CommandContext["send"],
): Promise<void> {
  const exactMatch = fuzzyFindBills(name, getActiveBills()).find(
    (b) => b.name.toLowerCase() === name.toLowerCase(),
  );

  // Already weekly: keep paid_through, only update amount/day
  if (exactMatch?.frequency === "weekly") {
    const weekday = weekdayArg ?? exactMatch.weekday ?? DEFAULT_WEEKDAY;
    updateBillAmount(exactMatch.id, amount);
    updateBillWeekday(exactMatch.id, weekday);
    await send(`✏️ *${exactMatch.name}* atualizada: ${formatBRL(amount)} (semanal, ${WEEKDAY_NAMES[weekday]})`);
    return;
  }

  // New bill starts em dia: last due date up to today counts as paid
  const weekday = weekdayArg ?? DEFAULT_WEEKDAY;
  const now = today();
  const paidThrough = lastWeekdayOnOrBefore(now, weekday);

  // Monthly → weekly: retire the old bill so its history keeps the old amount
  if (exactMatch) retireBill(exactMatch.id);
  addWeeklyBill(exactMatch?.name ?? name, amount, weekday, paidThrough);

  await send(
    `${exactMatch ? "✏️" : "➕"} *${exactMatch?.name ?? name}* ${exactMatch ? "atualizada" : "adicionada"}: ` +
      `${formatBRL(amount)} (semanal, ${WEEKDAY_NAMES[weekday]})`,
  );
}
