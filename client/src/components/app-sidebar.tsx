import { useLocation, useRoute } from "wouter";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Models", url: "/models", icon: Bot },
  { title: "Terminal", url: "/terminal", icon: Terminal },
  { title: "GitHub", url: "/github", icon: GitBranch },
  { title: "Editor", url: "/editor", icon: Code2 },
];

const systemNav = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

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
              J.A.R.V.I.S
            </h2>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              AI Platform
            </p>
          </div>
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
    </Sidebar>
  );
}
