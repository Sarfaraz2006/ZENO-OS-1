import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GitBranch,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Save,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Trash2,
  Plus,
  FilePlus,
  X,
  Search,
  Code2,
  FolderGit2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
}

interface FileData {
  name: string;
  path: string;
  content: string;
  sha: string;
  size: number;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
}

interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
  url: string;
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  sha: string;
  modified: boolean;
}

const FILE_ICONS: Record<string, string> = {
  js: "text-yellow-400",
  jsx: "text-yellow-400",
  ts: "text-blue-500",
  tsx: "text-blue-500",
  html: "text-orange-500",
  css: "text-purple-500",
  json: "text-green-500",
  md: "text-gray-400",
  py: "text-green-400",
  go: "text-cyan-500",
  rs: "text-amber-700",
  rb: "text-red-500",
  java: "text-red-600",
  yml: "text-pink-400",
  yaml: "text-pink-400",
  svg: "text-orange-400",
  png: "text-green-300",
  jpg: "text-green-300",
  gif: "text-green-300",
};

function getFileColor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || "text-muted-foreground";
}

function getLanguage(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const langs: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", css: "css", json: "json", md: "markdown", py: "python",
    go: "go", rs: "rust", rb: "ruby", java: "java", yml: "yaml", yaml: "yaml",
    sh: "bash", sql: "sql", xml: "xml",
  };
  return langs[ext] || "text";
}

export default function CodeEditorPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([""]));
  const [dirContents, setDirContents] = useState<Record<string, TreeItem[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileDir, setNewFileDir] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<OpenFile | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const { data: user } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
  });

  const { data: repos = [], isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: !!user,
  });

  const fetchDir = useCallback(async (owner: string, repo: string, path: string, branch: string) => {
    const res = await fetch(`/api/github/repos/${owner}/${repo}/tree?path=${encodeURIComponent(path)}&ref=${branch}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch directory");
    return res.json() as Promise<TreeItem[]>;
  }, []);

  const loadDir = useCallback(async (path: string) => {
    if (!selectedRepo || !user) return;
    try {
      const items = await fetchDir(user.login, selectedRepo.name, path, selectedRepo.default_branch);
      setDirContents(prev => ({ ...prev, [path]: items }));
    } catch (error: any) {
      toast({ title: "Failed to load directory", description: error.message, variant: "destructive" });
    }
  }, [selectedRepo, user, fetchDir, toast]);

  useEffect(() => {
    if (selectedRepo && user) {
      loadDir("");
    }
  }, [selectedRepo, user, loadDir]);

  const toggleDir = async (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      if (!dirContents[path]) {
        await loadDir(path);
      }
    }
    setExpandedDirs(newExpanded);
  };

  const openFile = async (item: TreeItem) => {
    const existing = openFiles.find(f => f.path === item.path);
    if (existing) {
      setActiveFile(item.path);
      return;
    }

    if (!selectedRepo || !user) return;

    try {
      const res = await fetch(
        `/api/github/repos/${user.login}/${selectedRepo.name}/file?path=${encodeURIComponent(item.path)}&ref=${selectedRepo.default_branch}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch file");
      const data: FileData = await res.json();

      setOpenFiles(prev => [...prev, {
        path: data.path,
        name: data.name,
        content: data.content,
        originalContent: data.content,
        sha: data.sha,
        modified: false,
      }]);
      setActiveFile(data.path);
    } catch (error: any) {
      toast({ title: "Failed to open file", description: error.message, variant: "destructive" });
    }
  };

  const closeFile = (path: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (activeFile === path) {
      const remaining = openFiles.filter(f => f.path !== path);
      setActiveFile(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const updateFileContent = (path: string, content: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.path === path
        ? { ...f, content, modified: content !== f.originalContent }
        : f
    ));
  };

  const saveFile = useMutation({
    mutationFn: async (file: OpenFile) => {
      if (!selectedRepo || !user) throw new Error("No repo selected");
      const res = await apiRequest("PUT", `/api/github/repos/${user.login}/${selectedRepo.name}/file`, {
        path: file.path,
        content: file.content,
        sha: file.sha,
        message: `Update ${file.path} via JARVIS`,
        branch: selectedRepo.default_branch,
      });
      return res.json();
    },
    onSuccess: (data, file) => {
      setOpenFiles(prev => prev.map(f =>
        f.path === file.path
          ? { ...f, sha: data.sha, originalContent: f.content, modified: false }
          : f
      ));
      toast({ title: "File saved", description: `${file.path} committed to ${selectedRepo?.default_branch}` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const createFile = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      if (!selectedRepo || !user) throw new Error("No repo selected");
      const res = await apiRequest("PUT", `/api/github/repos/${user.login}/${selectedRepo.name}/file`, {
        path,
        content,
        message: `Create ${path} via JARVIS`,
        branch: selectedRepo.default_branch,
      });
      return res.json();
    },
    onSuccess: (data, { path }) => {
      const name = path.split("/").pop() || path;
      setOpenFiles(prev => [...prev, {
        path,
        name,
        content: "",
        originalContent: "",
        sha: data.sha,
        modified: false,
      }]);
      setActiveFile(path);
      setNewFileDialog(false);
      setNewFileName("");
      const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
      loadDir(dir);
      toast({ title: "File created", description: `${path} created in repository` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create file", description: error.message, variant: "destructive" });
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (file: OpenFile) => {
      if (!selectedRepo || !user) throw new Error("No repo selected");
      const res = await apiRequest("DELETE", `/api/github/repos/${user.login}/${selectedRepo.name}/file`, {
        path: file.path,
        sha: file.sha,
        message: `Delete ${file.path} via JARVIS`,
        branch: selectedRepo.default_branch,
      });
      return res.json();
    },
    onSuccess: (_, file) => {
      closeFile(file.path);
      const dir = file.path.includes("/") ? file.path.substring(0, file.path.lastIndexOf("/")) : "";
      loadDir(dir);
      setDeleteDialog(null);
      toast({ title: "File deleted", description: `${file.path} removed from repository` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete file", description: error.message, variant: "destructive" });
    },
  });

  const activeFileData = openFiles.find(f => f.path === activeFile);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (activeFileData?.modified) {
        saveFile.mutate(activeFileData);
      }
    }
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTree = (path: string, depth: number = 0): JSX.Element[] => {
    const items = dirContents[path] || [];
    const elements: JSX.Element[] = [];

    for (const item of items) {
      const isDir = item.type === "dir";
      const isExpanded = expandedDirs.has(item.path);

      elements.push(
        <div
          key={item.path}
          className={`flex items-center gap-1.5 py-1 px-2 text-xs cursor-pointer hover:bg-muted/50 rounded-sm transition-colors ${activeFile === item.path ? "bg-primary/10 text-primary" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => isDir ? toggleDir(item.path) : openFile(item)}
          data-testid={`tree-item-${item.path}`}
        >
          {isDir ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
          {isDir ? (
            <Folder className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
          ) : (
            <FileText className={`w-3.5 h-3.5 shrink-0 ${getFileColor(item.name)}`} />
          )}
          <span className="truncate">{item.name}</span>
        </div>
      );

      if (isDir && isExpanded) {
        if (dirContents[item.path]) {
          elements.push(...renderTree(item.path, depth + 1));
        } else {
          elements.push(
            <div key={`loading-${item.path}`} className="py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            </div>
          );
        }
      }
    }

    return elements;
  };

  if (!selectedRepo) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-editor-title">
              <Code2 className="w-5 h-5 text-primary" />
              Code Editor
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Select a repository to browse and edit files.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setLocation("/github")} data-testid="button-back-github">
            <GitBranch className="w-3 h-3" />
            GitHub
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-repos-editor"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {reposLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderGit2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No repositories found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {filteredRepos.map((repo) => (
              <Card
                key={repo.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => {
                  setSelectedRepo(repo);
                  setDirContents({});
                  setExpandedDirs(new Set([""]));
                  setOpenFiles([]);
                  setActiveFile(null);
                }}
                data-testid={`card-editor-repo-${repo.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Code2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{repo.name}</h3>
                      {repo.language && (
                        <Badge variant="outline" className="text-[10px] h-5">{repo.language}</Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-2 px-3 h-10 shrink-0 border-b border-border/30 bg-muted/20">
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7"
          onClick={() => {
            setSelectedRepo(null);
            setOpenFiles([]);
            setActiveFile(null);
            setDirContents({});
          }}
          data-testid="button-back-repos"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold">{selectedRepo.name}</span>
          <Badge variant="outline" className="text-[10px] h-4 ml-1">{selectedRepo.default_branch}</Badge>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => {
            setNewFileDir(currentPath.join("/"));
            setNewFileDialog(true);
          }}
          data-testid="button-new-file"
        >
          <FilePlus className="w-3 h-3" />
          New File
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => {
            loadDir("");
            setExpandedDirs(new Set([""]));
          }}
          data-testid="button-refresh-tree"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
        {activeFileData?.modified && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => saveFile.mutate(activeFileData)}
            disabled={saveFile.isPending}
            data-testid="button-save-file"
          >
            {saveFile.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-56 shrink-0 border-r border-border/30 bg-muted/10 flex flex-col">
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Explorer
          </div>
          <ScrollArea className="flex-1">
            <div className="pb-4">
              {!dirContents[""] ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderTree("")
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {openFiles.length > 0 && (
            <div className="flex items-center gap-0 border-b border-border/30 bg-muted/10 overflow-x-auto">
              {openFiles.map(file => (
                <div
                  key={file.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border/20 shrink-0 transition-colors ${activeFile === file.path ? "bg-background border-b-2 border-b-primary" : "hover:bg-muted/30 text-muted-foreground"}`}
                  onClick={() => setActiveFile(file.path)}
                  data-testid={`tab-file-${file.path}`}
                >
                  <FileText className={`w-3 h-3 ${getFileColor(file.name)}`} />
                  <span>{file.name}</span>
                  {file.modified && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  <button
                    className="ml-1 p-0.5 rounded hover:bg-muted/50"
                    onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                    data-testid={`button-close-tab-${file.path}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeFileData ? (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex items-center justify-between px-3 py-1 bg-muted/10 border-b border-border/20">
                <span className="text-[11px] text-muted-foreground font-mono">{activeFileData.path}</span>
                <div className="flex items-center gap-1">
                  {(activeFileData.name.endsWith(".html") || activeFileData.name.endsWith(".htm")) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => setPreviewHtml(activeFileData.content)}
                      data-testid="button-preview-html"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog(activeFileData)}
                    data-testid="button-delete-file"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Badge variant="outline" className="text-[10px] h-5">{getLanguage(activeFileData.name)}</Badge>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <textarea
                  className="absolute inset-0 w-full h-full px-4 py-3 bg-background text-sm font-mono resize-none focus:outline-none leading-6 tab-size-2"
                  value={activeFileData.content}
                  onChange={(e) => updateFileContent(activeFileData.path, e.target.value)}
                  spellCheck={false}
                  data-testid="textarea-editor"
                  style={{ tabSize: 2 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
              <Code2 className="w-12 h-12" />
              <p className="text-sm">Select a file to start editing</p>
              <p className="text-xs">Ctrl+S to save changes</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FilePlus className="w-4 h-4 text-primary" />
              Create New File
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the file path relative to the repository root.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              data-testid="input-new-file-name"
              placeholder="src/index.html"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="text-sm font-mono"
            />
            <Button
              data-testid="button-submit-new-file"
              className="w-full gap-2 text-xs"
              disabled={!newFileName.trim() || createFile.isPending}
              onClick={() => {
                const path = newFileDir ? `${newFileDir}/${newFileName}` : newFileName;
                createFile.mutate({ path, content: "" });
              }}
            >
              {createFile.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Create File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete File
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete this file from the repository.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm font-mono bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
              {deleteDialog?.path}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setDeleteDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2 text-xs"
                disabled={deleteFile.isPending}
                onClick={() => deleteDialog && deleteFile.mutate(deleteDialog)}
                data-testid="button-confirm-delete"
              >
                {deleteFile.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {previewHtml !== null && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
              <span className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                HTML Preview
              </span>
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setPreviewHtml(null)} data-testid="button-close-preview">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 w-full bg-white rounded-b-xl"
              sandbox="allow-scripts allow-same-origin"
              title="HTML Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
