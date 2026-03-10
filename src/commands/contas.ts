import type { CommandContext } from "./types";
import { getActiveBills, getDisplayName, getPaymentsForMonth, ensureMonthPayments, getExpensesForMonth } from "../db/index";
import { formatBRL, currentMonth, formatMonthLabel } from "../lib/format";

export async function contas({ send }: CommandContext): Promise<void> {
  const month = currentMonth();
  ensureMonthPayments(month);

  const bills = getActiveBills();
  const payments = getPaymentsForMonth(month);
  const expenses = getExpensesForMonth(month);
  const paymentMap = new Map(payments.map((p) => [p.bill_id, p]));

  const lines = [`💰 *${formatMonthLabel(month)}*`, ""];

  // --- Contas recorrentes ---
  if (bills.length > 0) {
    lines.push("📋 *Contas*");
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const payment = paymentMap.get(bill.id);
      const icon = payment?.paid_at ? "✅" : "⏳";
      lines.push(`${i + 1}. ${icon} ${getDisplayName(bill)} — ${formatBRL(bill.amount)}`);
    }

    const total = bills.reduce((s, b) => s + b.amount, 0);
    const totalPaid = bills
      .filter((b) => paymentMap.get(b.id)?.paid_at)
      .reduce((s, b) => s + b.amount, 0);

    lines.push(`_Pagas: ${formatBRL(totalPaid)} · Total: ${formatBRL(total)}_`);
  }

  // --- Gastos avulsos ---
  if (expenses.length > 0) {
    lines.push("");
    lines.push("🛒 *Gastos avulsos*");
    for (const e of expenses) {
      lines.push(`• ${e.description} — ${formatBRL(e.amount)}`);
    }
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    lines.push(`_Total avulsos: ${formatBRL(totalExp)}_`);
  }

  await send(lines.join("\n"));
}
