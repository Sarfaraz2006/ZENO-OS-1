import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ];

  const capabilities = [
    { title: "Multi-Model AI", desc: "500+ models via OpenRouter", icon: Sparkles, status: "live" },
    { title: "Voice Agent", desc: "Continuous conversation mode", icon: Mic, status: "live" },
    { title: "Code Generation", desc: "Lovable-style live preview", icon: Code2, status: "live" },
    { title: "REST API", desc: "External access with keys", icon: Globe, status: "live" },
    { title: "GitHub Integration", desc: "Deploy & edit repos", icon: GitBranch, status: "live" },
    { title: "Email System", desc: "SMTP notifications", icon: Mail, status: "live" },
  ];

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
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 h-7">
            <Zap className="w-3 h-3 text-primary" />
            J.A.R.V.I.S
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

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Ready to build something?</h3>
                <p className="text-xs text-muted-foreground">Ask JARVIS to generate websites, code, or analyze data</p>
              </div>
            </div>
            <Button className="gap-2 text-xs" size="sm" onClick={() => setLocation("/chat")} data-testid="button-cta-chat">
              Start Building
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
