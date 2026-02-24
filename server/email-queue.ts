import { storage } from "./storage";

let queueInterval: NodeJS.Timeout | null = null;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processNextEmail(): Promise<void> {
  const item = await storage.getNextPendingEmail();
  if (!item) return;

  try {
    await storage.updateEmailQueueItem(item.id, { status: "sending" });

    const host = await storage.getSetting("smtp_host");
    const port = await storage.getSetting("smtp_port");
    const user = await storage.getSetting("smtp_user");
    const pass = await storage.getSetting("smtp_pass");
    const from = await storage.getSetting("smtp_from");

    if (!host?.value || !user?.value || !pass?.value) {
      await storage.updateEmailQueueItem(item.id, { status: "failed", error: "SMTP not configured" });
      return;
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: host.value,
      port: parseInt(port?.value || "587"),
      secure: parseInt(port?.value || "587") === 465,
      auth: { user: user.value, pass: pass.value },
    });

    await transporter.sendMail({
      from: from?.value || user.value,
      to: item.toAddr,
      subject: item.subject,
      text: item.body,
      html: item.body.replace(/\n/g, "<br>"),
    });

    await storage.updateEmailQueueItem(item.id, { status: "sent", sentAt: new Date() });

    await storage.createBusinessEmail({
      direction: "sent",
      fromAddr: from?.value || user.value,
      toAddr: item.toAddr,
      subject: item.subject,
      body: item.body,
      status: "sent",
      workspaceId: item.workspaceId,
    });

    await storage.createLog({
      action: "[ZENO] Email Sent",
      details: `To: ${item.toAddr} | Subject: ${item.subject}`,
      source: "email_queue",
      workspaceId: item.workspaceId,
    });

    if (item.leadId) {
      await storage.updateBusinessLead(item.leadId, {
        lastContactedAt: new Date(),
        status: "contacted",
      });
    }
  } catch (error: any) {
    console.error("Email queue error:", error);
    await storage.updateEmailQueueItem(item.id, {
      status: "failed",
      error: error.message || "Send failed",
    });
  }
}

export function startEmailQueueWorker(): void {
  if (queueInterval) return;

  const delayMs = randomDelay(30000, 120000);

  queueInterval = setInterval(async () => {
    try {
      await processNextEmail();
    } catch (err) {
      console.error("Email queue worker error:", err);
    }
  }, delayMs);

  console.log(`[ZENO] Email queue worker started (delay: ${Math.round(delayMs / 1000)}s)`);
}

export function stopEmailQueueWorker(): void {
  if (queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
    console.log("[ZENO] Email queue worker stopped");
  }
}

export async function queueEmailsForLeads(
  leadIds: number[],
  subject: string,
  bodyTemplate: string,
  workspaceId?: number
): Promise<number> {
  let queued = 0;
  const now = new Date();

  for (let i = 0; i < leadIds.length; i++) {
    const lead = await storage.getBusinessLead(leadIds[i]);
    if (!lead?.email) continue;

    const body = bodyTemplate
      .replace(/\{name\}/g, lead.name)
      .replace(/\{company\}/g, lead.company || "your company");

    const scheduledAt = new Date(now.getTime() + i * randomDelay(30000, 120000));

    await storage.createEmailQueueItem({
      toAddr: lead.email,
      subject,
      body,
      status: "pending",
      scheduledAt,
      leadId: lead.id,
      workspaceId,
    });
    queued++;
  }

  await storage.createLog({
    action: "[ZENO] Emails Queued",
    details: `${queued} emails scheduled with human-like delays`,
    source: "email_queue",
    workspaceId,
  });

  return queued;
}
