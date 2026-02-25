import { storage } from "./storage";
import { sendGmailEmail, getGmailProfile } from "./gmail-client";

let queueInterval: NodeJS.Timeout | null = null;

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processNextEmail(): Promise<void> {
  const item = await storage.getNextPendingEmail();
  if (!item) return;

  try {
    await storage.updateEmailQueueItem(item.id, { status: "sending" });

    const profile = await getGmailProfile();
    const result = await sendGmailEmail(item.toAddr, item.subject, item.body);

    await storage.updateEmailQueueItem(item.id, { status: "sent", sentAt: new Date() });

    await storage.createBusinessEmail({
      direction: "sent",
      fromAddr: profile.email,
      toAddr: item.toAddr,
      subject: item.subject,
      body: item.body,
      status: "sent",
      messageId: result.id,
      threadId: result.threadId,
      workspaceId: item.workspaceId,
    });

    await storage.createLog({
      action: "[ZENO] Email Sent via Gmail",
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
