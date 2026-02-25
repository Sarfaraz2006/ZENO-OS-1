import { storage } from "./storage";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export interface BrainInsight {
  type: "opportunity" | "warning" | "trend" | "suggestion" | "summary";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  category: "email" | "whatsapp" | "payment" | "automation" | "contacts" | "general";
  action?: string;
}

export interface BrainAnalysis {
  overallHealth: number;
  healthLabel: string;
  insights: BrainInsight[];
  summary: string;
  generatedAt: string;
}

async function gatherBusinessContext(): Promise<string> {
  const emailStats = await storage.getBusinessEmailStats();
  const emails = await storage.getBusinessEmails(20);
  const contacts = await storage.getBusinessContacts(50);
  const metrics = await storage.getBusinessMetrics();
  const settings = await storage.getAllSettings();

  let gmailConnected = false;
  try {
    const { getGmailProfile } = await import("./gmail-client");
    const profile = await getGmailProfile();
    gmailConnected = !!profile.email;
  } catch {}
  const smtpConfigured = gmailConnected || (settings.find(s => s.key === "smtp_host")?.value ? true : false);
  const twilioConnected = settings.find(s => s.key === "twilio_connected")?.value === "true";
  const stripeConnected = settings.find(s => s.key === "stripe_connected")?.value === "true";
  const n8nRuns = Number(metrics.find(m => m.metricType === "n8n" && m.metricKey === "runs")?.metricValue || 0);
  const whatsappSent = Number(metrics.find(m => m.metricType === "whatsapp" && m.metricKey === "sent")?.metricValue || 0);
  const whatsappReceived = Number(metrics.find(m => m.metricType === "whatsapp" && m.metricKey === "received")?.metricValue || 0);
  const paymentTotal = Number(metrics.find(m => m.metricType === "payment" && m.metricKey === "total")?.metricValue || 0);
  const paymentCount = Number(metrics.find(m => m.metricType === "payment" && m.metricKey === "count")?.metricValue || 0);

  const recentEmails = emails.slice(0, 10).map(e => ({
    direction: e.direction,
    from: e.fromAddr,
    to: e.toAddr,
    subject: e.subject,
    status: e.status,
    date: e.createdAt,
  }));

  const contactSummary = contacts.map(c => ({
    name: c.name,
    email: c.email,
    source: c.source,
    totalMessages: c.totalMessages,
  }));

  const unrepliedReceived = emails.filter(e => e.direction === "received" && e.status !== "replied");
  const replyRate = emailStats.received > 0 ? Math.round((emailStats.replied / emailStats.received) * 100) : 0;

  return `
=== ZENO OS BUSINESS INTELLIGENCE CONTEXT ===
Generated: ${new Date().toISOString()}

## Integration Status
- Email (Gmail): ${smtpConfigured ? "CONNECTED" : "NOT CONFIGURED"}
- WhatsApp (Twilio): ${twilioConnected ? "CONNECTED" : "NOT CONNECTED"}
- Stripe Payments: ${stripeConnected ? "CONNECTED" : "NOT CONNECTED"}
- n8n Automation: ${n8nRuns > 0 ? `ACTIVE (${n8nRuns} runs)` : "NOT TESTED"}

## Email Analytics
- Total Emails: ${emailStats.total}
- Sent: ${emailStats.sent}
- Received: ${emailStats.received}
- Replied: ${emailStats.replied}
- Reply Rate: ${replyRate}%
- Unreplied Received Emails: ${unrepliedReceived.length}

## WhatsApp Analytics
- Sent: ${whatsappSent}
- Received: ${whatsappReceived}
- Total: ${whatsappSent + whatsappReceived}

## Payment Analytics
- Total Revenue: $${paymentTotal}
- Transaction Count: ${paymentCount}
- Avg Transaction: $${paymentCount > 0 ? Math.round(paymentTotal / paymentCount) : 0}

## Contacts
- Total Contacts: ${contacts.length}
${contactSummary.length > 0 ? contactSummary.map(c => `  - ${c.name} (${c.email || 'no email'}) via ${c.source}, ${c.totalMessages} msgs`).join('\n') : '  - No contacts yet'}

## Recent Emails (last 10)
${recentEmails.length > 0 ? recentEmails.map(e => `  - [${e.direction.toUpperCase()}] ${e.subject} (${e.from} → ${e.to}) [${e.status}]`).join('\n') : '  - No emails yet'}

## Unreplied Emails Needing Attention
${unrepliedReceived.length > 0 ? unrepliedReceived.map(e => `  - FROM: ${e.fromAddr} | SUBJECT: ${e.subject} | DATE: ${e.createdAt}`).join('\n') : '  - All caught up!'}

## Automation
- n8n Webhook Runs: ${n8nRuns}
`;
}

function generateRuleBasedInsights(context: string): BrainInsight[] {
  const insights: BrainInsight[] = [];

  const emailTotal = parseInt(context.match(/Total Emails: (\d+)/)?.[1] || "0");
  const sent = parseInt(context.match(/Sent: (\d+)/)?.[1] || "0");
  const received = parseInt(context.match(/Received: (\d+)/)?.[1] || "0");
  const replyRate = parseInt(context.match(/Reply Rate: (\d+)%/)?.[1] || "0");
  const unreplied = parseInt(context.match(/Unreplied Received Emails: (\d+)/)?.[1] || "0");
  const contactCount = parseInt(context.match(/Total Contacts: (\d+)/)?.[1] || "0");
  const paymentTotal = parseFloat(context.match(/Total Revenue: \$(\d+)/)?.[1] || "0");
  const smtpConnected = context.includes("Email (Gmail): CONNECTED");
  const twilioConnected = context.includes("WhatsApp (Twilio): CONNECTED");
  const stripeConnected = context.includes("Stripe Payments: CONNECTED");
  const n8nActive = context.includes("n8n Automation: ACTIVE");

  if (!smtpConnected) {
    insights.push({
      type: "suggestion",
      title: "Email Not Connected",
      detail: "Gmail is not connected. Connect your Gmail account to start sending business emails and auto-outreach to leads.",
      priority: "high",
      category: "email",
      action: "Connect Gmail via Replit integrations",
    });
  }

  if (unreplied > 0) {
    insights.push({
      type: "warning",
      title: `${unreplied} Unreplied Email${unreplied > 1 ? 's' : ''}`,
      detail: `You have ${unreplied} received email${unreplied > 1 ? 's' : ''} that haven't been replied to. Quick responses improve client relationships and conversion rates.`,
      priority: unreplied > 3 ? "high" : "medium",
      category: "email",
      action: "Go to Business Board → Emails tab to reply",
    });
  }

  if (smtpConnected && replyRate < 50 && received > 2) {
    insights.push({
      type: "trend",
      title: `Low Reply Rate: ${replyRate}%`,
      detail: `Your email reply rate is ${replyRate}%. Industry standard is 60-80%. Consider setting up auto-replies or templates to respond faster.`,
      priority: "medium",
      category: "email",
    });
  }

  if (smtpConnected && emailTotal > 0 && sent > received * 2) {
    insights.push({
      type: "trend",
      title: "High Outbound Ratio",
      detail: `You're sending ${sent} emails but only receiving ${received}. This could mean your outreach needs better targeting or your emails aren't getting responses.`,
      priority: "low",
      category: "email",
    });
  }

  if (!twilioConnected) {
    insights.push({
      type: "opportunity",
      title: "WhatsApp Channel Available",
      detail: "WhatsApp Business has 98% open rates vs 20% for email. Connect Twilio to reach clients on their preferred messaging platform.",
      priority: "medium",
      category: "whatsapp",
      action: "Go to Settings → Integrations → WhatsApp Setup",
    });
  }

  if (!stripeConnected) {
    insights.push({
      type: "opportunity",
      title: "Payment Tracking Available",
      detail: "Connect Stripe to automatically track invoices, payments, and revenue. This gives you real-time financial insights.",
      priority: "medium",
      category: "payment",
      action: "Go to Settings → Integrations → Stripe Setup",
    });
  }

  if (stripeConnected && paymentTotal === 0) {
    insights.push({
      type: "suggestion",
      title: "No Payments Recorded",
      detail: "Stripe is connected but no payments have been tracked yet. Make sure your webhook is configured to send payment events.",
      priority: "medium",
      category: "payment",
    });
  }

  if (!n8nActive) {
    insights.push({
      type: "suggestion",
      title: "Automation Not Active",
      detail: "n8n webhook is ready but hasn't received any automation events yet. Set up workflows in n8n to automate repetitive tasks like follow-ups, notifications, and data sync.",
      priority: "low",
      category: "automation",
      action: "Go to Settings → Integrations → n8n Setup for webhook URL",
    });
  }

  if (contactCount === 0) {
    insights.push({
      type: "suggestion",
      title: "No Contacts Yet",
      detail: "Start building your contact database. Contacts help you track client relationships, communication history, and identify high-value leads.",
      priority: "medium",
      category: "contacts",
      action: "Go to Business Board → Contacts tab → Add Contact",
    });
  }

  if (contactCount > 5 && emailTotal === 0) {
    insights.push({
      type: "opportunity",
      title: "Contacts Without Communication",
      detail: `You have ${contactCount} contacts but no email activity. Consider sending a newsletter or outreach to engage your contact list.`,
      priority: "medium",
      category: "contacts",
    });
  }

  if (smtpConnected && emailTotal > 10 && replyRate > 70) {
    insights.push({
      type: "trend",
      title: "Strong Email Engagement",
      detail: `Your ${replyRate}% reply rate is excellent! Your communication is resonating well with recipients.`,
      priority: "low",
      category: "email",
    });
  }

  return insights;
}

function calculateHealthScore(context: string, insights: BrainInsight[]): { score: number; label: string } {
  let score = 50;

  const smtpConnected = context.includes("Email (Gmail): CONNECTED");
  const twilioConnected = context.includes("WhatsApp (Twilio): CONNECTED");
  const stripeConnected = context.includes("Stripe Payments: CONNECTED");
  const n8nActive = context.includes("n8n Automation: ACTIVE");

  if (smtpConnected) score += 15;
  if (twilioConnected) score += 10;
  if (stripeConnected) score += 10;
  if (n8nActive) score += 5;

  const highWarnings = insights.filter(i => i.type === "warning" && i.priority === "high").length;
  const mediumWarnings = insights.filter(i => i.type === "warning" && i.priority === "medium").length;
  score -= highWarnings * 10;
  score -= mediumWarnings * 5;

  const opportunities = insights.filter(i => i.type === "opportunity").length;
  score -= opportunities * 3;

  const positives = insights.filter(i => i.type === "trend" && i.priority === "low").length;
  score += positives * 5;

  score = Math.max(10, Math.min(100, score));

  let label = "Needs Setup";
  if (score >= 80) label = "Excellent";
  else if (score >= 65) label = "Good";
  else if (score >= 45) label = "Fair";
  else if (score >= 25) label = "Needs Attention";

  return { score, label };
}

export async function analyzeBusinessWithRules(): Promise<BrainAnalysis> {
  const context = await gatherBusinessContext();
  const insights = generateRuleBasedInsights(context);
  const { score, label } = calculateHealthScore(context, insights);

  insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    overallHealth: score,
    healthLabel: label,
    insights,
    summary: `Business health: ${score}/100 (${label}). ${insights.length} insights found.`,
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeBusinessWithAI(question?: string): Promise<BrainAnalysis> {
  const context = await gatherBusinessContext();
  const ruleInsights = generateRuleBasedInsights(context);
  const { score, label } = calculateHealthScore(context, ruleInsights);

  try {
    const prompt = question
      ? `You are ZENO Business Brain - an AI business intelligence analyst. Given the following business data, answer this specific question: "${question}"

${context}

Respond with a JSON object with these fields:
{
  "insights": [
    {
      "type": "opportunity|warning|trend|suggestion|summary",
      "title": "Short title",
      "detail": "Detailed explanation in 1-2 sentences",
      "priority": "high|medium|low",
      "category": "email|whatsapp|payment|automation|contacts|general",
      "action": "Optional action step"
    }
  ],
  "summary": "A 2-3 sentence answer to the question with business context"
}

Be specific, actionable, and data-driven. Reference actual numbers from the data.`
      : `You are ZENO Business Brain - an AI business intelligence analyst. Analyze this business data and generate strategic insights:

${context}

Generate a JSON response with:
{
  "insights": [3-5 strategic insights as objects with type, title, detail, priority, category, action fields],
  "summary": "2-3 sentence executive summary of business health and top priorities"
}

Types: opportunity (growth potential), warning (needs attention), trend (pattern observed), suggestion (improvement idea), summary (overview)
Categories: email, whatsapp, payment, automation, contacts, general
Priorities: high, medium, low

Focus on actionable intelligence. Be specific with numbers. Don't repeat what's obvious.`;

    const response = await openrouter.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const aiContent = response.choices[0]?.message?.content || "";
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const aiInsights: BrainInsight[] = (parsed.insights || []).map((i: any) => ({
        type: i.type || "suggestion",
        title: i.title || "Insight",
        detail: i.detail || "",
        priority: i.priority || "medium",
        category: i.category || "general",
        action: i.action,
      }));

      const allInsights = [...ruleInsights, ...aiInsights];
      allInsights.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return {
        overallHealth: score,
        healthLabel: label,
        insights: allInsights,
        summary: parsed.summary || `Business health: ${score}/100. ${allInsights.length} insights generated.`,
        generatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("AI analysis failed, falling back to rules:", error);
  }

  return {
    overallHealth: score,
    healthLabel: label,
    insights: ruleInsights,
    summary: `Business health: ${score}/100 (${label}). ${ruleInsights.length} rule-based insights found.`,
    generatedAt: new Date().toISOString(),
  };
}

export async function getBusinessContextForChat(): Promise<string> {
  return gatherBusinessContext();
}
