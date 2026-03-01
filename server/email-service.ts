import { storage } from "./storage";

function decodeBody(source: Buffer | undefined, textPart: any): string {
  const text = typeof textPart === "string"
    ? textPart
    : Buffer.isBuffer(textPart)
      ? textPart.toString("utf-8")
      : "";

  if (text.trim()) {
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000);
  }

  if (!source) return "";
  const raw = source.toString("utf-8");
  const idx = raw.indexOf("\r\n\r\n") >= 0 ? raw.indexOf("\r\n\r\n") : raw.indexOf("\n\n");
  if (idx < 0) return "";

  return raw.slice(idx)
    .replace(/^\r?\n\r?\n/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/=\r?\n/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

export async function syncInboxFromImap(_userId: number, config: {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
}) {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  const emails: any[] = [];

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const uids = await client.search({ since });

    if (Array.isArray(uids) && uids.length) {
      const recent = uids.slice(-20);
      const msgs = client.fetch(recent, { envelope: true, uid: true, source: true, bodyParts: ["TEXT"] });
      for await (const msg of msgs) {
        const env = msg.envelope;
        if (!env) continue;
        const textPart = (msg as any).bodyParts?.get?.("TEXT") || (msg as any).bodyParts?.TEXT;
        emails.push({
          direction: "received",
          fromAddr: env.from?.[0]?.address || "",
          toAddr: env.to?.[0]?.address || config.user,
          subject: env.subject || "(No subject)",
          body: decodeBody((msg as any).source, textPart) || env.subject || "(No content)",
          status: "received",
          messageId: env.messageId || undefined,
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  let saved = 0;
  for (const email of emails) {
    try {
      await storage.createBusinessEmail(email);
      saved++;
    } catch {}
  }

  await storage.createLog({ action: "IMAP inbox checked", details: `Fetched ${emails.length}, saved ${saved} new`, source: "email" });

  return { success: true, fetched: emails.length, saved };
}
