import type { WASocket } from "@whiskeysockets/baileys";

export type SendFn = (text: string) => Promise<void>;

export type CommandContext = {
  sock: WASocket;
  jid: string;
  sender: string;
  name: string;
  args: string;
  isAdmin: boolean;
  send: SendFn;
};
