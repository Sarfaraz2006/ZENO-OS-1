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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Plus,
  Trash2,
  Star,
  StarOff,
  Search,
  Cpu,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiModel } from "@shared/schema";

export default function ModelsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "",
    modelId: "",
    description: "",
    category: "general",
    contextWindow: 8192,
    inputCost: "0",
    outputCost: "0",
  });

  const { data: models = [], isLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  const addModel = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/models", newModel);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      setDialogOpen(false);
      setNewModel({ name: "", modelId: "", description: "", category: "general", contextWindow: 8192, inputCost: "0", outputCost: "0" });
      toast({ title: "Model added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add model", description: error.message, variant: "destructive" });
    },
  });

  const toggleModel = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      await apiRequest("PATCH", `/api/models/${id}`, { isEnabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/models"] }),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      await apiRequest("PATCH", `/api/models/${id}`, { isFavorite });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/models"] }),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Model removed" });
    },
  });

  const filtered = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.modelId.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || m.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(models.map((m) => m.category || "general"))];

  const getCategoryColor = (cat: string | null) => {
    switch (cat) {
      case "coding": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "reasoning": return "text-violet-400 bg-violet-500/10 border-violet-500/20";
      case "creative": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "fast": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-models-title">
            <Cpu className="w-5 h-5 text-primary" />
            AI Model Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {models.length} models configured. Add any OpenRouter model by ID.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs" data-testid="link-browse-openrouter">
              <ExternalLink className="w-3 h-3" />
              Browse OpenRouter
            </Button>
          </a>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-model" size="sm" className="gap-2 text-xs">
                <Plus className="w-3 h-3" />
                Add Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Add OpenRouter Model
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <Input
                    data-testid="input-model-name"
                    placeholder="e.g. DeepSeek V3"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">OpenRouter Model ID</label>
                  <Input
                    data-testid="input-model-id"
                    placeholder="e.g. deepseek/deepseek-v3"
                    value={newModel.modelId}
                    onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Copy the exact model ID from openrouter.ai/models
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                  <Input
                    data-testid="input-model-description"
                    placeholder="Brief description of the model"
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                    <Select value={newModel.category} onValueChange={(v) => setNewModel({ ...newModel, category: v })}>
                      <SelectTrigger data-testid="select-model-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="reasoning">Reasoning</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context Window</label>
                    <Input
                      data-testid="input-context-window"
                      type="number"
                      value={newModel.contextWindow}
                      onChange={(e) => setNewModel({ ...newModel, contextWindow: parseInt(e.target.value) || 8192 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Input $/1M tok</label>
                    <Input
                      data-testid="input-cost-input"
                      placeholder="0"
                      value={newModel.inputCost}
                      onChange={(e) => setNewModel({ ...newModel, inputCost: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output $/1M tok</label>
                    <Input
                      data-testid="input-cost-output"
                      placeholder="0"
                      value={newModel.outputCost}
                      onChange={(e) => setNewModel({ ...newModel, outputCost: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  data-testid="button-save-model"
                  onClick={() => addModel.mutate()}
                  disabled={!newModel.name || !newModel.modelId || addModel.isPending}
                  className="w-full gap-2"
                >
                  {addModel.isPending ? <><Cpu className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Model</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-models"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
              className="text-xs h-8 px-3"
              data-testid={`filter-category-${cat}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {models.length === 0 ? "No models configured" : "No models match your search"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {models.length === 0 ? "Add your first AI model to get started" : "Try a different search term"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((model) => {
            const catColors = getCategoryColor(model.category);
            return (
              <Card key={model.id} className="hover-elevate group" data-testid={`card-model-${model.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${catColors}`}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" data-testid={`text-model-name-${model.id}`}>
                          {model.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{model.modelId}</p>
                      </div>
                    </div>
                    <button
                      data-testid={`button-favorite-${model.id}`}
                      onClick={() => toggleFavorite.mutate({ id: model.id, isFavorite: !model.isFavorite })}
                      className="mt-1"
                    >
                      {model.isFavorite ? (
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      )}
                    </button>
                  </div>

                  {model.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <Badge variant="outline" className="text-[10px] gap-1 h-5 px-1.5">
                      <Layers className="w-2.5 h-2.5" />
                      {((model.contextWindow || 8192) / 1000).toFixed(0)}K
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1 h-5 px-1.5">
                      <DollarSign className="w-2.5 h-2.5" />
                      {model.inputCost === "0" && model.outputCost === "0" ? "Free" : `$${model.inputCost}`}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] gap-1 h-5 px-1.5`}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {model.category || "general"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Switch
                        data-testid={`switch-model-enabled-${model.id}`}
                        checked={model.isEnabled}
                        onCheckedChange={(checked) => toggleModel.mutate({ id: model.id, isEnabled: checked })}
                      />
                      <span className={`text-[11px] ${model.isEnabled ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {model.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-delete-model-${model.id}`}
                      onClick={() => deleteModel.mutate(model.id)}
                      className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
