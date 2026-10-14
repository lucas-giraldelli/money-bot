import type { CommandContext } from "./types";
import {
  getPaymentsForMonth,
  ensureMonthPayments,
  getTotalExpenses,
  getIncome,
  getActiveBills,
  getWeeklyStatus,
  getWeeklyPaidTotal,
} from "../db/index";
import { currentMonth, formatBRL, formatMonthLabel } from "../lib/format";
import { today } from "../lib/weekly";

export async function saldo({ send }: CommandContext): Promise<void> {
  const month = currentMonth();
  ensureMonthPayments(month);

  const payments = getPaymentsForMonth(month);
  const income = getIncome();
  const totalExpenses = getTotalExpenses(month);

  const weeklyBills = getActiveBills().filter((b) => b.frequency === "weekly");
  const weeklyStatuses = weeklyBills.map((b) => ({ bill: b, status: getWeeklyStatus(b, today(), month) }));

  const totalPaid =
    payments.filter((p) => p.paid_at !== null).reduce((s, p) => s + p.amount, 0) +
    getWeeklyPaidTotal(month);

  const totalPending =
    payments.filter((p) => p.paid_at === null).reduce((s, p) => s + p.amount, 0) +
    weeklyStatuses.reduce(
      (s, { bill, status }) => s + bill.amount * (status.pending.length + status.upcoming.length),
      0,
    );

  const balance = income - totalPaid - totalExpenses;

  const lines: string[] = [];
  lines.push(`📊 *Saldo - ${formatMonthLabel(month)}*`);
  lines.push("");
  if (income > 0) {
    lines.push(`💵 Renda: ${formatBRL(income)}`);
  } else {
    lines.push(`💵 Renda: não definida (use !renda <valor>)`);
  }
  lines.push(`✅ Contas pagas: ${formatBRL(totalPaid)}`);
  lines.push(`⏳ Contas pendentes: ${formatBRL(totalPending)}`);
  lines.push(`🛒 Gastos avulsos: ${formatBRL(totalExpenses)}`);
  for (const { bill, status } of weeklyStatuses) {
    const n = status.monthDues.length;
    lines.push(`🔁 ${bill.name} (semanal): ${n}x ${formatBRL(bill.amount)} = ${formatBRL(n * bill.amount)}`);
  }
  lines.push("");
  if (income > 0) {
    const emoji = balance >= 0 ? "🟢" : "🔴";
    lines.push(`${emoji} Sobra estimada: *${formatBRL(balance)}*`);
  }

  await send(lines.join("\n"));
}
