import { useState, useEffect, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Mail,
  Send,
  Save,
  Loader2,
  Bell,
  MessageCircle,
  DollarSign,
  Workflow,
  ExternalLink,
  Brain,
  Zap,
  Star,
  TestTube,
  Server,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey, AiProvider } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);
  const [notifyOnLogin, setNotifyOnLogin] = useState(false);
  const [notifyOnApiUse, setNotifyOnApiUse] = useState(false);

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

  const { data: smtpSettings } = useQuery<{ host: string; port: string; user: string; pass: string; from: string; notifyLogin: boolean; notifyApi: boolean }>({
    queryKey: ["/api/settings/smtp"],
  });

  useEffect(() => {
    if (smtpSettings) {
      setSmtpHost(smtpSettings.host || "");
      setSmtpPort(smtpSettings.port || "587");
      setSmtpUser(smtpSettings.user || "");
      setSmtpPass(smtpSettings.pass || "");
      setSmtpFrom(smtpSettings.from || "");
      setNotifyOnLogin(smtpSettings.notifyLogin || false);
      setNotifyOnApiUse(smtpSettings.notifyApi || false);
      if (smtpSettings.host) setShowSmtpSetup(true);
    }
  }, [smtpSettings]);

  const saveSmtp = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/settings/smtp", {
        host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from: smtpFrom,
        notifyLogin: notifyOnLogin, notifyApi: notifyOnApiUse,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/smtp"] });
      toast({ title: "SMTP settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save SMTP", description: error.message, variant: "destructive" });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email/send", {
        to: emailTo, subject: emailSubject, body: emailBody,
      });
      return res.json();
    },
    onSuccess: () => {
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
      toast({ title: "Email sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send email", description: error.message, variant: "destructive" });
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

      <AiProvidersSection />

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Email & Notifications</h2>
                <p className="text-xs text-muted-foreground">Send emails and configure SMTP</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              onClick={() => setShowSmtpSetup(!showSmtpSetup)}
              data-testid="button-toggle-smtp"
            >
              <Settings className="w-3 h-3" />
              {showSmtpSetup ? "Hide SMTP" : "SMTP Setup"}
            </Button>
          </div>

          {showSmtpSetup && (
            <div className="space-y-3 bg-muted/20 border border-border/30 rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SMTP Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">SMTP Host</label>
                  <Input
                    data-testid="input-smtp-host"
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Port</label>
                  <Input
                    data-testid="input-smtp-port"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Username / Email</label>
                  <Input
                    data-testid="input-smtp-user"
                    placeholder="your@gmail.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Password / App Password</label>
                  <Input
                    data-testid="input-smtp-pass"
                    type="password"
                    placeholder="••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">From Email</label>
                <Input
                  data-testid="input-smtp-from"
                  placeholder="zeno@yourdomain.com"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3 h-3" />
                  Auto Notifications
                </p>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Notify on login</span>
                  <Switch
                    data-testid="switch-notify-login"
                    checked={notifyOnLogin}
                    onCheckedChange={setNotifyOnLogin}
                  />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Notify on API key usage</span>
                  <Switch
                    data-testid="switch-notify-api"
                    checked={notifyOnApiUse}
                    onCheckedChange={setNotifyOnApiUse}
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2 text-xs w-full"
                onClick={() => saveSmtp.mutate()}
                disabled={!smtpHost || !smtpUser || !smtpPass || saveSmtp.isPending}
                data-testid="button-save-smtp"
              >
                {saveSmtp.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save SMTP Settings
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send Email</p>
            <Input
              data-testid="input-email-to"
              placeholder="recipient@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              data-testid="input-email-subject"
              placeholder="Subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="h-9 text-sm"
            />
            <textarea
              data-testid="textarea-email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Write your email message..."
            />
            <Button
              data-testid="button-send-email"
              onClick={() => sendEmail.mutate()}
              disabled={!emailTo || !emailSubject || !emailBody || sendEmail.isPending}
              className="gap-2 text-xs"
              size="sm"
            >
              {sendEmail.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {sendEmail.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
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

      <IntegrationsSection />
    </div>
  );
}

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", placeholder: "sk-...", description: "GPT-4o, GPT-4 Turbo, o1" },
  { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", description: "Claude Sonnet, Opus, Haiku" },
  { value: "gemini", label: "Google Gemini", placeholder: "AIza...", description: "Gemini 2.0 Flash, Pro" },
  { value: "openrouter", label: "OpenRouter", placeholder: "sk-or-...", description: "100+ models via OpenRouter" },
  { value: "custom", label: "Custom Endpoint", placeholder: "API key or 'none'", description: "Ollama, LocalAI, vLLM, etc." },
];

function AiProvidersSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerType, setProviderType] = useState("");
  const [providerKey, setProviderKey] = useState("");
  const [providerUrl, setProviderUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const { data: providers = [] } = useQuery<AiProvider[]>({
    queryKey: ["/api/ai-providers"],
  });

  const createProvider = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-providers", {
        name: providerName,
        provider: providerType,
        apiKey: providerKey,
        baseUrl: providerType === "custom" ? providerUrl : undefined,
        isActive: true,
        isDefault: providers.length === 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      setDialogOpen(false);
      setProviderName("");
      setProviderType("");
      setProviderKey("");
      setProviderUrl("");
      toast({ title: "AI Provider added" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ai-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      toast({ title: "Provider removed" });
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/ai-providers/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      toast({ title: "Default provider updated" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/ai-providers/${id}`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] }),
  });

  const testConnection = async () => {
    if (!providerType || !providerKey) return;
    setTesting(true);
    try {
      const res = await apiRequest("POST", "/api/ai-providers/test", {
        provider: providerType,
        apiKey: providerKey,
        baseUrl: providerType === "custom" ? providerUrl : undefined,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Connection successful!", description: `Model: ${data.model} replied: "${data.reply}"` });
      } else {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const selectedOption = PROVIDER_OPTIONS.find(p => p.value === providerType);

  const providerIcon = (type: string) => {
    switch (type) {
      case "openai": return <Zap className="w-3.5 h-3.5 text-emerald-500" />;
      case "anthropic": return <Brain className="w-3.5 h-3.5 text-orange-500" />;
      case "gemini": return <Star className="w-3.5 h-3.5 text-blue-500" />;
      case "openrouter": return <Globe className="w-3.5 h-3.5 text-violet-500" />;
      case "custom": return <Server className="w-3.5 h-3.5 text-cyan-500" />;
      default: return <Cpu className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Providers</h2>
              <p className="text-xs text-muted-foreground">Connect OpenAI, Anthropic, Gemini, or custom models</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-ai-provider" size="sm" className="gap-2 text-xs">
                <Plus className="w-3 h-3" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Add AI Provider
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
                  <Select value={providerType} onValueChange={(v) => {
                    setProviderType(v);
                    const opt = PROVIDER_OPTIONS.find(p => p.value === v);
                    if (opt && !providerName) setProviderName(opt.label);
                  }}>
                    <SelectTrigger data-testid="select-provider-type" className="h-9 text-sm">
                      <SelectValue placeholder="Select provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            {providerIcon(opt.value)}
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground text-[10px] ml-1">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <Input
                    data-testid="input-provider-name"
                    placeholder="e.g. My OpenAI, Local Ollama"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
                  <div className="relative">
                    <Input
                      data-testid="input-provider-key"
                      type={showKey ? "text" : "password"}
                      placeholder={selectedOption?.placeholder || "Enter API key..."}
                      value={providerKey}
                      onChange={(e) => setProviderKey(e.target.value)}
                      className="h-9 text-sm pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {providerType === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base URL</label>
                    <Input
                      data-testid="input-provider-url"
                      placeholder="http://localhost:11434/v1"
                      value={providerUrl}
                      onChange={(e) => setProviderUrl(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">OpenAI-compatible endpoint URL (Ollama, LocalAI, vLLM, LM Studio)</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    data-testid="button-test-provider"
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs flex-1"
                    onClick={testConnection}
                    disabled={!providerType || !providerKey || testing}
                  >
                    {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                    {testing ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button
                    data-testid="button-save-provider"
                    size="sm"
                    className="gap-2 text-xs flex-1"
                    onClick={() => createProvider.mutate()}
                    disabled={!providerName || !providerType || !providerKey || createProvider.isPending}
                  >
                    {createProvider.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {createProvider.isPending ? "Saving..." : "Save Provider"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">OpenRouter (Built-in)</span>
            {providers.length === 0 && (
              <Badge variant="outline" className="text-[10px] h-5 text-emerald-500 border-emerald-500/30">
                <Check className="w-2.5 h-2.5 mr-0.5" /> Active
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground ml-5.5">
            Free via Replit AI Integrations. Used when no personal provider is set as default.
          </p>
        </div>

        {providers.length > 0 && (
          <div className="space-y-2">
            {providers.map((p) => (
              <div
                key={p.id}
                data-testid={`ai-provider-item-${p.id}`}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border group ${p.isDefault ? "border-primary/30 bg-primary/5" : "border-border/30"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                    {providerIcon(p.provider)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.name}</p>
                      {p.isDefault && (
                        <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{p.apiKey}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!p.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] px-2"
                      onClick={() => setDefault.mutate(p.id)}
                      data-testid={`button-set-default-${p.id}`}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Switch
                    data-testid={`switch-provider-${p.id}`}
                    checked={p.isActive}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: p.id, isActive: checked })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-provider-${p.id}`}
                    onClick={() => deleteProvider.mutate(p.id)}
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {providers.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-2">
            Add your own API keys to use OpenAI, Anthropic, Gemini, or local models. The built-in OpenRouter is used by default.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface IntegrationStatus {
  email: { connected: boolean; label: string };
  whatsapp: { connected: boolean; label: string };
  stripe: { connected: boolean; label: string };
  n8n: { connected: boolean; webhookUrl: string; label: string };
}

function IntegrationsSection() {
  const { toast } = useToast();
  const [n8nCopied, setN8nCopied] = useState(false);
  const [n8nExpanded, setN8nExpanded] = useState(false);

  const { data: status } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const copyWebhook = useCallback(() => {
    if (status?.n8n.webhookUrl) {
      navigator.clipboard.writeText(status.n8n.webhookUrl);
      setN8nCopied(true);
      toast({ title: "Webhook URL copied!" });
      setTimeout(() => setN8nCopied(false), 2000);
    }
  }, [status, toast]);

  const statusBadge = (connected: boolean, label: string) => (
    <Badge variant="outline" className={`text-[10px] h-5 ${connected ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground border-border/50"}`}>
      {connected && <Check className="w-2.5 h-2.5 mr-0.5" />}
      {label}
    </Badge>
  );

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Integrations</h2>
            <p className="text-xs text-muted-foreground">Connect external services to ZENO OS</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded-lg border border-border/30" data-testid="integration-email">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email (SMTP/IMAP)</p>
                  <p className="text-[11px] text-muted-foreground">Send & receive emails</p>
                </div>
              </div>
              {statusBadge(status?.email.connected ?? false, status?.email.label ?? "Not Configured")}
            </div>
            {!status?.email.connected && (
              <p className="text-[11px] text-muted-foreground mt-2 ml-11">Configure SMTP settings above to enable email integration.</p>
            )}
          </div>

          <WhatsAppIntegration connected={status?.whatsapp.connected ?? false} label={status?.whatsapp.label ?? "Not Connected"} statusBadge={statusBadge} />

          <StripeIntegration connected={status?.stripe.connected ?? false} label={status?.stripe.label ?? "Not Connected"} statusBadge={statusBadge} />

          <div className="p-3 rounded-lg border border-border/30" data-testid="integration-n8n">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Workflow className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">n8n Automation</p>
                  <p className="text-[11px] text-muted-foreground">Webhook endpoint for automation workflows</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setN8nExpanded(!n8nExpanded)} data-testid="button-n8n-details">
                  {n8nExpanded ? "Hide" : "Setup"}
                </Button>
                {statusBadge(status?.n8n.connected ?? false, status?.n8n.label ?? "Not Tested")}
              </div>
            </div>
            {n8nExpanded && (
              <div className="mt-3 ml-11 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Webhook URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono bg-muted/50 px-3 py-2 rounded-md break-all" data-testid="text-n8n-webhook-url">
                      {status?.n8n.webhookUrl || "/api/business/webhook/n8n"}
                    </code>
                    <Button size="icon" variant="outline" className="w-8 h-8 shrink-0" onClick={copyWebhook} data-testid="button-copy-n8n-webhook">
                      {n8nCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">How to use</p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground">1. In n8n, add an HTTP Request node</p>
                    <p className="text-[11px] text-muted-foreground">2. Set method to <code className="bg-muted px-1 rounded">POST</code></p>
                    <p className="text-[11px] text-muted-foreground">3. Paste the webhook URL above</p>
                    <p className="text-[11px] text-muted-foreground">4. Send JSON body: <code className="bg-muted px-1 rounded">{`{"event": "your_event", "data": {...}}`}</code></p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Test Webhook</p>
                  <pre className="text-[10px] font-mono bg-background border border-border/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
{`curl -X POST ${status?.n8n.webhookUrl || "/api/business/webhook/n8n"} \\
  -H "Content-Type: application/json" \\
  -d '{"event": "test", "data": {"msg": "hello"}}'`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsAppIntegration({ connected, label, statusBadge }: { connected: boolean; label: string; statusBadge: (c: boolean, l: string) => JSX.Element }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [sid, setSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const saveTwilio = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/integrations/connect", {
        service: "twilio", credentials: { sid, authToken, phoneNumber },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      setExpanded(false);
      toast({ title: "Twilio credentials saved!" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-3 rounded-lg border border-border/30" data-testid="integration-whatsapp">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium">WhatsApp Business</p>
            <p className="text-[11px] text-muted-foreground">Send & receive via Twilio API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!connected && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setExpanded(!expanded)} data-testid="button-setup-twilio">
              {expanded ? "Hide" : "Setup"}
            </Button>
          )}
          {statusBadge(connected, label)}
        </div>
      </div>
      {expanded && !connected && (
        <div className="mt-3 ml-11 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Enter your Twilio credentials. Get them from{" "}
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.twilio.com</a>
          </p>
          <div className="grid gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Account SID</label>
              <Input data-testid="input-twilio-sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={sid} onChange={(e) => setSid(e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Auth Token</label>
              <Input data-testid="input-twilio-token" type="password" placeholder="••••••••••••••••" value={authToken} onChange={(e) => setAuthToken(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">WhatsApp Phone Number</label>
              <Input data-testid="input-twilio-phone" placeholder="+1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Button size="sm" className="gap-2 text-xs w-full" disabled={!sid || !authToken || !phoneNumber || saveTwilio.isPending} onClick={() => saveTwilio.mutate()} data-testid="button-save-twilio">
            {saveTwilio.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Twilio Credentials
          </Button>
        </div>
      )}
    </div>
  );
}

function StripeIntegration({ connected, label, statusBadge }: { connected: boolean; label: string; statusBadge: (c: boolean, l: string) => JSX.Element }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const saveStripe = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/integrations/connect", {
        service: "stripe", credentials: { secretKey, webhookSecret },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      setExpanded(false);
      toast({ title: "Stripe credentials saved!" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-3 rounded-lg border border-border/30" data-testid="integration-stripe">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Stripe Payments</p>
            <p className="text-[11px] text-muted-foreground">Track invoices & payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!connected && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setExpanded(!expanded)} data-testid="button-setup-stripe">
              {expanded ? "Hide" : "Setup"}
            </Button>
          )}
          {statusBadge(connected, label)}
        </div>
      </div>
      {expanded && !connected && (
        <div className="mt-3 ml-11 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Enter your Stripe API keys. Get them from{" "}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary underline">dashboard.stripe.com</a>
          </p>
          <div className="grid gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Secret Key</label>
              <Input data-testid="input-stripe-key" type="password" placeholder="sk_live_xxxxx or sk_test_xxxxx" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Webhook Secret (optional)</label>
              <Input data-testid="input-stripe-webhook" type="password" placeholder="whsec_xxxxx" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <Button size="sm" className="gap-2 text-xs w-full" disabled={!secretKey || saveStripe.isPending} onClick={() => saveStripe.mutate()} data-testid="button-save-stripe">
            {saveStripe.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Stripe Credentials
          </Button>
        </div>
      )}
    </div>
  );
}
