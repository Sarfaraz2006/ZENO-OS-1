import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Zap, Shield, Cpu } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await login(password);
    if (!success) {
      setError("Invalid password. Access denied.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-primary/[0.02] rounded-full blur-[80px]" />
      </div>

      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Zap className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text" data-testid="text-app-title">
            J.A.R.V.I.S
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-widest uppercase">
            AI Assistant Platform
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Secure Access</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Master Password
              </label>
              <div className="relative">
                <Input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11 bg-background/50"
                  autoFocus
                />
                <button
                  type="button"
                  data-testid="button-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 flex items-center gap-2" data-testid="text-error">
                <Shield className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              data-testid="button-login"
              type="submit"
              className="w-full h-11 gap-2"
              disabled={loading || !password}
            >
              {loading ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Access System
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-border/30">
            <p className="text-center text-xs text-muted-foreground">
              Default: <code className="text-foreground/60 bg-muted px-1.5 py-0.5 rounded text-[11px]">admin</code>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground/50">
          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Multi-Model AI</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> OpenRouter</span>
        </div>
      </div>
    </div>
  );
}
