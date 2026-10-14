import type { CommandContext } from "./types";
import {
  getActiveBills,
  getDisplayName,
  getPaymentsForMonth,
  ensureMonthPayments,
  getExpensesForMonth,
  getWeeklyStatus,
  getWeeklyPaidTotal,
} from "../db/index";
import { formatBRL, currentMonth, formatMonthLabel } from "../lib/format";
import { describeWeekly, today } from "../lib/weekly";

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
    const now = today();
    // Summed from payments (not active bills) so retired bills paid this month still count, same as !saldo
    const totalPaid =
      payments.filter((p) => p.paid_at).reduce((s, p) => s + p.amount, 0) + getWeeklyPaidTotal(month);
    let totalRemaining = 0;

    lines.push("📋 *Contas*");
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];

      if (bill.frequency === "weekly") {
        const status = getWeeklyStatus(bill, now, month);
        const { icon, text } = describeWeekly(bill.name, bill.amount, status);
        lines.push(`${i + 1}. ${icon} ${text}`);
        totalRemaining += bill.amount * (status.pending.length + status.upcoming.length);
        continue;
      }

      const payment = paymentMap.get(bill.id);
      const icon = payment?.paid_at ? "✅" : "⏳";
      lines.push(`${i + 1}. ${icon} ${getDisplayName(bill)} - ${formatBRL(bill.amount)}`);
      if (!payment?.paid_at) totalRemaining += bill.amount;
    }

    lines.push(`_Pagas: ${formatBRL(totalPaid)} · Restante: ${formatBRL(totalRemaining)}_`);
  }

  // --- Gastos avulsos ---
  if (expenses.length > 0) {
    lines.push("");
    lines.push("🛒 *Gastos avulsos*");
    for (const e of expenses) {
      lines.push(`• ${e.description} - ${formatBRL(e.amount)}`);
    }
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    lines.push(`_Total avulsos: ${formatBRL(totalExp)}_`);
  }

  await send(lines.join("\n"));
}
