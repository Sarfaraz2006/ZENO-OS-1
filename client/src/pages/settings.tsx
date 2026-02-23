import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
      await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password changed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const maskKey = (key: string) => {
    return key.slice(0, 8) + "..." + key.slice(-4);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage security, API keys, and system configuration.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Password</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Change your master dashboard password.
          </p>
          <div className="grid gap-3 max-w-sm">
            <div className="relative">
              <Input
                data-testid="input-current-password"
                type={showCurrentPw ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                data-testid="input-new-password"
                type={showNewPw ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              data-testid="button-change-password"
              onClick={() => changePassword.mutate()}
              disabled={!currentPassword || !newPassword || changePassword.isPending}
              className="w-fit"
            >
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">API Keys</h2>
            </div>
            <Dialog open={keyDialogOpen} onOpenChange={(open) => {
              setKeyDialogOpen(open);
              if (!open) setGeneratedKey("");
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-api-key" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate API Key</DialogTitle>
                </DialogHeader>
                {generatedKey ? (
                  <div className="space-y-4 mt-2">
                    <div className="bg-card border border-border rounded-md p-4">
                      <p className="text-sm text-muted-foreground mb-2">Your new API key:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono break-all flex-1" data-testid="text-generated-key">
                          {generatedKey}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid="button-copy-key"
                          onClick={() => copyToClipboard(generatedKey)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-500 text-sm">
                      <Shield className="w-4 h-4 shrink-0" />
                      Save this key now. It won't be shown again in full.
                    </div>
                    <Button
                      onClick={() => { setKeyDialogOpen(false); setGeneratedKey(""); }}
                      className="w-full"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Key Name</label>
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
                      className="w-full"
                    >
                      {createKey.isPending ? "Generating..." : "Generate Key"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-sm text-muted-foreground">
            Use API keys to access your agent from external applications.
          </p>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No API keys yet. Generate one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  data-testid={`api-key-item-${apiKey.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{apiKey.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{maskKey(apiKey.key)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {apiKey.lastUsed && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={apiKey.isActive ? "default" : "outline"} className="text-xs">
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      data-testid={`switch-api-key-${apiKey.id}`}
                      checked={apiKey.isActive}
                      onCheckedChange={(checked) =>
                        toggleKey.mutate({ id: apiKey.id, isActive: checked })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-delete-api-key-${apiKey.id}`}
                      onClick={() => deleteKey.mutate(apiKey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
