import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Key,
  Plus,
  Trash2,
  Copy,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Check,
  Globe,
  Cpu,
  Code,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/api-keys", { name: newKeyName });
      return res.json();
    },
    onSuccess: (data: { key: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setGeneratedKey(data.key);
      setNewKeyName("");
      toast({ title: "API key created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create key", description: error.message, variant: "destructive" });
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  const toggleKey = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/api-keys/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password changed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const maskKey = (key: string) => key.slice(0, 8) + "..." + key.slice(-4);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Security, API keys, and system configuration.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Master Password</h2>
              <p className="text-xs text-muted-foreground">Change your dashboard access password</p>
            </div>
          </div>
          <div className="grid gap-3 max-w-sm pl-10">
            <div className="relative">
              <Input
                data-testid="input-current-password"
                type={showCurrentPw ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="relative">
              <Input
                data-testid="input-new-password"
                type={showNewPw ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button
              data-testid="button-change-password"
              onClick={() => changePassword.mutate()}
              disabled={!currentPassword || !newPassword || changePassword.isPending}
              size="sm"
              className="w-fit gap-2"
            >
              {changePassword.isPending ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              {changePassword.isPending ? "Changing..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Key className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">API Keys</h2>
                <p className="text-xs text-muted-foreground">Access your agent from external apps</p>
              </div>
            </div>
            <Dialog open={keyDialogOpen} onOpenChange={(open) => { setKeyDialogOpen(open); if (!open) setGeneratedKey(""); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-api-key" size="sm" className="gap-2 text-xs">
                  <Plus className="w-3 h-3" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    {generatedKey ? "API Key Generated" : "Generate API Key"}
                  </DialogTitle>
                </DialogHeader>
                {generatedKey ? (
                  <div className="space-y-4 mt-2">
                    <div className="bg-background border border-border rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Your API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono break-all flex-1 bg-muted/50 p-2 rounded" data-testid="text-generated-key">
                          {generatedKey}
                        </code>
                        <Button size="icon" variant="ghost" data-testid="button-copy-key" onClick={() => copyToClipboard(generatedKey)} className="shrink-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-amber-500 text-xs bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                      <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Save this key securely. It won't be shown again in full.</p>
                    </div>
                    <Button onClick={() => { setKeyDialogOpen(false); setGeneratedKey(""); }} className="w-full gap-2">
                      <Check className="w-4 h-4" /> Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Name</label>
                      <Input
                        data-testid="input-api-key-name"
                        placeholder="e.g. Mobile App, n8n Integration"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <Button
                      data-testid="button-generate-key"
                      onClick={() => createKey.mutate()}
                      disabled={!newKeyName || createKey.isPending}
                      className="w-full gap-2"
                    >
                      {createKey.isPending ? <Cpu className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      {createKey.isPending ? "Generating..." : "Generate Key"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <Key className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Generate a key to access your agent externally</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  data-testid={`api-key-item-${apiKey.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/30 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{apiKey.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{maskKey(apiKey.key)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {apiKey.lastUsed && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline font-mono">
                        {new Date(apiKey.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 ${apiKey.isActive ? "text-emerald-500 border-emerald-500/30" : ""}`}
                    >
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      data-testid={`switch-api-key-${apiKey.id}`}
                      checked={apiKey.isActive}
                      onCheckedChange={(checked) => toggleKey.mutate({ id: apiKey.id, isActive: checked })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-delete-api-key-${apiKey.id}`}
                      onClick={() => deleteKey.mutate(apiKey.id)}
                      className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">API Usage</h2>
              <p className="text-xs text-muted-foreground">How to use your agent's API</p>
            </div>
          </div>
          <div className="bg-background border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example Request</span>
            </div>
            <pre className="text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto">
{`curl -X POST /api/conversations/1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello", "model": "meta-llama/llama-3.3-70b-instruct"}'`}
            </pre>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border/30">
              <p className="font-medium mb-1">Available Endpoints</p>
              <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                <p>GET /api/conversations</p>
                <p>POST /api/conversations</p>
                <p>POST /api/conversations/:id/messages</p>
                <p>GET /api/models</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border/30">
              <p className="font-medium mb-1">Authentication</p>
              <div className="space-y-1 text-muted-foreground text-[11px]">
                <p>Use Bearer token in Authorization header</p>
                <p>Generate keys above</p>
                <p>Keys can be enabled/disabled</p>
                <p>Last used time tracked</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
