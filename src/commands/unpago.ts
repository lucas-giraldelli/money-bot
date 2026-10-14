import type { CommandContext } from "./types";
import {
  getActiveBills,
  getPaymentsForMonth,
  unmarkPaid,
  ensureMonthPayments,
  getLastWeeklyPayment,
  undoWeeklyPayment,
} from "../db/index";
import { fuzzyFindBills } from "../lib/fuzzy";
import { currentMonth, formatBRL } from "../lib/format";
import { dueDatesBetween, formatWeeks, DEFAULT_WEEKDAY } from "../lib/weekly";

export async function unpago({ args, send }: CommandContext): Promise<void> {
  if (!args.trim()) {
    await send("Uso: !unpago <nome da conta>\nEx: !unpago luz");
    return;
  }

  const month = currentMonth();
  ensureMonthPayments(month);

  const bills = getActiveBills();
  const matches = fuzzyFindBills(args, bills);

  if (matches.length === 0) {
    await send(`Nenhuma conta encontrada para "${args}".`);
    return;
  }

  if (matches.length > 1) {
    const opts = matches.map((b, i) => `${i + 1}. ${b.name} — ${formatBRL(b.amount)}`).join("\n");
    await send(`Qual conta?\n${opts}`);
    return;
  }

  const bill = matches[0];

  if (bill.frequency === "weekly") {
    const last = getLastWeeklyPayment(bill.id);
    if (!last) {
      await send(`Nenhum pagamento de ${bill.name} para desfazer.`);
      return;
    }
    undoWeeklyPayment(last);
    const weekday = bill.weekday ?? DEFAULT_WEEKDAY;
    const weeks = dueDatesBetween(last.prev_paid_through, last.paid_through, weekday);
    const lines = [`↩️ *${bill.name}* — pagamento de ${formatBRL(last.amount)} desfeito`];
    if (weeks.length > 0) {
      lines.push(`${formatWeeks(weeks, weekday)} ${weeks.length === 1 ? "volta" : "voltam"} para pendentes.`);
    }
    await send(lines.join("\n"));
    return;
  }

  const payments = getPaymentsForMonth(month);
  const existing = payments.find((p) => p.bill_id === bill.id);

  if (!existing?.paid_at) {
    await send(`⏳ ${bill.name} já estava como pendente.`);
    return;
  }

  unmarkPaid(bill.id, month);
  await send(`↩️ *${bill.name}* desmarcada — volta para pendentes.`);
}
