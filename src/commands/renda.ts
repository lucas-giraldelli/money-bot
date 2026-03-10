import type { CommandContext } from "./types";
import { setIncome } from "../db/index";
import { formatBRL } from "../lib/format";

export async function renda({ args, send }: CommandContext): Promise<void> {
  const rawValue = args.trim().replace(",", ".");
  const amount = parseFloat(rawValue);

  if (isNaN(amount) || amount <= 0) {
    await send("Uso: !renda <valor>\nEx: !renda 5000");
    return;
  }

  setIncome(amount);
  await send(`💵 Renda mensal definida: *${formatBRL(amount)}*`);
}
