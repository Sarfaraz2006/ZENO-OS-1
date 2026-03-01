import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Mail,
  MessageCircle,
  DollarSign,
  Workflow,
  Send,
  Inbox,
  Reply,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Users,
  Plus,
  TrendingUp,
  BarChart3,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Brain,
  Sparkles,
  ShieldAlert,
  Lightbulb,
  Target,
  Activity,
  Heart,
  MessageSquare,
  Zap,
  Trash2,
  Bot,
  Power,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessStats {
  email: { sent: number; received: number; replied: number; total: number };
  whatsapp: { sent: number; received: number; total: number };
  payment: { total: number; count: number };
  automation: { workflows: number; runs: number };
  contacts: number;
}

interface BusinessEmail {
  id: number;
  direction: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  body: string | null;
  status: string;
  messageId: string | null;
  threadId: string | null;
  createdAt: string;
}

interface BusinessContact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  totalMessages: number;
  lastContact: string | null;
}

interface BrainInsight {
  type: "opportunity" | "warning" | "trend" | "suggestion" | "summary";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  category: "email" | "whatsapp" | "payment" | "automation" | "contacts" | "general";
  action?: string;
}

interface BrainAnalysis {
  overallHealth: number;
  healthLabel: string;
  insights: BrainInsight[];
  summary: string;
  generatedAt: string;
}

const EMAIL_CHART_DATA = [
  { name: "Mon", sent: 3, received: 5 },
  { name: "Tue", sent: 5, received: 8 },
  { name: "Wed", sent: 2, received: 4 },
  { name: "Thu", sent: 7, received: 6 },
  { name: "Fri", sent: 4, received: 9 },
  { name: "Sat", sent: 1, received: 3 },
  { name: "Sun", sent: 0, received: 2 },
];

const CHANNEL_DATA = [
  { name: "Email", value: 45, color: "#3b82f6" },
  { name: "WhatsApp", value: 30, color: "#22c55e" },
  { name: "Chat", value: 20, color: "#8b5cf6" },
  { name: "API", value: 5, color: "#f59e0b" },
];

interface BusinessLead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  status: string;
  source: string | null;
  score: number | null;
  notes: string | null;
  createdAt: string;
}

interface EmailQueueItem {
  id: number;
  toAddr: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

export default function BusinessPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "emails" | "contacts" | "brain" | "leads" | "queue">("overview");
  const [replyDialog, setReplyDialog] = useState<BusinessEmail | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [composeDialog, setComposeDialog] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brainQuestion, setBrainQuestion] = useState("");
  const [brainAnswer, setBrainAnswer] = useState<BrainAnalysis | null>(null);
  const [scrapeQuery, setScrapeQuery] = useState("");
  const [addLeadDialog, setAddLeadDialog] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCompany, setNewLeadCompany] = useState("");

  const { data: integrationStatus } = useQuery<{ email: { connected: boolean }; whatsapp: { connected: boolean }; stripe: { connected: boolean }; n8n: { connected: boolean } }>({
    queryKey: ["/api/integrations/status"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<BusinessStats>({
    queryKey: ["/api/business/stats"],
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery<BusinessEmail[]>({
    queryKey: ["/api/business/emails"],
  });

  const { data: contacts = [] } = useQuery<BusinessContact[]>({
    queryKey: ["/api/business/contacts"],
  });

  const { data: brainAnalysis, isLoading: brainLoading, refetch: refetchBrain } = useQuery<BrainAnalysis>({
    queryKey: ["/api/brain/analyze"],
    enabled: activeTab === "brain",
    staleTime: 60000,
  });

  const askBrain = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/brain/ask", { question });
      return res.json();
    },
    onSuccess: (data: BrainAnalysis) => {
      setBrainAnswer(data);
    },
    onError: (error: Error) => {
      toast({ title: "Brain analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const deepAnalyze = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/brain/analyze?mode=ai");
      return res.json();
    },
    onSuccess: (data: BrainAnalysis) => {
      setBrainAnswer(data);
      queryClient.invalidateQueries({ queryKey: ["/api/brain/analyze"] });
      toast({ title: "Deep analysis complete" });
    },
    onError: (error: Error) => {
      toast({ title: "Deep analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const checkInbox = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/v2/sync", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/stats"] });
      toast({ title: "Inbox checked", description: `${data.fetched} emails found, ${data.saved} new` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to check inbox", description: error.message, variant: "destructive" });
    },
  });

  const { data: agentStatus } = useQuery<{ running: boolean }>({
    queryKey: ["/api/agent/status"],
    refetchInterval: 10000,
  });

  const toggleAgent = useMutation({
    mutationFn: async () => {
      const endpoint = agentStatus?.running ? "/api/agent/stop" : "/api/agent/start";
      const res = await apiRequest("POST", endpoint, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      toast({ title: data.running ? "Agent activated" : "Agent stopped", description: data.running ? "Autonomous email agent is now running" : "Agent has been deactivated" });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/send", {
        to: composeTo, subject: composeSubject, body: composeBody,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/stats"] });
      setComposeDialog(false);
      setComposeTo(""); setComposeSubject(""); setComposeBody("");
      toast({ title: "Email sent!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyDialog) throw new Error("No email");
      const res = await apiRequest("POST", "/api/email/reply", {
        to: replyDialog.direction === "received" ? replyDialog.fromAddr : replyDialog.toAddr,
        subject: replyDialog.subject,
        body: replyBody,
        originalId: replyDialog.messageId || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/emails"] });
      setReplyDialog(null); setReplyBody("");
      toast({ title: "Reply sent!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/business/contacts", {
        name: contactName, email: contactEmail || null, phone: contactPhone || null, source: "manual",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/contacts"] });
      setAddContactDialog(false);
      setContactName(""); setContactEmail(""); setContactPhone("");
      toast({ title: "Contact added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<BusinessLead[]>({
    queryKey: ["/api/leads"],
    enabled: activeTab === "leads",
  });

  const { data: emailQueue = [] } = useQuery<EmailQueueItem[]>({
    queryKey: ["/api/email-queue"],
    enabled: activeTab === "queue",
  });

  const scrapeLeads = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/scrape", { query: scrapeQuery });
      return res.json();
    },
    onSuccess: (data: { leadsFound: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Scouting Complete", description: data.message });
      setScrapeQuery("");
    },
    onError: (error: Error) => {
      toast({ title: "Scouting failed", description: error.message, variant: "destructive" });
    },
  });

  const addLead = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads", {
        name: newLeadName, email: newLeadEmail || null,
        phone: newLeadPhone || null, company: newLeadCompany || null,
        status: "new", source: "manual",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setAddLeadDialog(false);
      setNewLeadName(""); setNewLeadEmail(""); setNewLeadPhone(""); setNewLeadCompany("");
      toast({ title: "Lead added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead removed" });
    },
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs font-medium">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const statCards = [
    {
      label: "Emails",
      value: stats?.email.total ?? 0,
      sub: `${stats?.email.sent ?? 0} sent / ${stats?.email.received ?? 0} received`,
      icon: Mail,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-500",
    },
    {
      label: "WhatsApp",
      value: stats?.whatsapp.total ?? 0,
      sub: `${stats?.whatsapp.sent ?? 0} sent / ${stats?.whatsapp.received ?? 0} received`,
      icon: MessageCircle,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-500",
    },
    {
      label: "Payments",
      value: stats?.payment.count ?? 0,
      sub: `$${(stats?.payment.total ?? 0).toLocaleString()} total`,
      icon: DollarSign,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-500",
    },
    {
      label: "Automations",
      value: stats?.automation.runs ?? 0,
      sub: `${stats?.automation.workflows ?? 0} workflows`,
      icon: Workflow,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-500",
    },
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "leads" as const, label: "Leads" },
    { id: "emails" as const, label: "Emails" },
    { id: "queue" as const, label: "Email Queue" },
    { id: "contacts" as const, label: "Contacts" },
    { id: "brain" as const, label: "Business Brain" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-business-title">
            Business Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Email, WhatsApp, Payments & Automation analytics
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={agentStatus?.running ? "default" : "outline"}
            className={`gap-2 text-xs h-8 ${agentStatus?.running ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            onClick={() => toggleAgent.mutate()}
            disabled={toggleAgent.isPending}
            data-testid="button-toggle-agent"
          >
            {toggleAgent.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
            {agentStatus?.running ? "Agent ON" : "Agent OFF"}
            {agentStatus?.running && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs h-8" onClick={() => checkInbox.mutate()} disabled={checkInbox.isPending} data-testid="button-check-inbox">
            {checkInbox.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Inbox className="w-3 h-3" />}
            Check Inbox
          </Button>
          <Button size="sm" className="gap-2 text-xs h-8" onClick={() => setComposeDialog(true)} data-testid="button-compose-email">
            <Send className="w-3 h-3" />
            Compose
          </Button>
        </div>
      </div>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat) => (
              <Card key={stat.label} className="overflow-hidden hover-elevate">
                <CardContent className="p-4 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
                  <div className="relative">
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                            <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight" data-testid={`text-biz-${stat.label.toLowerCase()}`}>{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">Email Activity</h3>
                    <p className="text-[11px] text-muted-foreground">Sent vs Received this week</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">Weekly</Badge>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={EMAIL_CHART_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                      <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" name="Received" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">Channels</h3>
                    <p className="text-[11px] text-muted-foreground">Communication split</p>
                  </div>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {CHANNEL_DATA.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                  {CHANNEL_DATA.map((ch) => (
                    <div key={ch.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                      <span className="text-[11px] text-muted-foreground">{ch.name}</span>
                      <span className="text-[11px] font-medium ml-auto">{ch.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Email", icon: Mail, iconColor: "text-blue-500",
                connected: integrationStatus?.email.connected ?? false,
                connectedText: "Gmail connected. Send emails and auto-outreach enabled.",
                disconnectedText: "Connect Gmail to enable email sending.",
              },
              {
                label: "WhatsApp", icon: MessageCircle, iconColor: "text-emerald-500",
                connected: integrationStatus?.whatsapp.connected ?? false,
                connectedText: "Twilio connected. WhatsApp messaging enabled.",
                disconnectedText: "Connect Twilio in Settings to enable WhatsApp.",
              },
              {
                label: "Payments", icon: DollarSign, iconColor: "text-amber-500",
                connected: integrationStatus?.stripe.connected ?? false,
                connectedText: "Stripe connected. Payment tracking enabled.",
                disconnectedText: "Connect Stripe in Settings to track payments.",
              },
              {
                label: "n8n", icon: Workflow, iconColor: "text-violet-500",
                connected: integrationStatus?.n8n?.connected ?? false,
                connectedText: "Webhook active. Automation events being tracked.",
                disconnectedText: "Webhook ready but not tested yet. Send a POST to connect.",
              },
            ].map((item) => (
              <Card key={item.label} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                    {item.connected ? (
                      <Badge variant="outline" className="text-[10px] h-5 ml-auto text-emerald-500 border-emerald-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 ml-auto text-muted-foreground border-border/50">
                        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.connected ? item.connectedText : item.disconnectedText}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Recent Emails</h3>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setActiveTab("emails")} data-testid="button-view-all-emails">
                  View All
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {emailsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No emails yet. Send one or check your inbox!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {emails.slice(0, 5).map((email) => (
                    <div key={email.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setReplyDialog(email)} data-testid={`email-item-${email.id}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${email.direction === "sent" ? "bg-blue-500/15" : "bg-emerald-500/15"}`}>
                        {email.direction === "sent" ? <Send className="w-3 h-3 text-blue-500" /> : <Inbox className="w-3 h-3 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{email.subject}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {email.direction === "sent" ? `To: ${email.toAddr}` : `From: ${email.fromAddr}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[9px] h-4 ${email.direction === "sent" ? "text-blue-500" : "text-emerald-500"}`}>
                          {email.direction}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(email.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "emails" && (
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">All Emails</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => checkInbox.mutate()} disabled={checkInbox.isPending}>
                  {checkInbox.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh
                </Button>
                <Button size="sm" className="gap-1 text-xs h-7" onClick={() => setComposeDialog(true)}>
                  <Plus className="w-3 h-3" />
                  New
                </Button>
              </div>
            </div>
            {emails.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No emails in your business mailbox</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Send an email or check your inbox to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-1">
                  {emails.map((email) => (
                    <div key={email.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/30" onClick={() => setReplyDialog(email)} data-testid={`email-full-${email.id}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${email.direction === "sent" ? "bg-blue-500/15" : "bg-emerald-500/15"}`}>
                        {email.direction === "sent" ? <Send className="w-3.5 h-3.5 text-blue-500" /> : <Inbox className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{email.subject}</p>
                          <Badge variant="outline" className={`text-[9px] h-4 shrink-0 ${email.status === "replied" ? "text-violet-500" : email.direction === "sent" ? "text-blue-500" : "text-emerald-500"}`}>
                            {email.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {email.direction === "sent" ? `To: ${email.toAddr}` : `From: ${email.fromAddr}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(email.createdAt).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={(e) => { e.stopPropagation(); setReplyDialog(email); }}>
                          <Reply className="w-3 h-3" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "contacts" && (
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Business Contacts</h3>
                <Badge variant="outline" className="text-[10px] h-5">{contacts.length}</Badge>
              </div>
              <Button size="sm" className="gap-1 text-xs h-7" onClick={() => setAddContactDialog(true)} data-testid="button-add-contact">
                <Plus className="w-3 h-3" />
                Add Contact
              </Button>
            </div>
            {contacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No contacts yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add contacts manually or they'll be auto-added from emails</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:border-border/50 transition-colors" data-testid={`contact-${contact.id}`}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{contact.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{contact.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {contact.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{contact.email}</span>}
                        {contact.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{contact.phone}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">{contact.source}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "brain" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Business Brain</h3>
                    <p className="text-[11px] text-muted-foreground">AI-powered intelligence</p>
                  </div>
                </div>

                {brainLoading ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    <p className="text-xs text-muted-foreground">Analyzing your business...</p>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <div className="flex items-center justify-center">
                        <div className="relative w-32 h-32">
                          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeOpacity="0.3" />
                            <circle
                              cx="60" cy="60" r="50" fill="none"
                              stroke={
                                (brainAnswer?.overallHealth ?? brainAnalysis?.overallHealth ?? 50) >= 70 ? "#22c55e" :
                                (brainAnswer?.overallHealth ?? brainAnalysis?.overallHealth ?? 50) >= 45 ? "#f59e0b" : "#ef4444"
                              }
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${((brainAnswer?.overallHealth ?? brainAnalysis?.overallHealth ?? 50) / 100) * 314} 314`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold" data-testid="text-brain-score">
                              {brainAnswer?.overallHealth ?? brainAnalysis?.overallHealth ?? "--"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {brainAnswer?.healthLabel ?? brainAnalysis?.healthLabel ?? "Loading"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <Button
                        size="sm"
                        className="w-full gap-2 text-xs h-8"
                        onClick={() => deepAnalyze.mutate()}
                        disabled={deepAnalyze.isPending}
                        data-testid="button-deep-analyze"
                      >
                        {deepAnalyze.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Deep AI Analysis
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-xs h-8"
                        onClick={() => refetchBrain()}
                        data-testid="button-refresh-brain"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh Insights
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center">
                      {brainAnswer?.summary ?? brainAnalysis?.summary ?? "Click analyze to get insights"}
                    </p>
                    {(brainAnswer?.generatedAt ?? brainAnalysis?.generatedAt) && (
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
                        Updated: {new Date(brainAnswer?.generatedAt ?? brainAnalysis?.generatedAt ?? "").toLocaleTimeString()}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Insights & Suggestions</h3>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {(brainAnswer?.insights ?? brainAnalysis?.insights ?? []).length}
                    </Badge>
                  </div>
                </div>

                {brainLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                  </div>
                ) : (brainAnswer?.insights ?? brainAnalysis?.insights ?? []).length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No insights yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click "Deep AI Analysis" to generate business intelligence</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-2">
                      {(brainAnswer?.insights ?? brainAnalysis?.insights ?? []).map((insight, idx) => {
                        const typeConfig = {
                          opportunity: { icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Opportunity" },
                          warning: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Warning" },
                          trend: { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Trend" },
                          suggestion: { icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Suggestion" },
                          summary: { icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Summary" },
                        };
                        const cfg = typeConfig[insight.type] || typeConfig.suggestion;
                        const Icon = cfg.icon;
                        const priorityColor = insight.priority === "high" ? "text-red-500 border-red-500/30" : insight.priority === "medium" ? "text-amber-500 border-amber-500/30" : "text-muted-foreground border-border/50";
                        const categoryIcons: Record<string, any> = {
                          email: Mail, whatsapp: MessageCircle, payment: DollarSign, automation: Workflow, contacts: Users, general: Zap,
                        };
                        const CatIcon = categoryIcons[insight.category] || Zap;

                        return (
                          <div key={idx} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} transition-colors hover:opacity-90`} data-testid={`brain-insight-${idx}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Icon className={`w-4 h-4 ${cfg.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-semibold">{insight.title}</span>
                                  <Badge variant="outline" className={`text-[9px] h-4 ${priorityColor}`}>{insight.priority}</Badge>
                                  <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                                    <CatIcon className="w-2 h-2" />
                                    {insight.category}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.detail}</p>
                                {insight.action && (
                                  <p className="text-[10px] text-primary font-medium mt-1.5 flex items-center gap-1">
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    {insight.action}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Ask Business Brain</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Ask any business question and the AI will analyze your data to give you a smart answer.
              </p>
              <div className="flex gap-2">
                <Input
                  data-testid="input-brain-question"
                  placeholder="e.g., How can I improve my email response rate?"
                  value={brainQuestion}
                  onChange={(e) => setBrainQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && brainQuestion.trim()) {
                      askBrain.mutate(brainQuestion.trim());
                    }
                  }}
                  className="h-9 text-sm flex-1"
                />
                <Button
                  data-testid="button-ask-brain"
                  size="sm"
                  className="gap-2 text-xs h-9 px-4"
                  disabled={!brainQuestion.trim() || askBrain.isPending}
                  onClick={() => askBrain.mutate(brainQuestion.trim())}
                >
                  {askBrain.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  Ask
                </Button>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  "What should I focus on today?",
                  "How is my email performance?",
                  "What integrations should I set up next?",
                  "Give me a business growth strategy",
                ].map((q, idx) => (
                  <button
                    key={q}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors"
                    onClick={() => {
                      setBrainQuestion(q);
                      askBrain.mutate(q);
                    }}
                    data-testid={`button-quick-q-${idx}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "leads" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-500" />
                  <h3 className="font-semibold text-sm">Lead Scouting</h3>
                </div>
                <Button size="sm" variant="outline" className="gap-2 text-xs h-8" onClick={() => setAddLeadDialog(true)} data-testid="button-add-lead">
                  <Plus className="w-3 h-3" />
                  Add Lead
                </Button>
              </div>
              <div className="flex gap-2 mb-4">
                <Input
                  data-testid="input-scrape-query"
                  placeholder="e.g., restaurants in Delhi, real estate agents Mumbai..."
                  value={scrapeQuery}
                  onChange={(e) => setScrapeQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && scrapeQuery.trim()) scrapeLeads.mutate(); }}
                  className="h-9 text-sm flex-1"
                />
                <Button
                  data-testid="button-scrape-leads"
                  size="sm"
                  className="gap-2 text-xs h-9 px-4"
                  disabled={!scrapeQuery.trim() || scrapeLeads.isPending}
                  onClick={() => scrapeLeads.mutate()}
                >
                  {scrapeLeads.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
                  {scrapeLeads.isPending ? "Scouting..." : "Scout Leads"}
                </Button>
              </div>
              {leadsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the scout above to find leads, or add them manually</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {leads.map((lead) => {
                    const statusColors: Record<string, string> = {
                      new: "text-blue-500 border-blue-500/30",
                      contacted: "text-amber-500 border-amber-500/30",
                      qualified: "text-emerald-500 border-emerald-500/30",
                      client: "text-violet-500 border-violet-500/30",
                      lost: "text-red-500 border-red-500/30",
                    };
                    return (
                      <div key={lead.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group" data-testid={`lead-item-${lead.id}`}>
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-cyan-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium truncate">{lead.name}</p>
                            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${statusColors[lead.status] || ""}`}>
                              {lead.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {lead.email && <span className="text-[10px] text-muted-foreground truncate">{lead.email}</span>}
                            {lead.company && <span className="text-[10px] text-muted-foreground truncate">{lead.company}</span>}
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary truncate hover:underline" onClick={(e) => e.stopPropagation()}>
                                {lead.website.replace(/https?:\/\/(www\.)?/, "").slice(0, 30)}
                              </a>
                            )}
                          </div>
                          {lead.notes && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lead.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">{lead.source}</Badge>
                          <button
                            className="invisible group-hover:visible p-1 rounded hover:bg-destructive/10"
                            onClick={() => deleteLead.mutate(lead.id)}
                            data-testid={`button-delete-lead-${lead.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "queue" && (
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-sm">Email Queue</h3>
                  <p className="text-[11px] text-muted-foreground">Smart delays for human-like sending</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  {emailQueue.filter(q => q.status === "pending").length} pending
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 gap-1 text-emerald-500 border-emerald-500/30">
                  {emailQueue.filter(q => q.status === "sent").length} sent
                </Badge>
              </div>
            </div>
            {emailQueue.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Email queue is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Queue emails from the Leads tab for automated sending</p>
              </div>
            ) : (
              <div className="space-y-1">
                {emailQueue.map((item) => {
                  const statusColors: Record<string, string> = {
                    pending: "text-amber-500 bg-amber-500/10",
                    sending: "text-blue-500 bg-blue-500/10",
                    sent: "text-emerald-500 bg-emerald-500/10",
                    failed: "text-red-500 bg-red-500/10",
                  };
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors" data-testid={`queue-item-${item.id}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${statusColors[item.status] || "bg-muted/50"}`}>
                        {item.status === "sent" ? <CheckCircle2 className="w-3 h-3" /> : item.status === "failed" ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.subject}</p>
                        <p className="text-[10px] text-muted-foreground truncate">To: {item.toAddr}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${statusColors[item.status] || ""}`}>
                          {item.status}
                        </Badge>
                        {item.sentAt && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {item.error && <span className="text-[10px] text-red-500 truncate max-w-[100px]">{item.error}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addLeadDialog} onOpenChange={setAddLeadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              Add Lead
            </DialogTitle>
            <DialogDescription className="text-xs">Add a new business lead manually.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input data-testid="input-lead-name" placeholder="Name" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-lead-email" placeholder="Email (optional)" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-lead-phone" placeholder="Phone (optional)" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-lead-company" placeholder="Company (optional)" value={newLeadCompany} onChange={(e) => setNewLeadCompany(e.target.value)} className="h-9 text-sm" />
            <Button data-testid="button-submit-lead" className="w-full gap-2 text-xs" disabled={!newLeadName || addLead.isPending} onClick={() => addLead.mutate()}>
              {addLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={composeDialog} onOpenChange={setComposeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-primary" />
              Compose Email
            </DialogTitle>
            <DialogDescription className="text-xs">Send an email from your configured SMTP account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input data-testid="input-compose-to" placeholder="recipient@example.com" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-compose-subject" placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} className="h-9 text-sm" />
            <textarea data-testid="textarea-compose-body" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={5} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Write your message..." />
            <Button data-testid="button-send-compose" className="w-full gap-2 text-xs" disabled={!composeTo || !composeSubject || !composeBody || sendEmail.isPending} onClick={() => sendEmail.mutate()}>
              {sendEmail.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!replyDialog} onOpenChange={() => { setReplyDialog(null); setReplyBody(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-primary" />
              {replyDialog?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {replyDialog?.direction === "received" ? `From: ${replyDialog?.fromAddr}` : `To: ${replyDialog?.toAddr}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {replyDialog?.body && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto border border-border/30">
                {replyDialog.body}
              </div>
            )}
            <textarea data-testid="textarea-reply-body" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Write your reply..." />
            <Button data-testid="button-send-reply" className="w-full gap-2 text-xs" disabled={!replyBody || sendReply.isPending} onClick={() => sendReply.mutate()}>
              {sendReply.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Reply className="w-3 h-3" />}
              Send Reply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addContactDialog} onOpenChange={setAddContactDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              Add Contact
            </DialogTitle>
            <DialogDescription className="text-xs">Add a new business contact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input data-testid="input-contact-name" placeholder="Full Name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-contact-email" placeholder="Email (optional)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-9 text-sm" />
            <Input data-testid="input-contact-phone" placeholder="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-9 text-sm" />
            <Button data-testid="button-submit-contact" className="w-full gap-2 text-xs" disabled={!contactName || addContact.isPending} onClick={() => addContact.mutate()}>
              {addContact.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
