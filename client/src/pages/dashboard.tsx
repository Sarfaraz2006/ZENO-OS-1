import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
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
  MessageSquare,
  Bot,
  Key,
  Zap,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Mic,
  Globe,
  BarChart3,
  Sparkles,
  Terminal,
  GitBranch,
  Code2,
  Mail,
  Activity,
  Users,
  Layers,
  Radio,
  Search,
  Clock,
} from "lucide-react";

const USAGE_DATA = [
  { name: "Mon", messages: 12, tokens: 4800 },
  { name: "Tue", messages: 18, tokens: 7200 },
  { name: "Wed", messages: 25, tokens: 10000 },
  { name: "Thu", messages: 15, tokens: 6000 },
  { name: "Fri", messages: 30, tokens: 12000 },
  { name: "Sat", messages: 22, tokens: 8800 },
  { name: "Sun", messages: 28, tokens: 11200 },
];

const MODEL_USAGE = [
  { name: "Llama 3.3", value: 35, color: "#3b82f6" },
  { name: "Claude", value: 28, color: "#8b5cf6" },
  { name: "DeepSeek", value: 20, color: "#10b981" },
  { name: "Gemini", value: 12, color: "#f59e0b" },
  { name: "Qwen", value: 5, color: "#ec4899" },
];

const FEATURE_ACTIVITY = [
  { name: "Chat", count: 45 },
  { name: "Code Gen", count: 32 },
  { name: "Voice", count: 18 },
  { name: "Terminal", count: 14 },
  { name: "GitHub", count: 8 },
  { name: "API", count: 6 },
];

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<{
    conversations: number;
    messages: number;
    models: number;
    apiKeys: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const statCards = [
    {
      label: "Total Conversations",
      value: stats?.conversations ?? 0,
      change: "+12%",
      icon: MessageSquare,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-500",
      changeColor: "text-emerald-500",
    },
    {
      label: "Messages Sent",
      value: stats?.messages ?? 0,
      change: "+24%",
      icon: TrendingUp,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-500",
      changeColor: "text-emerald-500",
    },
    {
      label: "Active Models",
      value: stats?.models ?? 0,
      change: "5 enabled",
      icon: Cpu,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-500",
      changeColor: "text-violet-400",
    },
    {
      label: "API Keys",
      value: stats?.apiKeys ?? 0,
      change: "Secure",
      icon: Key,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-500",
      changeColor: "text-amber-400",
    },
  ];

  const quickActions = [
    { label: "New Chat", icon: MessageSquare, href: "/chat", color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Models", icon: Bot, href: "/models", color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Terminal", icon: Terminal, href: "/terminal", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "GitHub", icon: GitBranch, href: "/github", color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Editor", icon: Code2, href: "/editor", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Email", icon: Mail, href: "/settings", color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Business", icon: BarChart3, href: "/business", color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

  const capabilities = [
    { title: "Multi-Model AI", desc: "500+ models via OpenRouter", icon: Sparkles, status: "live" },
    { title: "Intelligence Router", desc: "Auto-selects best model per task", icon: Cpu, status: "live" },
    { title: "Code Generation", desc: "Lovable-style live preview", icon: Code2, status: "live" },
    { title: "Lead Scouting", desc: "DuckDuckGo auto-scraper", icon: Search, status: "live" },
    { title: "Email Queue", desc: "Smart delays, bulk outreach", icon: Mail, status: "live" },
    { title: "Workspace Isolation", desc: "Multi-business support", icon: Layers, status: "live" },
    { title: "Voice Agent", desc: "Commands + continuous mode", icon: Mic, status: "live" },
  ];

  interface ActivityLog {
    id: number;
    action: string;
    details: string | null;
    source: string | null;
    createdAt: string;
  }

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/activity/stream", { withCredentials: true });
    es.onmessage = (event) => {
      try {
        const logs = JSON.parse(event.data);
        setActivityLogs(logs);
      } catch {}
    };
    eventSourceRef.current = es;
    return () => es.close();
  }, []);

  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-blue-400">{payload[0]?.value} messages</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-primary">{payload[0]?.value} uses</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            ZENO OS
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All systems autonomous
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 h-7">
            <Zap className="w-3 h-3 text-primary" />
            ZENO OS
          </Badge>
          <Button size="sm" className="gap-2 h-7 text-xs" onClick={() => setLocation("/chat")} data-testid="button-start-chat">
            <MessageSquare className="w-3 h-3" />
            New Chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="overflow-hidden hover-elevate">
            <CardContent className="p-4 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <div className="relative">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                        <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                      </div>
                      <span className={`text-[11px] font-medium ${stat.changeColor} flex items-center gap-0.5`}>
                        <ArrowUpRight className="w-3 h-3" />
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold tracking-tight" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
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
                <h3 className="font-semibold text-sm">Usage Analytics</h3>
                <p className="text-[11px] text-muted-foreground">Messages per day this week</p>
              </div>
              <Badge variant="outline" className="text-[10px] h-5">Weekly</Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={USAGE_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipArea />} />
                  <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">Model Usage</h3>
                <p className="text-[11px] text-muted-foreground">Distribution by model</p>
              </div>
            </div>
            <div className="h-[140px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MODEL_USAGE}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {MODEL_USAGE.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              {MODEL_USAGE.map((model) => (
                <div key={model.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                  <span className="text-[11px] text-muted-foreground truncate">{model.name}</span>
                  <span className="text-[11px] font-medium ml-auto">{model.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">Feature Activity</h3>
                <p className="text-[11px] text-muted-foreground">Usage by feature</p>
              </div>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FEATURE_ACTIVITY} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipBar />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Quick Actions</h3>
              <Layers className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => setLocation(action.href)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group"
                  data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                  </div>
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">System Status</h3>
                <p className="text-[11px] text-muted-foreground">All capabilities</p>
              </div>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-2">
              {capabilities.map((cap) => (
                <div key={cap.title} className="flex items-center gap-2.5 py-1.5">
                  <cap.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{cap.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cap.desc}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Live Activity Feed</h3>
                <p className="text-[11px] text-muted-foreground">Real-time autonomous actions</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] h-5 gap-1 text-emerald-500 border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </Badge>
          </div>
          {activityLogs.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No activity yet. Start using ZENO OS to see live actions here.</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {activityLogs.map((log) => {
                  const isZeno = log.action.includes("[ZENO]");
                  const sourceColors: Record<string, string> = {
                    scraper: "text-cyan-500 bg-cyan-500/10",
                    email_queue: "text-blue-500 bg-blue-500/10",
                    stripe: "text-amber-500 bg-amber-500/10",
                    workspace: "text-violet-500 bg-violet-500/10",
                    auth: "text-rose-500 bg-rose-500/10",
                  };
                  const colorClass = sourceColors[log.source || ""] || "text-muted-foreground bg-muted/50";
                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors ${isZeno ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/30"}`}
                      data-testid={`activity-log-${log.id}`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                        <Zap className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{log.action}</p>
                        {log.details && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{log.details}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {log.source && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">{log.source}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
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
  );
}
