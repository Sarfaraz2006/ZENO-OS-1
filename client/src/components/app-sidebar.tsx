import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Settings,
  Zap,
  LogOut,
  Shield,
  Terminal,
  GitBranch,
  Code2,
  BarChart3,
  Briefcase,
  Plus,
  ChevronDown,
  Building2,
  Store,
  Home,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Workspace {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Models", url: "/models", icon: Bot },
  { title: "Terminal", url: "/terminal", icon: Terminal },
  { title: "GitHub", url: "/github", icon: GitBranch },
  { title: "Editor", url: "/editor", icon: Code2 },
  { title: "Business", url: "/business", icon: BarChart3 },
];

const systemNav = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const WORKSPACE_ICONS: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  building: Building2,
  store: Store,
  home: Home,
};

const WORKSPACE_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
};

export function useActiveWorkspace() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(() => {
    const saved = localStorage.getItem("activeWorkspaceId");
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("activeWorkspaceId", String(activeWorkspaceId));
    }
  }, [activeWorkspaceId]);

  return { activeWorkspaceId, setActiveWorkspaceId };
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsType, setNewWsType] = useState("general");
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const createWorkspace = useMutation({
    mutationFn: async () => {
      const iconMap: Record<string, string> = {
        agency: "building",
        ecommerce: "store",
        realestate: "home",
        general: "briefcase",
      };
      const res = await apiRequest("POST", "/api/workspaces", {
        name: newWsName,
        type: newWsType,
        icon: iconMap[newWsType] || "briefcase",
        color: "blue",
      });
      return res.json();
    },
    onSuccess: (data: Workspace) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setActiveWorkspaceId(data.id);
      setCreateWsOpen(false);
      setNewWsName("");
      setNewWsType("general");
    },
  });

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const WsIcon = activeWs?.icon ? WORKSPACE_ICONS[activeWs.icon] || Briefcase : Briefcase;

  const handleNavClick = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => handleNavClick("/")}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center relative">
            <Zap className="w-5 h-5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight" data-testid="text-sidebar-title">
              ZENO OS
            </h2>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Business AI
            </p>
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-left"
            data-testid="button-workspace-switcher"
          >
            <div className={`w-6 h-6 rounded-md ${WORKSPACE_COLORS[activeWs?.color || "blue"]} flex items-center justify-center`}>
              <WsIcon className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{activeWs?.name || "Select Workspace"}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{activeWs?.type || "general"}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${wsDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {wsDropdownOpen && (
            <div className="mt-1 border border-border/40 rounded-lg bg-popover shadow-lg overflow-hidden">
              {workspaces.map((ws) => {
                const Icon = ws.icon ? WORKSPACE_ICONS[ws.icon] || Briefcase : Briefcase;
                return (
                  <button
                    key={ws.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setWsDropdownOpen(false);
                    }}
                    data-testid={`workspace-item-${ws.id}`}
                  >
                    <div className={`w-5 h-5 rounded ${WORKSPACE_COLORS[ws.color || "blue"]} flex items-center justify-center`}>
                      <Icon className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-xs flex-1 truncate">{ws.name}</span>
                    {ws.id === activeWorkspaceId && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
              <Separator />
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left text-primary"
                onClick={() => {
                  setWsDropdownOpen(false);
                  setCreateWsOpen(true);
                }}
                data-testid="button-create-workspace"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">New Workspace</span>
              </button>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    data-active={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    onClick={() => handleNavClick(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    data-active={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    onClick={() => handleNavClick(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Badge variant="outline" className="text-[10px] gap-1 w-full justify-center">
            <Shield className="w-3 h-3" />
            Secure Session
          </Badge>
        </div>
        <Separator />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground text-xs"
          onClick={() => { logout(); if (isMobile) setOpenMobile(false); }}
          data-testid="button-logout"
          size="sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </Button>
      </SidebarFooter>

      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-primary" />
              New Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              data-testid="input-workspace-name"
              placeholder="Workspace name..."
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              className="h-9 text-sm"
            />
            <Select value={newWsType} onValueChange={setNewWsType}>
              <SelectTrigger className="h-9 text-xs" data-testid="select-workspace-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Business</SelectItem>
                <SelectItem value="agency">Digital Agency</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="realestate">Real Estate</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full gap-2 text-xs"
              disabled={!newWsName.trim() || createWorkspace.isPending}
              onClick={() => createWorkspace.mutate()}
              data-testid="button-submit-workspace"
            >
              <Plus className="w-3 h-3" />
              Create Workspace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
