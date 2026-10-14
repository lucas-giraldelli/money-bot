import type { CommandContext } from "./types";
import {
  getActiveBills,
  getPaymentsForMonth,
  markPaid,
  ensureMonthPayments,
  getWeeklyStatus,
  payWeekly,
} from "../db/index";
import { fuzzyFindBills } from "../lib/fuzzy";
import { currentMonth, formatBRL } from "../lib/format";
import { today, formatWeeks } from "../lib/weekly";

export async function pago({ args, name, send }: CommandContext): Promise<void> {
  if (!args.trim()) {
    await send("Uso: !pago <conta> [, conta2] [, conta3]...\nEx: !pago luz, carro, tim");
    return;
  }

  const month = currentMonth();
  ensureMonthPayments(month);

  const bills = getActiveBills();
  const payments = getPaymentsForMonth(month);
  const queries = args.trim().split(/\s*,\s*/);

  const confirmed: string[] = [];
  const alreadyPaid: string[] = [];
  const notFound: string[] = [];

  for (const query of queries) {
    const num = /^\d+$/.test(query.trim()) ? parseInt(query.trim(), 10) : NaN;
    const matches = !isNaN(num)
      ? bills[num - 1] ? [bills[num - 1]] : []
      : fuzzyFindBills(query, bills);

    if (matches.length === 0) {
      notFound.push(query);
      continue;
    }

    // Pick best single match
    const bill = matches[0];

    // Weekly: pays every due date accumulated up to today
    if (bill.frequency === "weekly") {
      const status = getWeeklyStatus(bill, today(), month);
      if (status.pending.length === 0) {
        alreadyPaid.push(`${bill.name} (em dia)`);
        continue;
      }
      const amount = payWeekly(bill, status, month, name);
      bill.paid_through = status.pending[status.pending.length - 1];
      confirmed.push(`${bill.name} ${formatWeeks(status.pending, status.weekday)} - ${formatBRL(amount)}`);
      continue;
    }

    const existing = payments.find((p) => p.bill_id === bill.id);

    if (existing?.paid_at) {
      alreadyPaid.push(bill.name);
      continue;
    }

    const ok = markPaid(bill.id, month, name);
    if (ok) {
      // Update local cache so duplicate queries in same call don't re-mark
      const p = payments.find((p) => p.bill_id === bill.id);
      if (p) p.paid_at = new Date().toISOString();
      confirmed.push(`${bill.name} - ${formatBRL(bill.amount)}`);
    } else {
      notFound.push(bill.name);
    }
  }

  const lines: string[] = [];
  if (confirmed.length > 0) {
    lines.push(`✅ *Marcadas como pagas:*`);
    confirmed.forEach((c) => lines.push(`• ${c}`));
  }
  if (alreadyPaid.length > 0) {
    lines.push(`já pagas: ${alreadyPaid.join(", ")}`);
  }
  if (notFound.length > 0) {
    lines.push(`não encontradas: ${notFound.join(", ")}`);
  }

  await send(lines.join("\n"));
}
