import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  MessageSquare,
  Bot,
  Key,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  Cpu,
  Shield,
  Mic,
  Plug,
  Globe,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<{
    conversations: number;
    messages: number;
    models: number;
    apiKeys: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: logs } = useQuery<Array<{
    id: number;
    action: string;
    details: string | null;
    source: string | null;
    createdAt: string;
  }>>({
    queryKey: ["/api/logs"],
  });

  const statCards = [
    {
      label: "Conversations",
      value: stats?.conversations ?? 0,
      icon: MessageSquare,
      color: "text-sky-400 dark:text-sky-400",
      bg: "bg-sky-500/10 dark:bg-sky-500/10",
      border: "border-sky-500/20 dark:border-sky-500/20",
    },
    {
      label: "Messages",
      value: stats?.messages ?? 0,
      icon: TrendingUp,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
      border: "border-emerald-500/20 dark:border-emerald-500/20",
    },
    {
      label: "AI Models",
      value: stats?.models ?? 0,
      icon: Cpu,
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/10 dark:bg-violet-500/10",
      border: "border-violet-500/20 dark:border-violet-500/20",
    },
    {
      label: "API Keys",
      value: stats?.apiKeys ?? 0,
      icon: Key,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-500/10",
      border: "border-amber-500/20 dark:border-amber-500/20",
    },
  ];

  const capabilities = [
    {
      title: "AI Chat",
      description: "Multi-model conversations with OpenRouter",
      icon: MessageSquare,
      href: "/chat",
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      status: "Active",
    },
    {
      title: "Model Hub",
      description: "500+ models - add any by ID",
      icon: Bot,
      href: "/models",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      status: "Active",
    },
    {
      title: "Voice Agent",
      description: "Continuous voice conversation mode",
      icon: Mic,
      href: "/chat",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      status: "Active",
    },
    {
      title: "REST API",
      description: "External access with API keys",
      icon: Globe,
      href: "/settings",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      status: "Active",
    },
    {
      title: "Integrations",
      description: "n8n, email, WhatsApp ready",
      icon: Plug,
      href: "/settings",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      status: "Ready",
    },
    {
      title: "Business Intel",
      description: "Analytics and insights",
      icon: BarChart3,
      href: "/",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      status: "Ready",
    },
  ];

  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case "auth": return Shield;
      case "models": return Cpu;
      case "security": return Key;
      default: return Activity;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold" data-testid="text-dashboard-title">
                Command Center
              </h1>
              <p className="text-muted-foreground text-sm">
                All systems operational
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Cpu className="w-3 h-3" />
              {stats?.models ?? 0} Models
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Sparkles className="w-3 h-3" />
              OpenRouter
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover-elevate">
            <CardContent className="p-4 md:pt-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase()}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Platform Capabilities
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capabilities.map((cap) => (
              <Link key={cap.title} href={cap.href}>
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${cap.bg} flex items-center justify-center shrink-0`}>
                        <cap.icon className={`w-4 h-4 ${cap.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-sm" data-testid={`text-cap-${cap.title.toLowerCase().replace(/\s/g, "-")}`}>
                            {cap.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                              cap.status === "Active"
                                ? "text-emerald-500 border-emerald-500/30"
                                : "text-amber-500 border-amber-500/30"
                            }`}
                          >
                            {cap.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {cap.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Link href="/chat">
            <Button className="w-full gap-2 h-11 mt-2" data-testid="button-start-chat">
              <MessageSquare className="w-4 h-4" />
              Start New Conversation
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-4 md:pt-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Activity
                </h3>
                {logs && logs.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">{logs.length} events</Badge>
                )}
              </div>
              {!logs || logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Start using the platform to see logs here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.slice(0, 10).map((log) => {
                    const Icon = getSourceIcon(log.source);
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0"
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.action}</p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-1 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
