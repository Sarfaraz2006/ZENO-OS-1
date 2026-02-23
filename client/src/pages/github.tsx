import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GitBranch,
  GitCommit,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  Loader2,
  FolderGit2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GitHubRepo {
  id: number;
  name: string;
  repoUrl: string;
  branch: string;
  lastSync: string | null;
  status: string;
  createdAt: string;
}

export default function GitHubPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [repoName, setRepoName] = useState("");

  const { data: repos = [], isLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
  });

  const connectRepo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/github/repos", {
        name: repoName,
        repoUrl,
        branch,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      setDialogOpen(false);
      setRepoUrl("");
      setBranch("main");
      setRepoName("");
      toast({ title: "Repository connected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to connect", description: error.message, variant: "destructive" });
    },
  });

  const disconnectRepo = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/github/repos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      toast({ title: "Repository disconnected" });
    },
  });

  const syncRepo = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/github/repos/${id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      toast({ title: "Sync initiated" });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-emerald-500 border-emerald-500/30";
      case "syncing": return "text-sky-500 border-sky-500/30";
      case "error": return "text-red-500 border-red-500/30";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return CheckCircle2;
      case "syncing": return Loader2;
      case "error": return AlertCircle;
      default: return GitBranch;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-github-title">
            <GitBranch className="w-5 h-5 text-primary" />
            GitHub Integration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect repositories for version control and code management.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-connect-repo" size="sm" className="gap-2 text-xs">
              <Plus className="w-3 h-3" />
              Connect Repo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-primary" />
                Connect Repository
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository Name</label>
                <Input
                  data-testid="input-repo-name"
                  placeholder="e.g. my-project"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GitHub URL</label>
                <Input
                  data-testid="input-repo-url"
                  placeholder="https://github.com/user/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</label>
                <Input
                  data-testid="input-repo-branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
              <Button
                data-testid="button-save-repo"
                onClick={() => connectRepo.mutate()}
                disabled={!repoName || !repoUrl || connectRepo.isPending}
                className="w-full gap-2"
              >
                {connectRepo.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <><LinkIcon className="w-4 h-4" /> Connect Repository</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-5 w-32 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : repos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <FolderGit2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No repositories connected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Connect a GitHub repository to manage your code, track changes, and enable version control for your projects.
            </p>
            <Button
              className="mt-4 gap-2"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              data-testid="button-connect-first-repo"
            >
              <LinkIcon className="w-4 h-4" />
              Connect Your First Repository
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => {
            const StatusIcon = getStatusIcon(repo.status);
            return (
              <Card key={repo.id} className="hover-elevate" data-testid={`card-repo-${repo.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <FolderGit2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{repo.name}</h3>
                          <Badge variant="outline" className={`text-[10px] h-5 ${getStatusColor(repo.status)}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${repo.status === "syncing" ? "animate-spin" : ""}`} />
                            {repo.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{repo.repoUrl}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {repo.branch}
                          </span>
                          {repo.lastSync && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(repo.lastSync).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={repo.repoUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-open-repo-${repo.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => syncRepo.mutate(repo.id)}
                        disabled={syncRepo.isPending}
                        data-testid={`button-sync-repo-${repo.id}`}
                      >
                        <GitCommit className="w-3 h-3 mr-1" />
                        Sync
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => disconnectRepo.mutate(repo.id)}
                        data-testid={`button-disconnect-repo-${repo.id}`}
                      >
                        <Unlink className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium text-foreground">1. Connect</p>
              <p>Add your GitHub repository URL and branch to track.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">2. Manage</p>
              <p>View status, sync changes, and manage branches.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">3. Integrate</p>
              <p>Use with AI to analyze code, review PRs, and automate tasks.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
