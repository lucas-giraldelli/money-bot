import type { CommandContext } from "./types";
import { getSetting, setSetting } from "../db/index";

export async function defgrupo({ jid, send }: CommandContext): Promise<void> {
  const groups: string[] = JSON.parse(getSetting("groups") ?? "[]");

  if (groups.includes(jid)) {
    await send("✅ Este grupo já está cadastrado.");
    return;
  }

  groups.push(jid);
  setSetting("groups", JSON.stringify(groups));
  console.log(`[defgrupo] grupo adicionado: ${jid}`);
  await send(`✅ Grupo cadastrado! O bot vai responder aqui.\nJID: ${jid}`);
}
