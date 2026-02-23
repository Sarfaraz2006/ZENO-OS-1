import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bot, Key, Activity, Zap, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Messages",
      value: stats?.messages ?? 0,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "AI Models",
      value: stats?.models ?? 0,
      icon: Bot,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "API Keys",
      value: stats?.apiKeys ?? 0,
      icon: Key,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
            <Zap className="w-6 h-6 text-primary" />
            Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back. All systems operational.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="w-3 h-3 text-emerald-400" />
          System Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover-elevate">
            <CardContent className="pt-5">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" data-testid={`text-stat-${stat.label.toLowerCase()}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </h3>
            {!logs || logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity yet. Start a conversation to see logs here.
              </p>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-sm"
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.action}</p>
                      {log.details && (
                        <p className="text-muted-foreground text-xs truncate">{log.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Chat", href: "/chat", icon: MessageSquare, color: "text-blue-400" },
                { label: "Models", href: "/models", icon: Bot, color: "text-violet-400" },
                { label: "API Keys", href: "/settings", icon: Key, color: "text-amber-400" },
                { label: "Activity", href: "/", icon: Activity, color: "text-emerald-400" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  data-testid={`link-quick-${action.label.toLowerCase().replace(" ", "-")}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover-elevate transition-colors"
                >
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
