import { storage } from "./storage";
import { sendGmailEmail } from "./gmail-client";
import { ImapFlow } from "imapflow";
import { getActiveAIClient } from "./ai-client";

let agentInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

interface ParsedEmail {
  uid: number;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  messageId: string;
  inReplyTo?: string;
}

function extractEmail(str: string): string {
  const match = str.match(/<([^>]+)>/) || str.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase() : str.toLowerCase().trim();
}

function extractDomain(email: string): string {
  return email.split("@")[1] || "";
}

async function getImapClient(): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_ADDRESS!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    logger: false,
  });
  await client.connect();
  return client;
}

async function fetchNewEmails(): Promise<ParsedEmail[]> {
  const client = await getImapClient();
  const emails: ParsedEmail[] = [];

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const uids = await client.search({ since, seen: false });
      if (!uids || uids.length === 0) {
        lock.release();
        await client.logout();
        return [];
      }

      const fetchResult = client.fetch(uids, {
        envelope: true,
        source: true,
        uid: true,
      });

      for await (const msg of fetchResult) {
        const env = msg.envelope;
        if (!env) continue;

        const fromAddr = env.from?.[0]?.address || "";
        const fromName = env.from?.[0]?.name || fromAddr;
        const toAddr = env.to?.[0]?.address || "";
        let body = "";

        if (msg.source) {
          const raw = msg.source.toString("utf-8");
          const bodyStart = raw.indexOf("\r\n\r\n");
          if (bodyStart !== -1) {
            body = raw.substring(bodyStart + 4);
            if (raw.includes("Content-Transfer-Encoding: base64")) {
              try { body = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf-8"); } catch {}
            }
            if (raw.includes("Content-Transfer-Encoding: quoted-printable")) {
              body = body.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            }
          }
          body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000);
        }

        emails.push({
          uid: msg.uid,
          from: fromName,
          fromEmail: fromAddr.toLowerCase(),
          to: toAddr.toLowerCase(),
          subject: env.subject || "(No subject)",
          body,
          date: env.date || new Date(),
          messageId: env.messageId || "",
          inReplyTo: env.inReplyTo || undefined,
        });
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error("[ZENO Agent] IMAP fetch error:", err.message);
  }

  try { await client.logout(); } catch {}
  return emails;
}

async function matchEmailToLead(email: ParsedEmail): Promise<any | null> {
  const leads = await storage.getBusinessLeads();
  const senderDomain = extractDomain(email.fromEmail);

  for (const lead of leads) {
    if (lead.email && extractEmail(lead.email) === email.fromEmail) {
      return lead;
    }
    if (lead.website) {
      const leadDomain = lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      if (leadDomain && senderDomain && (senderDomain === leadDomain || senderDomain.endsWith("." + leadDomain))) {
        return lead;
      }
    }
  }
  return null;
}

type Sentiment = "question" | "interested" | "ready_to_buy" | "not_interested" | "other";

interface AIAnalysis {
  sentiment: Sentiment;
  summary: string;
  suggestedReply: string;
}

async function analyzeWithAI(email: ParsedEmail, lead: any): Promise<AIAnalysis> {
  const prompt = `You are an AI business development agent for ZENO OS, an AI automation company.

Analyze this email reply from a lead we contacted:

Lead Name: ${lead.name}
Lead Website: ${lead.website || "N/A"}
Email Subject: ${email.subject}
Email Body:
${email.body}

Classify the sentiment into EXACTLY one category:
- "question" = They are asking questions about our services, pricing, features, etc.
- "interested" = They show interest and want to learn more or schedule a meeting
- "ready_to_buy" = They explicitly want to purchase, sign up, or request a payment link
- "not_interested" = They declined, said no, unsubscribed, or showed zero interest
- "other" = Auto-reply, out-of-office, or unrelated

Then write a professional reply email. Guidelines:
- If "question": Answer their question helpfully, mention key ZENO OS features (AI lead generation, smart email campaigns, CRM automation, workflow optimization)
- If "interested": Suggest scheduling a 15-minute demo call, be enthusiastic but professional
- If "ready_to_buy": Thank them, mention that a payment link will be shared shortly for our starter plan
- If "not_interested": Thank them politely, wish them well, keep the door open for future contact
- If "other": Write a brief friendly follow-up

Sign off as "ZENO OS Team"

Reply in this exact JSON format (no markdown, no code blocks):
{"sentiment": "one_of_the_categories", "summary": "brief 1-line summary of their email", "suggestedReply": "your full reply email text"}`;

  const { client: aiClient, defaultModel } = await getActiveAIClient();
  const completion = await aiClient.chat.completions.create({
    model: defaultModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content?.trim() || "";
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { sentiment: "other", summary: "Could not parse AI response", suggestedReply: text };
  }
}

async function processIncomingEmail(email: ParsedEmail): Promise<void> {
  const existingEmails = await storage.getBusinessEmails(500);
  const alreadySaved = existingEmails.some(
    (e) => e.messageId === email.messageId || (e.fromAddr === email.fromEmail && e.subject === email.subject && e.direction === "received")
  );
  if (alreadySaved) return;

  await storage.createBusinessEmail({
    direction: "received",
    fromAddr: email.fromEmail,
    toAddr: email.to || process.env.GMAIL_ADDRESS || "",
    subject: email.subject,
    body: email.body,
    status: "received",
    messageId: email.messageId,
  });

  const lead = await matchEmailToLead(email);
  if (!lead) {
    await storage.createLog({
      action: "[ZENO Agent] New email (no lead match)",
      details: `From: ${email.fromEmail} | Subject: ${email.subject}`,
      source: "autonomous",
    });
    return;
  }

  await storage.createLog({
    action: "[ZENO Agent] Lead reply detected!",
    details: `Lead: ${lead.name} | From: ${email.fromEmail} | Subject: ${email.subject}`,
    source: "autonomous",
  });

  const analysis = await analyzeWithAI(email, lead);

  await storage.createLog({
    action: `[ZENO Agent] Sentiment: ${analysis.sentiment.toUpperCase()}`,
    details: `Lead: ${lead.name} | Summary: ${analysis.summary}`,
    source: "autonomous",
  });

  if (analysis.sentiment === "not_interested") {
    await storage.updateBusinessLead(lead.id, { status: "closed" });
    await storage.createLog({
      action: "[ZENO Agent] Lead closed",
      details: `${lead.name} marked as closed — not interested`,
      source: "autonomous",
    });
  } else if (analysis.sentiment === "ready_to_buy") {
    await storage.updateBusinessLead(lead.id, { status: "won" });
    const stripeConnected = (await storage.getSetting("stripe_connected"))?.value === "true";
    if (stripeConnected) {
      const stripeKey = (await storage.getSetting("stripe_secret_key"))?.value;
      if (stripeKey) {
        try {
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(stripeKey);
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: { name: "ZENO OS AI Automation - Starter Plan" },
                unit_amount: 9900,
              },
              quantity: 1,
            }],
            mode: "payment",
            success_url: "https://zenoos.ai/success",
            cancel_url: "https://zenoos.ai/cancel",
          });
          analysis.suggestedReply += `\n\nHere is your secure payment link to get started:\n${session.url}`;
        } catch (err: any) {
          console.error("[ZENO Agent] Stripe error:", err.message);
        }
      }
    }
  } else if (analysis.sentiment === "interested" || analysis.sentiment === "question") {
    await storage.updateBusinessLead(lead.id, { status: "engaged" });
  }

  if (analysis.suggestedReply && analysis.sentiment !== "other") {
    try {
      const replySubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
      const result = await sendGmailEmail(email.fromEmail, replySubject, analysis.suggestedReply, email.messageId);

      await storage.createBusinessEmail({
        direction: "sent",
        fromAddr: process.env.GMAIL_ADDRESS || "zeno@agent",
        toAddr: email.fromEmail,
        subject: replySubject,
        body: analysis.suggestedReply,
        status: "sent",
        messageId: result.id,
        threadId: result.threadId,
      });

      await storage.updateBusinessLead(lead.id, { lastContactedAt: new Date() });

      await storage.createLog({
        action: "[ZENO Agent] Auto-reply sent!",
        details: `To: ${email.fromEmail} | Sentiment: ${analysis.sentiment} | Subject: ${replySubject}`,
        source: "autonomous",
      });
    } catch (err: any) {
      console.error("[ZENO Agent] Send reply error:", err.message);
      await storage.createLog({
        action: "[ZENO Agent] Reply failed",
        details: `To: ${email.fromEmail} | Error: ${err.message}`,
        source: "autonomous",
      });
    }
  }
}

async function agentLoop(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const emails = await fetchNewEmails();
    if (emails.length > 0) {
      await storage.createLog({
        action: "[ZENO Agent] Inbox scan complete",
        details: `Found ${emails.length} new email(s) to process`,
        source: "autonomous",
      });
    }

    for (const email of emails) {
      try {
        await processIncomingEmail(email);
      } catch (err: any) {
        console.error("[ZENO Agent] Process email error:", err.message);
      }
    }
  } catch (err: any) {
    console.error("[ZENO Agent] Loop error:", err.message);
  } finally {
    isProcessing = false;
  }
}

export function startAutonomousAgent(intervalMs: number = 60000): void {
  if (agentInterval) return;

  if (!process.env.GMAIL_ADDRESS || !process.env.GMAIL_APP_PASSWORD) {
    console.log("[ZENO Agent] Gmail credentials not set — autonomous agent disabled");
    return;
  }

  agentLoop();
  agentInterval = setInterval(agentLoop, intervalMs);
  console.log(`[ZENO Agent] Autonomous agent started (check every ${Math.round(intervalMs / 1000)}s)`);
}

export function stopAutonomousAgent(): void {
  if (agentInterval) {
    clearInterval(agentInterval);
    agentInterval = null;
    console.log("[ZENO Agent] Autonomous agent stopped");
  }
}

export function isAgentRunning(): boolean {
  return agentInterval !== null;
}
