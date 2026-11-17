import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  normalizeMessageContent,
  WAMessageStubType,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";
import { config } from "./config";
import { MSG_MAX_AGE_MS, RECONNECT_BASE_MS, RECONNECT_MAX_MS, LOGGED_OUT_REMINDER_MS } from "./constants";
import { simulateTyping } from "./lib/humanize";
import "./db/schema";
import { checkMonthRollover, getSetting, claimMessage } from "./db/index";
import { commandRegistry } from "./commands/index";
import { currentMonth } from "./lib/format";

const logger = pino({ level: "silent" });

// Local timestamp for the launchd log, which has none: "2026-11-17 10:42:03"
const ts = () => new Date().toLocaleString("sv-SE");

let reconnectAttempts = 0;

// WhatsApp calls can hang forever without throwing; fail loudly instead
const SEND_TIMEOUT_MS = 20_000;
function withTimeout<T>(label: string, p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} sem resposta em ${SEND_TIMEOUT_MS / 1000}s`)), SEND_TIMEOUT_MS),
    ),
  ]);
}

if (!fs.existsSync(config.authDir))
  fs.mkdirSync(config.authDir, { recursive: true });

const allowedNumbers = config.allowedNumbers
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const adminNumber = config.adminNumber.trim();

// Lazy month check on startup
checkMonthRollover(currentMonth());

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    getMessage: async () => ({ conversation: "" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 Escaneia o QR abaixo com o WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // Stay alive instead of exiting: launchd KeepAlive would restart us every ~10s for nothing
        const warn = () =>
          console.log(`[${ts()}] ❌ Sessão desconectada pelo WhatsApp (401). Rode: bash scripts/relogin.sh`);
        warn();
        setInterval(warn, LOGGED_OUT_REMINDER_MS);
        return;
      }

      // Exponential backoff: a fixed 3s retry hammered WhatsApp ~850 times before the 05/11 logout
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
      reconnectAttempts++;
      console.log(`[${ts()}] Conexão caiu (código ${statusCode ?? "?"}). Reconectando em ${delay / 1000}s`);
      setTimeout(() => connectToWhatsApp(), delay);
    } else if (connection === "open") {
      reconnectAttempts = 0;
      console.log(`[${ts()}] ✅ Money Bot conectado ao WhatsApp!`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify" && type !== "append") return;

    for (const msg of messages) {
      const remoteJid = msg.key.remoteJid ?? "";
      if (remoteJid.endsWith("@newsletter")) continue;

      // Unwraps ephemeral (mensagens temporárias), view-once and edited messages
      const content = normalizeMessageContent(msg.message);
      const text = content?.conversation ?? content?.extendedTextMessage?.text ?? "";

      // Every drop of a "!" command is logged: silent drops made "bot não responde" impossible to debug
      if (msg.messageStubType === WAMessageStubType.CIPHERTEXT) {
        console.log(`[${ts()}] skip: falha ao descriptografar jid=${remoteJid}`);
        continue;
      }
      if (!text.startsWith("!")) continue;

      const ageMs = Date.now() - Number(msg.messageTimestamp ?? 0) * 1000;
      if (msg.messageTimestamp && ageMs > MSG_MAX_AGE_MS) {
        console.log(`[${ts()}] skip: comando antigo (${Math.round(ageMs / 1000)}s) jid=${remoteJid} text=${text}`);
        continue;
      }

      const isGroup = remoteJid.endsWith("@g.us");
      if (isGroup) {
        const allowedGroups: string[] = JSON.parse(getSetting("groups") ?? "[]");
        const cmd = text.trim().split(" ")[0].toLowerCase();
        const bypass = cmd === "!defgrupo";
        if (!bypass && !allowedGroups.includes(remoteJid)) {
          console.log(`[${ts()}] skip: grupo não registrado jid=${remoteJid} text=${text}`);
          continue;
        }
      } else if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) {
        console.log(`[${ts()}] skip: jid desconhecido jid=${remoteJid}`);
        continue;
      }

      const rawSenderJid = isGroup
        ? (msg.key.participant ?? remoteJid)
        : remoteJid;
      const senderNumber = rawSenderJid
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "");

      console.log(
        `[${ts()}] [${isGroup ? "GROUP" : "DM"}] sender=${senderNumber} pushName=${msg.pushName} atraso=${Math.round(ageMs / 1000)}s text=${text}`,
      );

      if (allowedNumbers.length > 0 && !allowedNumbers.some((n) => senderNumber.includes(n))) {
        console.log("skip: unauthorized sender", senderNumber);
        continue;
      }

      if (msg.key.id && !claimMessage(msg.key.id)) {
        console.log(`[${ts()}] skip: comando já processado id=${msg.key.id}`);
        continue;
      }

      const isAdmin = senderNumber.includes(adminNumber);
      const name = msg.pushName ?? senderNumber;

      // Read receipt is cosmetic: never let it block the reply
      withTimeout("readMessages", sock.readMessages([msg.key])).catch((err) =>
        console.error(`[${ts()}] readMessages falhou:`, err?.message ?? err),
      );

      const send = async (response: string) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (attempt === 1) {
              await withTimeout("simulateTyping", simulateTyping(sock, remoteJid)).catch((err) =>
                console.error(`[${ts()}] simulateTyping falhou:`, err?.message ?? err),
              );
            }
            const started = Date.now();
            const sent = await withTimeout("sendMessage", sock.sendMessage(remoteJid, { text: response }));
            console.log(`[${ts()}] enviado id=${sent?.key.id} em ${Date.now() - started}ms`);
            return;
          } catch (err: any) {
            if (attempt < 3 && err?.message?.includes("No sessions")) {
              await new Promise((r) => setTimeout(r, 1500 * attempt));
            } else {
              console.error(`[${ts()}] Falha ao enviar (tentativa ${attempt}):`, err?.message ?? err);
              return;
            }
          }
        }
      };

      const [cmd, ...rest] = text.trim().split(" ");
      const args = rest.join(" ");

      const entry = commandRegistry.get(cmd.toLowerCase());
      if (!entry) continue;

      if (entry.adminOnly && !isAdmin) {
        await send("⛔ Apenas o administrador pode usar esse comando.");
        continue;
      }

      // Lazy month rollover check on every command
      checkMonthRollover(currentMonth());

      try {
        await entry.handle({
          sock,
          jid: remoteJid,
          sender: senderNumber,
          name,
          args,
          isAdmin,
          send,
        });
      } catch (err) {
        console.error("Error processing command:", err);
        await send("❌ Erro ao processar o comando.");
      }
    }
  });
}

connectToWhatsApp().catch(console.error);
