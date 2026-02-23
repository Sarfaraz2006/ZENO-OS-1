import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, useTheme, type ThemeAccent } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, Palette } from "lucide-react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ChatPage from "@/pages/chat";
import ModelsPage from "@/pages/models";
import SettingsPage from "@/pages/settings";
import TerminalPage from "@/pages/terminal";
import GitHubPage from "@/pages/github";
import CodeEditorPage from "@/pages/code-editor";
import BusinessPage from "@/pages/business";

const ACCENT_OPTIONS: { value: ThemeAccent; label: string; color: string }[] = [
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { value: "violet", label: "Violet", color: "bg-violet-500" },
  { value: "rose", label: "Rose", color: "bg-rose-500" },
  { value: "amber", label: "Amber", color: "bg-amber-500" },
  { value: "cyan", label: "Cyan", color: "bg-cyan-500" },
];

function ThemeControls() {
  const { theme, toggleTheme, accent, setAccent } = useTheme();
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" data-testid="button-accent-picker">
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-3" align="end">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Accent Color</p>
          <div className="grid grid-cols-3 gap-2">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAccent(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${accent === opt.value ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                data-testid={`button-accent-${opt.value}`}
              >
                <div className={`w-5 h-5 rounded-full ${opt.color}`} />
                <span className="text-[10px]">{opt.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        size="icon"
        variant="ghost"
        onClick={toggleTheme}
        data-testid="button-theme-toggle"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/models" component={ModelsPage} />
      <Route path="/terminal" component={TerminalPage} />
      <Route path="/github" component={GitHubPage} />
      <Route path="/editor" component={CodeEditorPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-3 h-12 shrink-0 border-b border-border/30 bg-background/80 backdrop-blur-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeControls />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
