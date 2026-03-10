import type { CommandContext } from "./types";
import { pago } from "./pago";
import { unpago } from "./unpago";
import { gasto } from "./despesa";
import { saldo } from "./saldo";
import { addconta } from "./addconta";
import { rmconta } from "./rmconta";
import { renda } from "./renda";
import { resetmes } from "./resetmes";
import { historico } from "./historico";
import { ajuda } from "./ajuda";
import { contas } from "./contas";
import { valor } from "./valor";
import { defgrupo } from "./defgrupo";
import { addvalor } from "./addvalor";

export type CommandEntry = {
  handle: (ctx: CommandContext) => Promise<void>;
  adminOnly: boolean;
};

export const commandRegistry = new Map<string, CommandEntry>([
  ["!pago",      { handle: pago,      adminOnly: false }],
  ["!unpago",    { handle: unpago,    adminOnly: false }],
  ["!gasto",     { handle: gasto,     adminOnly: false }],
  ["!saldo",     { handle: saldo,     adminOnly: false }],
  ["!historico", { handle: historico, adminOnly: false }],
  ["!addconta",  { handle: addconta,  adminOnly: false }],
  ["!rmconta",   { handle: rmconta,   adminOnly: false }],
  ["!renda",     { handle: renda,     adminOnly: false }],
  ["!resetmes",  { handle: resetmes,  adminOnly: false }],
  ["!ajuda",     { handle: ajuda,     adminOnly: false }],
  ["!contas",    { handle: contas,    adminOnly: false }],
  ["!valor",     { handle: valor,     adminOnly: false }],
  ["!defgrupo",  { handle: defgrupo,  adminOnly: false }],
  ["!addvalor",  { handle: addvalor,  adminOnly: false }],
]);
