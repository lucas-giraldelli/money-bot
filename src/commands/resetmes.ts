import type { CommandContext } from "./types";
import { resetMonth, ensureMonthPayments } from "../db/index";
import { currentMonth, formatMonthLabel } from "../lib/format";

export async function resetmes({ send }: CommandContext): Promise<void> {
  const month = currentMonth();
  resetMonth(month);
  ensureMonthPayments(month);
  await send(`🔄 Mês *${formatMonthLabel(month)}* resetado — todos os pagamentos desmarcados.`);
}
