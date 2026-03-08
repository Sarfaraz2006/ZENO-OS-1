import { storage } from "./storage";

function decodeTransferEncoding(body: string, encoding: string): string {
  const lower = encoding.toLowerCase();
  if (lower.includes("base64")) {
    try {
      return Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf-8");
    } catch {
      return body;
    }
  }

  if (lower.includes("quoted-printable")) {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  return body;
}

function cleanHumanReadableBody(input: string): string {
  return input
    .replace(/^\s*(content-type|content-transfer-encoding|mime-version):.*$/gim, "")
    .replace(/^\s*--[-_A-Za-z0-9]+\s*$/gm, "")
    .replace(/^\s*charset=[^\n]+$/gim, "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseMimeMessage(raw: string): string {
  const split = raw.indexOf("\r\n\r\n") >= 0 ? raw.indexOf("\r\n\r\n") : raw.indexOf("\n\n");
  if (split < 0) return cleanHumanReadableBody(raw);

  const headers = raw.slice(0, split);
  let body = raw.slice(split).replace(/^\r?\n\r?\n/, "");

  const cte = headers.match(/content-transfer-encoding:\s*([^\r\n;]+)/i)?.[1] || "";
  const boundary = headers.match(/boundary="?([^"\r\n;]+)"?/i)?.[1];

  if (boundary) {
    const parts = body.split(new RegExp(`--${boundary}(?:--)?\\r?\\n`, "g"));
    const textPart = parts.find((p) => /content-type:\s*text\/plain/i.test(p)) || parts[0] || "";
    const partSplit = textPart.indexOf("\r\n\r\n") >= 0 ? textPart.indexOf("\r\n\r\n") : textPart.indexOf("\n\n");

    if (partSplit >= 0) {
      const partHeaders = textPart.slice(0, partSplit);
      const partBody = textPart.slice(partSplit).replace(/^\r?\n\r?\n/, "");
      const partEncoding = partHeaders.match(/content-transfer-encoding:\s*([^\r\n;]+)/i)?.[1] || "";
      body = decodeTransferEncoding(partBody, partEncoding);
    }
  } else {
    body = decodeTransferEncoding(body, cte);
  }

  return cleanHumanReadableBody(body);
}

function decodeBody(source: Buffer | undefined, textPart: any): string {
  const text = typeof textPart === "string"
    ? textPart
    : Buffer.isBuffer(textPart)
      ? textPart.toString("utf-8")
      : "";

  if (text.trim()) {
    const looksMime = /content-type:|content-transfer-encoding:|mime-version:|--[-_A-Za-z0-9]{6,}/i.test(text);
    const decoded = looksMime ? parseMimeMessage(text) : cleanHumanReadableBody(text);
    if (decoded) return decoded.slice(0, 10000);
  }

  if (!source) return "";
  return parseMimeMessage(source.toString("utf-8")).slice(0, 10000);
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
