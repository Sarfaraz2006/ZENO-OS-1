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

export default function BusinessPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "emails" | "contacts">("overview");
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

  const { data: stats, isLoading: statsLoading } = useQuery<BusinessStats>({
    queryKey: ["/api/business/stats"],
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery<BusinessEmail[]>({
    queryKey: ["/api/business/emails"],
  });

  const { data: contacts = [] } = useQuery<BusinessContact[]>({
    queryKey: ["/api/business/contacts"],
  });

  const checkInbox = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/check-inbox", {});
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
        originalId: replyDialog.id,
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
    { id: "emails" as const, label: "Emails" },
    { id: "contacts" as const, label: "Contacts" },
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
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium">Email</span>
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto text-emerald-500 border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                    Connected
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">SMTP configured in Settings. Send, receive, and reply to emails.</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium">WhatsApp</span>
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto text-amber-500 border-amber-500/30">
                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                    Setup Needed
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Connect Twilio for WhatsApp Business messaging.</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">Payments</span>
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto text-amber-500 border-amber-500/30">
                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                    Setup Needed
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Connect Stripe for payment tracking and invoicing.</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Workflow className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-medium">n8n</span>
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto text-emerald-500 border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                    Ready
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Webhook endpoint ready. Send POST to /api/business/webhook/n8n</p>
              </CardContent>
            </Card>
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
