import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GitBranch,
  ExternalLink,
  Loader2,
  FolderGit2,
  Plus,
  Globe,
  Lock,
  Rocket,
  User,
  CheckCircle2,
  Search,
  Code2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
  language: string | null;
  has_pages: boolean;
}

interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
  url: string;
}

export default function GitHubPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [deployRepo, setDeployRepo] = useState<GitHubRepo | null>(null);
  const [deployHtml, setDeployHtml] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
  });

  const { data: repos = [], isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: !!user,
  });

  const createRepo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/github/repos", {
        name: newRepoName,
        description: newRepoDesc,
        isPrivate: newRepoPrivate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      setCreateDialogOpen(false);
      setNewRepoName("");
      setNewRepoDesc("");
      toast({ title: "Repository created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create repo", description: error.message, variant: "destructive" });
    },
  });

  const deployToPages = useMutation({
    mutationFn: async () => {
      if (!deployRepo || !user) throw new Error("No repo selected");
      const res = await apiRequest("POST", "/api/github/deploy", {
        owner: user.login,
        repo: deployRepo.name,
        htmlContent: deployHtml,
        commitMessage: "Deploy via ZENO OS",
      });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      setDeployDialogOpen(false);
      setDeployHtml("");
      setDeployRepo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      toast({
        title: "Deployed to GitHub Pages!",
        description: `Live at: ${data.url}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Deployment failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const langColor = (lang: string | null) => {
    const colors: Record<string, string> = {
      JavaScript: "bg-yellow-400", TypeScript: "bg-blue-500", Python: "bg-green-500",
      HTML: "bg-orange-500", CSS: "bg-purple-500", Java: "bg-red-500",
      Go: "bg-cyan-500", Rust: "bg-amber-700", Ruby: "bg-red-600",
    };
    return colors[lang || ""] || "bg-gray-400";
  };

  if (userLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center">
          <FolderGit2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">GitHub Not Connected</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          GitHub integration needs to be reconnected. Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-github-title">
            <GitBranch className="w-5 h-5 text-primary" />
            GitHub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage repositories and deploy to GitHub Pages.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-repo" size="sm" className="gap-2 text-xs">
              <Plus className="w-3 h-3" />
              New Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-primary" />
                Create Repository
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                <Input
                  data-testid="input-new-repo-name"
                  placeholder="my-website"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                <Input
                  data-testid="input-new-repo-desc"
                  placeholder="A cool website built with ZENO OS"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {newRepoPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <span className="text-sm">{newRepoPrivate ? "Private" : "Public"}</span>
                </div>
                <Switch
                  data-testid="switch-repo-private"
                  checked={newRepoPrivate}
                  onCheckedChange={setNewRepoPrivate}
                />
              </div>
              <Button
                data-testid="button-submit-create-repo"
                onClick={() => createRepo.mutate()}
                disabled={!newRepoName || createRepo.isPending}
                className="w-full gap-2"
              >
                {createRepo.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Create Repository</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <img
            src={user.avatar}
            alt={user.login}
            className="w-12 h-12 rounded-full border-2 border-border"
            data-testid="img-github-avatar"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" data-testid="text-github-name">{user.name || user.login}</h3>
              <Badge variant="outline" className="text-[10px] gap-1 h-5 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </Badge>
            </div>
            <a href={user.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary font-mono">
              @{user.login}
            </a>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold" data-testid="text-repo-count">{repos.length}</p>
            <p className="text-[10px] text-muted-foreground">Repositories</p>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search-repos"
          placeholder="Search repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {reposLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderGit2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No matching repositories" : "No repositories yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRepos.map((repo) => (
            <Card key={repo.id} className="hover-elevate" data-testid={`card-repo-${repo.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                      <Code2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{repo.name}</h3>
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          {repo.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                        {repo.has_pages && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1 text-emerald-500 border-emerald-500/30">
                            <Rocket className="w-2.5 h-2.5" />
                            Pages
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${langColor(repo.language)}`} />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {repo.default_branch}
                        </span>
                        <span className="font-mono">
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        setDeployRepo(repo);
                        setDeployDialogOpen(true);
                      }}
                      data-testid={`button-deploy-${repo.id}`}
                    >
                      <Rocket className="w-3 h-3" />
                      Deploy
                    </Button>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-open-repo-${repo.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    {repo.has_pages && (
                      <a href={`https://${user.login}.github.io/${repo.name}/`} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-pages-${repo.id}`}>
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              Deploy to GitHub Pages
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted/30 border border-border/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Deploying to:</p>
              <p className="text-sm font-semibold font-mono">{deployRepo?.full_name}</p>
              {deployRepo && user && (
                <p className="text-[11px] text-emerald-500 mt-1">
                  Will be live at: https://{user.login}.github.io/{deployRepo.name}/
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                HTML Content
              </label>
              <p className="text-[11px] text-muted-foreground">
                Paste the HTML code from chat, or copy from the preview panel.
              </p>
              <textarea
                data-testid="textarea-deploy-html"
                value={deployHtml}
                onChange={(e) => setDeployHtml(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="<!DOCTYPE html>..."
              />
            </div>
            <Button
              data-testid="button-submit-deploy"
              onClick={() => deployToPages.mutate()}
              disabled={!deployHtml.trim() || deployToPages.isPending}
              className="w-full gap-2"
            >
              {deployToPages.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Deploy to GitHub Pages</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
